using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Nexo.Application.Common;
using Nexo.Domain.Catalog;
using Nexo.Domain.Common;

namespace Nexo.Application.Products;

/// <summary>Body of POST/PUT /admin/products (PUT is a full replacement).</summary>
public sealed record ProductUpsertRequest
{
    public string Name { get; init; } = string.Empty;

    /// <summary>Optional; generated from the name when empty.</summary>
    public string? Slug { get; init; }

    public int CategoryId { get; init; }

    public string Brand { get; init; } = string.Empty;

    public decimal PriceBs { get; init; }

    public bool IsAvailable { get; init; }

    public ProductCondition Condition { get; init; } = ProductCondition.New;

    public bool IsFeatured { get; init; }

    public string Description { get; init; } = string.Empty;

    public IReadOnlyList<string> Images { get; init; } = [];

    public IReadOnlyDictionary<string, string> Attributes { get; init; } = new Dictionary<string, string>();

    public string ResolveSlug() => string.IsNullOrWhiteSpace(Slug) ? TextNormalizer.Slugify(Name) : Slug.Trim();

    internal ProductData ToData() =>
        new(Name, ResolveSlug(), CategoryId, Brand, PriceBs, IsAvailable, Condition, IsFeatured, Description, Images, Attributes);
}

public sealed class ProductUpsertRequestValidator : AbstractValidator<ProductUpsertRequest>
{
    public const decimal MaxPrice = 100_000_000m;

    public ProductUpsertRequestValidator()
    {
        RuleFor(x => x.Name).Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("El nombre es obligatorio.")
            .Length(3, 150).WithMessage("El nombre debe tener entre 3 y 150 caracteres.")
            .Must((request, name) => !string.IsNullOrWhiteSpace(request.Slug) || TextNormalizer.Slugify(name).Length > 0)
            .WithMessage("El nombre debe contener letras o números (se usa para generar el slug).");
        RuleFor(x => x.Slug)
            .Must(slug => string.IsNullOrWhiteSpace(slug) || (slug.Length <= 160 && TextNormalizer.IsValidSlug(slug.Trim())))
            .WithMessage("El slug solo admite letras minúsculas, números y guiones (máximo 160).");
        RuleFor(x => x.CategoryId).GreaterThan(0).WithMessage("Seleccione una categoría.");
        RuleFor(x => x.Brand).Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("La marca es obligatoria.")
            .MaximumLength(80).WithMessage("La marca admite como máximo 80 caracteres.");
        RuleFor(x => x.PriceBs).InclusiveBetween(0, MaxPrice).WithMessage("El precio debe estar entre Bs 0 y Bs 100.000.000.")
            .Must(p => decimal.Round(p, 2) == p).WithMessage("El precio admite como máximo 2 decimales.");
        RuleFor(x => x.Condition).IsInEnum().WithMessage("El estado debe ser nuevo o usado.");
        RuleFor(x => x.Description).Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("La descripción es obligatoria.")
            .Length(10, 4000).WithMessage("La descripción debe tener entre 10 y 4000 caracteres.");
        RuleFor(x => x.Images).NotNull().Must(i => i.Count is >= 1 and <= 10)
            .WithMessage("Agregue entre 1 y 10 imágenes.");
        RuleForEach(x => x.Images).Must(IsHttpUrl).WithMessage("Cada imagen debe ser una URL http(s) válida.");
        RuleFor(x => x.Attributes).NotNull().Must(a => a.Count <= 20).WithMessage("Se admiten como máximo 20 atributos.");
        RuleForEach(x => x.Attributes)
            .Must(a => a.Key.Length is >= 1 and <= 40 && a.Key.All(char.IsAsciiLetterOrDigit))
            .WithMessage("Las claves de atributo solo admiten letras y números (máximo 40).")
            .Must(a => (a.Value ?? string.Empty).Length <= 100)
            .WithMessage("Los valores de atributo admiten como máximo 100 caracteres.");
    }

    private static bool IsHttpUrl(string value) =>
        value.Length <= 500
        && Uri.TryCreate(value, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp);
}

public sealed record CreateProductCommand(ProductUpsertRequest Body) : IRequest<AdminProductDetailDto>;

