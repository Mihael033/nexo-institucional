using System.Text.Json;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Nexo.Application.Auditing;
using Nexo.Application.Common;
using Nexo.Application.Products;
using Nexo.Domain.Auditing;
using Nexo.Domain.Catalog;
using Nexo.Domain.Common;
using Nexo.Domain.Imports;

namespace Nexo.Application.Imports;

public sealed record ImportCellErrorDto(string Column, string Message);

public sealed record ImportRowDataDto(
    string Name,
    string? Slug,
    string CategorySlug,
    string Brand,
    decimal? PriceBs,
    bool? IsAvailable,
    ProductCondition? Condition,
    bool IsFeatured);

public sealed record ImportRowDto(int RowNumber, string Status, string? Action, ImportRowDataDto Data, IReadOnlyList<ImportCellErrorDto> Errors);

public sealed record ImportPreviewDto(
    string ImportId,
    string FileName,
    DateTime ExpiresAt,
    int TotalRows,
    int ValidRows,
    int InvalidRows,
    int ToCreate,
    int ToUpdate,
    IReadOnlyList<ImportRowDto> Rows);

public sealed record ImportResultDto(string ImportId, int Created, int Updated, int Skipped);

public sealed record CsvFile(string FileName, string Content);

public sealed record GetImportTemplateQuery : IRequest<CsvFile>;

public sealed record ValidateImportCommand(string FileName, byte[] Content) : IRequest<ImportPreviewDto>;

public sealed record GetImportErrorsQuery(string ImportId) : IRequest<CsvFile>;

public sealed record ConfirmImportCommand(string ImportId) : IRequest<ImportResultDto>;

public sealed class ValidateImportCommandValidator : AbstractValidator<ValidateImportCommand>
{
    public const int MaxBytes = 2 * 1024 * 1024;

    public ValidateImportCommandValidator()
    {
        RuleFor(x => x.FileName).Must(n => n.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
            .WithMessage("Solo se admiten archivos .csv.");
        RuleFor(x => x.Content).Must(c => c.Length > 0).WithMessage("El archivo está vacío.")
            .Must(c => c.Length <= MaxBytes).WithMessage("El archivo supera el tamaño máximo de 2 MB.");
    }
}

internal static class ImportColumns
{
    public const string Name = "nombre";
    public const string Slug = "slug";
    public const string Category = "categoria";
    public const string Brand = "marca";
    public const string Price = "precio_bs";
    public const string Available = "disponible";
    public const string Condition = "estado";
    public const string Featured = "destacado";
    public const string Description = "descripcion";
    public const string Images = "imagenes";
    public const string Warranty = "garantia_meses";
    public const string Location = "ubicacion";

    public static readonly string[] Required = [Name, Category, Brand, Price, Available, Condition, Description, Images];

    public static readonly string[] All = [Name, Slug, Category, Brand, Price, Available, Condition, Featured, Description, Images, Warranty, Location];

    /// <summary>Maps CSV columns that hold dynamic attributes to attribute keys.</summary>
    public static readonly IReadOnlyDictionary<string, string> AttributeColumns = new Dictionary<string, string>
    {
        [Warranty] = "garantiaMeses",
        [Location] = "ubicacion",
    };

    /// <summary>Maps validator property names back to CSV columns for error reports.</summary>
    public static string FromProperty(string property) => property switch
    {
        nameof(ProductUpsertRequest.Name) => Name,
        nameof(ProductUpsertRequest.Slug) => Slug,
        nameof(ProductUpsertRequest.CategoryId) => Category,
        nameof(ProductUpsertRequest.Brand) => Brand,
        nameof(ProductUpsertRequest.PriceBs) => Price,
        nameof(ProductUpsertRequest.Condition) => Condition,
        nameof(ProductUpsertRequest.Description) => Description,
        _ when property.StartsWith(nameof(ProductUpsertRequest.Images), StringComparison.Ordinal) => Images,
        _ when property.StartsWith(nameof(ProductUpsertRequest.Attributes), StringComparison.Ordinal) => "atributos",
        _ => property,
    };

    public static string NormalizeHeader(string header) =>
        TextNormalizer.ForSearch(header.Replace("*", string.Empty, StringComparison.Ordinal)).Trim().Replace(' ', '_');
}

/// <param name="ManagedAttributeKeys">Attribute keys whose columns exist in the file; others are kept on update.</param>
/// <param name="FeaturedProvided">False when the file has no "destacado" column (keep the current value on update).</param>
internal sealed record StoredImportRow(int RowNumber, ProductUpsertRequest Request, IReadOnlyList<string> ManagedAttributeKeys, bool FeaturedProvided);

internal sealed record StoredImportError(int RowNumber, string Column, string Message);

internal sealed class ProductImportHandlers(IAppDbContext db, TimeProvider clock, ICurrentUser currentUser) :
    IRequestHandler<GetImportTemplateQuery, CsvFile>,
    IRequestHandler<ValidateImportCommand, ImportPreviewDto>,
    IRequestHandler<GetImportErrorsQuery, CsvFile>,
    IRequestHandler<ConfirmImportCommand, ImportResultDto>
{
    public const int MaxRows = 1000;

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static readonly ProductUpsertRequestValidator RowValidator = new();

    public Task<CsvFile> Handle(GetImportTemplateQuery request, CancellationToken cancellationToken)
    {
        string[] header = ["nombre*", "slug", "categoria*", "marca*", "precio_bs*", "disponible*", "estado*", "destacado", "descripcion*", "imagenes*", "garantia_meses", "ubicacion"];
        string[] example1 = ["Taladro percutor 800 W", "", "herramientas", "Andes", "1.250,50", "si", "Nuevo", "no", "Taladro percutor para mantenimiento institucional, con maletín y garantía local.", "https://picsum.photos/seed/taladro-1/800/600|https://picsum.photos/seed/taladro-2/800/600", "12", "Cochabamba"];
        string[] example2 = ["Escritorio ejecutivo en L", "escritorio-ejecutivo-l", "mobiliario-de-oficina", "Illimani", "2890.00", "si", "Usado", "si", "Escritorio en L de melamina, ideal para oficinas de dirección.", "https://picsum.photos/seed/escritorio-1/800/600", "6", "La Paz"];
        return Task.FromResult(new CsvFile("plantilla-productos.csv", Csv.Write([header, example1, example2])));
    }

    public async Task<ImportPreviewDto> Handle(ValidateImportCommand request, CancellationToken cancellationToken)
    {
        var userId = currentUser.UserId ?? throw new ForbiddenException();
        var text = Csv.Decode(request.Content);
        var records = Csv.Parse(text, Csv.DetectDelimiter(text));
        if (records.Count == 0)
        {
            throw new BadRequestException("El archivo está vacío.");
        }

        var header = records[0].Fields.Select(ImportColumns.NormalizeHeader).ToList();
        var missing = ImportColumns.Required.Where(c => !header.Contains(c)).ToList();
        if (missing.Count > 0)
        {
            throw new BadRequestException($"Faltan columnas obligatorias: {string.Join(", ", missing)}. Descargue la plantilla para ver el formato.");
        }

        var dataRows = records.Skip(1).ToList();
        if (dataRows.Count == 0)
        {
            throw new BadRequestException("El archivo no tiene filas de datos.");
        }

        if (dataRows.Count > MaxRows)
        {
            throw new BadRequestException($"El archivo tiene {dataRows.Count} filas; el máximo es {MaxRows}.");
        }

        var columnIndex = header.Select((name, index) => (name, index))
            .GroupBy(x => x.name, StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.First().index, StringComparer.Ordinal);
        var categories = await db.Categories.AsNoTracking()
            .ToDictionaryAsync(c => c.Slug, c => c.Id, StringComparer.Ordinal, cancellationToken).ConfigureAwait(false);
        var existing = await db.Products.AsNoTracking()
            .Select(p => new { p.Slug, p.IsDeleted })
            .ToDictionaryAsync(p => p.Slug, p => p.IsDeleted, StringComparer.Ordinal, cancellationToken).ConfigureAwait(false);

        var managedAttributeKeys = ImportColumns.AttributeColumns.Where(a => columnIndex.ContainsKey(a.Key)).Select(a => a.Value).ToList();
        var featuredProvided = columnIndex.ContainsKey(ImportColumns.Featured);
        var seenSlugs = new Dictionary<string, int>(StringComparer.Ordinal);
        var rows = new List<ImportRowDto>();
        var valid = new List<StoredImportRow>();
        var errors = new List<StoredImportError>();

        foreach (var record in dataRows)
        {
            string Cell(string column) =>
                columnIndex.TryGetValue(column, out var index) && index < record.Fields.Count ? record.Fields[index].Trim() : string.Empty;

            var rowErrors = new List<ImportCellErrorDto>();
            var categorySlug = Cell(ImportColumns.Category).ToLowerInvariant();
            var price = CsvValues.ParsePrice(Cell(ImportColumns.Price));
            var available = CsvValues.ParseBool(Cell(ImportColumns.Available));
            var featuredRaw = Cell(ImportColumns.Featured);
            var featured = featuredRaw.Length == 0 ? false : CsvValues.ParseBool(featuredRaw);
            var condition = TextNormalizer.ForSearch(Cell(ImportColumns.Condition)) switch
            {
                "nuevo" or "new" => ProductCondition.New,
                "usado" or "used" => (ProductCondition?)ProductCondition.Used,
                _ => null,
            };

            if (categorySlug.Length == 0)
            {
                rowErrors.Add(new(ImportColumns.Category, "La categoría es obligatoria."));
            }
            else if (!categories.ContainsKey(categorySlug))
            {
                rowErrors.Add(new(ImportColumns.Category, $"La categoría '{categorySlug}' no existe."));
            }

            if (price is null)
            {
                rowErrors.Add(new(ImportColumns.Price, "El precio es obligatorio y debe ser un número (ej.: 1250,50)."));
            }

            if (available is null)
            {
                rowErrors.Add(new(ImportColumns.Available, "Indique 'si' o 'no'."));
            }

            if (featured is null)
            {
                rowErrors.Add(new(ImportColumns.Featured, "Indique 'si' o 'no'."));
            }

            if (condition is null)
            {
                rowErrors.Add(new(ImportColumns.Condition, "El estado debe ser 'Nuevo' o 'Usado'."));
            }

            var attributes = ImportColumns.AttributeColumns
                .Select(a => (a.Value, Cell(a.Key)))
                .Where(a => a.Item2.Length > 0)
                .ToDictionary(a => a.Value, a => a.Item2, StringComparer.Ordinal);
            var upsert = new ProductUpsertRequest
            {
                Name = Cell(ImportColumns.Name),
                Slug = Cell(ImportColumns.Slug) is { Length: > 0 } s ? s : null,
                CategoryId = categories.GetValueOrDefault(categorySlug, 1),
                Brand = Cell(ImportColumns.Brand),
                PriceBs = price ?? 0,
                IsAvailable = available ?? false,
                Condition = condition ?? ProductCondition.New,
                IsFeatured = featured ?? false,
                Description = Cell(ImportColumns.Description),
                Images = Cell(ImportColumns.Images).Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
                Attributes = attributes,
            };

            var validation = await RowValidator.ValidateAsync(upsert, cancellationToken).ConfigureAwait(false);
            foreach (var failure in validation.Errors)
            {
                var column = ImportColumns.FromProperty(failure.PropertyName);
                if (column == ImportColumns.Price && price is null)
                {
                    continue;
                }

                rowErrors.Add(new(column, failure.ErrorMessage));
            }

            var slug = upsert.ResolveSlug();
            string? action = null;
            if (slug.Length > 0 && TextNormalizer.IsValidSlug(slug))
            {
                if (seenSlugs.TryGetValue(slug, out var firstRow))
                {
                    rowErrors.Add(new(ImportColumns.Slug, $"Slug «{slug}» repetido en el archivo (fila {firstRow})."));
                }
                else
                {
                    seenSlugs[slug] = record.LineNumber;
                }

                if (existing.TryGetValue(slug, out var isDeleted))
                {
                    if (isDeleted)
                    {
                        rowErrors.Add(new(ImportColumns.Slug, $"El slug «{slug}» pertenece a un producto eliminado; restáurelo antes de importarlo."));
                    }

                    action = "update";
                }
                else
                {
                    action = "create";
                }
            }

            if (action is null && rowErrors.Count == 0)
            {
                rowErrors.Add(new(ImportColumns.Slug, "No se pudo generar un slug válido; indique uno con letras minúsculas, números y guiones."));
            }

            var data = new ImportRowDataDto(upsert.Name, slug.Length > 0 ? slug : null, categorySlug, upsert.Brand, price, available, condition, featured ?? false);
            if (rowErrors.Count == 0)
            {
                valid.Add(new StoredImportRow(record.LineNumber, upsert with { Slug = slug }, managedAttributeKeys, featuredProvided));
                rows.Add(new ImportRowDto(record.LineNumber, "valid", action, data, []));
            }
            else
            {
                errors.AddRange(rowErrors.Select(e => new StoredImportError(record.LineNumber, e.Column, e.Message)));
                rows.Add(new ImportRowDto(record.LineNumber, "invalid", null, data, rowErrors));
            }
        }

        var fileName = Path.GetFileName(request.FileName);
        if (fileName.Length > 200)
        {
            fileName = fileName[^200..];
        }

        var batch = new ImportBatch(
            Guid.NewGuid().ToString("N"),
            userId,
            fileName,
            rows.Count,
            valid.Count,
            JsonSerializer.Serialize(valid, Json),
            JsonSerializer.Serialize(errors, Json),
            clock.UtcNow());
        db.ImportBatches.Add(batch);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        var validRows = rows.Where(r => r.Status == "valid").ToList();
        return new ImportPreviewDto(
            batch.Id,
            batch.FileName,
            batch.ExpiresAt,
            rows.Count,
            validRows.Count,
            rows.Count - validRows.Count,
            validRows.Count(r => r.Action == "create"),
            validRows.Count(r => r.Action == "update"),
            rows);
    }

    public async Task<CsvFile> Handle(GetImportErrorsQuery request, CancellationToken cancellationToken)
    {
        var batch = await LoadOwnBatch(request.ImportId, cancellationToken).ConfigureAwait(false);
        var errors = JsonSerializer.Deserialize<List<StoredImportError>>(batch.ErrorsJson, Json) ?? [];
        IEnumerable<IReadOnlyList<string>> lines =
        [
            ["fila", "columna", "error"],
            .. errors.Select(e => (IReadOnlyList<string>)[e.RowNumber.ToString(System.Globalization.CultureInfo.InvariantCulture), e.Column, e.Message]),
        ];
        return new CsvFile($"errores-{Path.GetFileNameWithoutExtension(batch.FileName)}.csv", Csv.Write(lines));
    }

    public async Task<ImportResultDto> Handle(ConfirmImportCommand request, CancellationToken cancellationToken)
    {
        var batch = await db.ImportBatches.FirstOrDefaultAsync(b => b.Id == request.ImportId, cancellationToken).ConfigureAwait(false)
            ?? throw new NotFoundException("El lote de importación no existe.");
        if (batch.UserId != currentUser.UserId)
        {
            throw new ForbiddenException("El lote de importación pertenece a otro usuario.");
        }

        var now = clock.UtcNow();
        if (!batch.CanConfirm(now))
        {
            throw new GoneException("import.expired", "El lote de importación expiró o ya fue confirmado. Valide el archivo nuevamente.");
        }

        var rows = JsonSerializer.Deserialize<List<StoredImportRow>>(batch.ValidRowsJson, Json) ?? [];
        var slugs = rows.Select(r => r.Request.Slug!).ToList();
        var categoryIds = await db.Categories.Select(c => c.Id).ToListAsync(cancellationToken).ConfigureAwait(false);
        var existing = await db.Products
            .Include(p => p.Images)
            .Include(p => p.Attributes)
            .Where(p => slugs.Contains(p.Slug))
            .ToDictionaryAsync(p => p.Slug, StringComparer.Ordinal, cancellationToken)
            .ConfigureAwait(false);

        int created = 0, updated = 0, skipped = 0;
        foreach (var row in rows)
        {
            var data = row.Request.ToData();
            existing.TryGetValue(data.Slug, out var product);
            if (product is not null)
            {
                // Columns missing from the file must not wipe existing values.
                var attributes = product.Attributes
                    .Where(a => !row.ManagedAttributeKeys.Contains(a.Key))
                    .ToDictionary(a => a.Key, a => a.Value, StringComparer.Ordinal);
                foreach (var (key, value) in data.Attributes)
                {
                    attributes[key] = value;
                }

                data = data with { Attributes = attributes, IsFeatured = row.FeaturedProvided ? data.IsFeatured : product.IsFeatured };
            }

            if (!categoryIds.Contains(data.CategoryId))
            {
                skipped++;
                continue;
            }

            if (product is not null)
            {
                if (product.IsDeleted)
                {
                    skipped++;
                    continue;
                }

                product.Update(data, now);
                updated++;
            }
            else
            {
                db.Products.Add(new Product(data, now));
                created++;
            }
        }

        var invalid = batch.TotalRows - batch.ValidRows;
        skipped += invalid;
        batch.MarkConfirmed(now);
        db.Record(
            clock,
            currentUser.ToActor(),
            AuditAction.Import,
            AuditText.ImportBatch,
            batch.Id,
            $"Importó productos desde «{batch.FileName}»: {created} creados, {updated} actualizados, {skipped} omitidos",
            after: new { fileName = batch.FileName, totalRows = batch.TotalRows, created, updated, skipped });
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new ImportResultDto(batch.Id, created, updated, skipped);
    }

    private async Task<ImportBatch> LoadOwnBatch(string importId, CancellationToken cancellationToken)
    {
        var batch = await db.ImportBatches.AsNoTracking().FirstOrDefaultAsync(b => b.Id == importId, cancellationToken).ConfigureAwait(false)
            ?? throw new NotFoundException("El lote de importación no existe.");
        if (batch.UserId != currentUser.UserId)
        {
            throw new ForbiddenException("El lote de importación pertenece a otro usuario.");
        }

        if (batch.ExpiresAt <= clock.UtcNow())
        {
            throw new GoneException("import.expired", "El lote de importación expiró. Valide el archivo nuevamente.");
        }

        return batch;
    }
}