public sealed record UpdateProductCommand(int Id, ProductUpsertRequest Body) : IRequest<AdminProductDetailDto>;

public sealed record DeleteProductCommand(int Id) : IRequest<Unit>;

public sealed record RestoreProductCommand(int Id) : IRequest<AdminProductDetailDto>;

public sealed class CreateProductCommandValidator : AbstractValidator<CreateProductCommand>
{
    public CreateProductCommandValidator() => RuleFor(x => x.Body).NotNull().SetValidator(new ProductUpsertRequestValidator());
}

public sealed class UpdateProductCommandValidator : AbstractValidator<UpdateProductCommand>
{
    public UpdateProductCommandValidator() => RuleFor(x => x.Body).NotNull().SetValidator(new ProductUpsertRequestValidator());
}

internal sealed class ProductWriteHandlers(IAppDbContext db, TimeProvider clock, ProductReader reader) :
    IRequestHandler<CreateProductCommand, AdminProductDetailDto>,
    IRequestHandler<UpdateProductCommand, AdminProductDetailDto>,
    IRequestHandler<DeleteProductCommand, Unit>,
    IRequestHandler<RestoreProductCommand, AdminProductDetailDto>
{
    public async Task<AdminProductDetailDto> Handle(CreateProductCommand request, CancellationToken cancellationToken)
    {
        var data = request.Body.ToData();
        await EnsureCategoryExists(data.CategoryId, cancellationToken).ConfigureAwait(false);
        await EnsureSlugIsFree(data.Slug, null, cancellationToken).ConfigureAwait(false);

        var product = new Product(data, clock.UtcNow());
        db.Products.Add(product);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return await reader.GetAdminDetail(product.Id, cancellationToken).ConfigureAwait(false);
    }

    public async Task<AdminProductDetailDto> Handle(UpdateProductCommand request, CancellationToken cancellationToken)
    {
        var product = await LoadAggregate(request.Id, cancellationToken).ConfigureAwait(false);
        var data = request.Body.ToData();
        await EnsureCategoryExists(data.CategoryId, cancellationToken).ConfigureAwait(false);
        await EnsureSlugIsFree(data.Slug, product.Id, cancellationToken).ConfigureAwait(false);

        product.Update(data, clock.UtcNow());
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return await reader.GetAdminDetail(product.Id, cancellationToken).ConfigureAwait(false);
    }

    public async Task<Unit> Handle(DeleteProductCommand request, CancellationToken cancellationToken)
    {
        var product = await LoadAggregate(request.Id, cancellationToken).ConfigureAwait(false);
        product.Delete(clock.UtcNow());
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return Unit.Value;
    }

    public async Task<AdminProductDetailDto> Handle(RestoreProductCommand request, CancellationToken cancellationToken)
    {
        var product = await LoadAggregate(request.Id, cancellationToken).ConfigureAwait(false);
        product.Restore(clock.UtcNow());
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return await reader.GetAdminDetail(product.Id, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Loads the product with its children so the audit trail can snapshot the whole aggregate.</summary>
    private async Task<Product> LoadAggregate(int id, CancellationToken cancellationToken) =>
        await db.Products
            .Include(p => p.Images)
            .Include(p => p.Attributes)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken)
            .ConfigureAwait(false)
        ?? throw new NotFoundException("El producto no existe.");

    private async Task EnsureCategoryExists(int categoryId, CancellationToken cancellationToken)
    {
        if (!await db.Categories.AnyAsync(c => c.Id == categoryId, cancellationToken).ConfigureAwait(false))
        {
            throw new FluentValidation.ValidationException([new FluentValidation.Results.ValidationFailure("categoryId", "La categoría seleccionada no existe.")]);
        }
    }

    private async Task EnsureSlugIsFree(string slug, int? exceptId, CancellationToken cancellationToken)
    {
        if (await db.Products.AnyAsync(p => p.Slug == slug && p.Id != exceptId, cancellationToken).ConfigureAwait(false))
        {
            throw new ConflictException($"Ya existe un producto con el slug «{slug}».");
        }
    }
}
