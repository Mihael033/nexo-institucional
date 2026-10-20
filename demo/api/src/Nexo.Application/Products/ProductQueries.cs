using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Nexo.Application.Common;
using Nexo.Domain.Catalog;

namespace Nexo.Application.Products;

public sealed record ListProductsQuery : ProductFilter, IRequest<PagedResult<ProductSummaryDto>>;

public sealed record AdminListProductsQuery : ProductFilter, IRequest<PagedResult<AdminProductDto>>
{
    /// <summary>active (default) | deleted | all.</summary>
    public string? Status { get; init; }
}

public sealed record GetProductFacetsQuery : IRequest<ProductFacetsDto>;

public sealed record GetProductBySlugQuery(string Slug) : IRequest<ProductDetailDto>;

public sealed record AdminGetProductQuery(int Id) : IRequest<AdminProductDetailDto>;

public sealed class ListProductsQueryValidator : AbstractValidator<ListProductsQuery>
{
    public ListProductsQueryValidator() => Include(new ProductFilterValidator(ProductSorts.Public));
}

public sealed class AdminListProductsQueryValidator : AbstractValidator<AdminListProductsQuery>
{
    public AdminListProductsQueryValidator()
    {
        Include(new ProductFilterValidator(ProductSorts.Admin));
        RuleFor(x => x.Status).MustBeOneOf("active", "deleted", "all");
    }
}

internal sealed class ProductQueryHandlers(IAppDbContext db, ProductReader reader) :
    IRequestHandler<ListProductsQuery, PagedResult<ProductSummaryDto>>,
    IRequestHandler<AdminListProductsQuery, PagedResult<AdminProductDto>>,
    IRequestHandler<GetProductFacetsQuery, ProductFacetsDto>,
    IRequestHandler<GetProductBySlugQuery, ProductDetailDto>,
    IRequestHandler<AdminGetProductQuery, AdminProductDetailDto>
{
    public async Task<PagedResult<ProductSummaryDto>> Handle(ListProductsQuery request, CancellationToken cancellationToken)
    {
        var page = await db.Products.AsNoTracking()
            .Where(p => !p.IsDeleted)
            .ApplyFilter(request)
            .ApplySort(request)
            .Select(ProductReader.RowProjection)
            .ToPagedAsync(request, cancellationToken)
            .ConfigureAwait(false);
        return page.Map(ProductReader.ToSummary);
    }

    public async Task<PagedResult<AdminProductDto>> Handle(AdminListProductsQuery request, CancellationToken cancellationToken)
    {
        var query = db.Products.AsNoTracking();
        query = request.Status switch
        {
            "deleted" => query.Where(p => p.IsDeleted),
            "all" => query,
            _ => query.Where(p => !p.IsDeleted),
        };

        var page = await query
            .ApplyFilter(request)
            .ApplySort(request)
            .Select(ProductReader.RowProjection)
            .ToPagedAsync(request, cancellationToken)
            .ConfigureAwait(false);
        return page.Map(ProductReader.ToAdmin);
    }

    public async Task<ProductFacetsDto> Handle(GetProductFacetsQuery request, CancellationToken cancellationToken)
    {
        var active = db.Products.AsNoTracking().Where(p => !p.IsDeleted);

        var categories = await db.Categories.AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new CategoryFacetDto(c.Slug, c.Name, active.Count(p => p.CategoryId == c.Id)))
            .ToListAsync(cancellationToken).ConfigureAwait(false);

        var brands = await active.GroupBy(p => p.Brand)
            .Select(g => new FacetValueDto(g.Key, g.Count()))
            .ToListAsync(cancellationToken).ConfigureAwait(false);

        var conditions = await active.GroupBy(p => p.Condition)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken).ConfigureAwait(false);

        var available = await active.CountAsync(p => p.IsAvailable, cancellationToken).ConfigureAwait(false);
        var total = await active.CountAsync(cancellationToken).ConfigureAwait(false);

        // Prices are compared in memory: SQLite cannot aggregate decimals server-side.
        var prices = await active.Select(p => p.PriceBs).ToListAsync(cancellationToken).ConfigureAwait(false);

        var attributeValues = await db.ProductAttributes.AsNoTracking()
            .Where(a => active.Any(p => p.Id == a.ProductId))
            .GroupBy(a => new { a.Key, a.Value })
            .Select(g => new { g.Key.Key, g.Key.Value, Count = g.Count() })
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        var definitions = await reader.AttributeDefinitions(cancellationToken).ConfigureAwait(false);

        var attributes = attributeValues
            .GroupBy(a => a.Key, StringComparer.Ordinal)
            .OrderBy(g => definitions.TryGetValue(g.Key, out var d) ? d.SortOrder : int.MaxValue)
            .ThenBy(g => g.Key, StringComparer.Ordinal)
            .Select(g => new AttributeFacetDto(
                g.Key,
                definitions.TryGetValue(g.Key, out var d) ? d.Label : g.Key,
                g.OrderBy(v => int.TryParse(v.Value, out var n) ? n : int.MaxValue)
                    .ThenBy(v => v.Value, StringComparer.CurrentCulture)
                    .Select(v => new FacetValueDto(v.Value, v.Count))
                    .ToList()))
            .ToList();

        return new ProductFacetsDto(
            categories,
            brands.OrderBy(b => b.Value, StringComparer.CurrentCulture).ToList(),
            [.. Enum.GetValues<ProductCondition>().Select(c => new ConditionFacetDto(c, ProductConditionText.Label(c), conditions.FirstOrDefault(x => x.Key == c)?.Count ?? 0))],
            new AvailabilityFacetDto(available, total - available),
            prices.Count == 0 ? new PriceRangeDto(0, 0) : new PriceRangeDto(prices.Min(), prices.Max()),
            attributes);
    }

    public async Task<ProductDetailDto> Handle(GetProductBySlugQuery request, CancellationToken cancellationToken)
    {
        var product = await db.Products.AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Images)
            .Include(p => p.Attributes)
            .FirstOrDefaultAsync(p => p.Slug == request.Slug && !p.IsDeleted, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new NotFoundException("El producto no existe.");

        var related = await db.Products.AsNoTracking()
            .Where(p => !p.IsDeleted && p.CategoryId == product.CategoryId && p.Id != product.Id)
            .OrderByDescending(p => p.IsAvailable)
            .ThenByDescending(p => p.IsFeatured)
            .ThenByDescending(p => p.CreatedAt)
            .Take(4)
            .Select(ProductReader.RowProjection)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var definitions = await reader.AttributeDefinitions(cancellationToken).ConfigureAwait(false);
        var summary = ProductReader.ToSummary(ProductReader.ToRow(product));
        return new ProductDetailDto
        {
            Id = summary.Id,
            Slug = summary.Slug,
            Name = summary.Name,
            Brand = summary.Brand,
            Category = summary.Category,
            PriceBs = summary.PriceBs,
            IsAvailable = summary.IsAvailable,
            Condition = summary.Condition,
            IsFeatured = summary.IsFeatured,
            Thumbnail = summary.Thumbnail,
            CreatedAt = summary.CreatedAt,
            Description = product.Description,
            Images = ProductReader.Images(product),
            Attributes = ProductReader.Attributes(product, definitions),
            Related = related.Select(ProductReader.ToSummary).ToList(),
            UpdatedAt = product.UpdatedAt,
        };
    }

    public Task<AdminProductDetailDto> Handle(AdminGetProductQuery request, CancellationToken cancellationToken) =>
        reader.GetAdminDetail(request.Id, cancellationToken);
}

/// <summary>Shared read model mapping for products.</summary>
internal sealed class ProductReader(IAppDbContext db)
{
    public static readonly System.Linq.Expressions.Expression<Func<Product, ProductRow>> RowProjection = p => new ProductRow(
        p.Id,
        p.Slug,
        p.Name,
        p.Brand,
        p.Category!.Id,
        p.Category.Slug,
        p.Category.Name,
        p.PriceBs,
        p.IsAvailable,
        p.Condition,
        p.IsFeatured,
        p.Images.OrderBy(i => i.SortOrder).Select(i => i.Url).FirstOrDefault(),
        p.Images.OrderBy(i => i.SortOrder).Select(i => i.Alt).FirstOrDefault(),
        p.CreatedAt,
        p.UpdatedAt,
        p.IsDeleted,
        p.DeletedAt);

    public async Task<Dictionary<string, AttributeDefinition>> AttributeDefinitions(CancellationToken cancellationToken) =>
        await db.AttributeDefinitions.AsNoTracking().ToDictionaryAsync(d => d.Key, StringComparer.Ordinal, cancellationToken).ConfigureAwait(false);

    public async Task<AdminProductDetailDto> GetAdminDetail(int id, CancellationToken cancellationToken)
    {
        var product = await db.Products.AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Images)
            .Include(p => p.Attributes)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new NotFoundException("El producto no existe.");
        var definitions = await AttributeDefinitions(cancellationToken).ConfigureAwait(false);
        var admin = ToAdmin(ToRow(product));
        return new AdminProductDetailDto
        {
            Id = admin.Id,
            Slug = admin.Slug,
            Name = admin.Name,
            Brand = admin.Brand,
            Category = admin.Category,
            PriceBs = admin.PriceBs,
            IsAvailable = admin.IsAvailable,
            Condition = admin.Condition,
            IsFeatured = admin.IsFeatured,
            Thumbnail = admin.Thumbnail,
            CreatedAt = admin.CreatedAt,
            IsDeleted = admin.IsDeleted,
            DeletedAt = admin.DeletedAt,
            UpdatedAt = admin.UpdatedAt,
            Description = product.Description,
            Images = Images(product),
            Attributes = Attributes(product, definitions),
        };
    }

    public static ProductRow ToRow(Product p)
    {
        var first = p.Images.OrderBy(i => i.SortOrder).FirstOrDefault();
        return new ProductRow(
            p.Id, p.Slug, p.Name, p.Brand, p.Category!.Id, p.Category.Slug, p.Category.Name, p.PriceBs, p.IsAvailable,
            p.Condition, p.IsFeatured, first?.Url, first?.Alt, p.CreatedAt, p.UpdatedAt, p.IsDeleted, p.DeletedAt);
    }

    public static ProductSummaryDto ToSummary(ProductRow r) => new()
    {
        Id = r.Id,
        Slug = r.Slug,
        Name = r.Name,
        Brand = r.Brand,
        Category = new CategoryRefDto(r.CategoryId, r.CategorySlug, r.CategoryName),
        PriceBs = r.PriceBs,
        IsAvailable = r.IsAvailable,
        Condition = r.Condition,
        IsFeatured = r.IsFeatured,
        Thumbnail = new ImageDto(r.ThumbnailUrl ?? string.Empty, r.ThumbnailAlt ?? r.Name),
        CreatedAt = r.CreatedAt,
    };

    public static AdminProductDto ToAdmin(ProductRow r)
    {
        var s = ToSummary(r);
        return new AdminProductDto
        {
            Id = s.Id,
            Slug = s.Slug,
            Name = s.Name,
            Brand = s.Brand,
            Category = s.Category,
            PriceBs = s.PriceBs,
            IsAvailable = s.IsAvailable,
            Condition = s.Condition,
            IsFeatured = s.IsFeatured,
            Thumbnail = s.Thumbnail,
            CreatedAt = s.CreatedAt,
            IsDeleted = r.IsDeleted,
            DeletedAt = r.DeletedAt,
            UpdatedAt = r.UpdatedAt,
        };
    }

    public static IReadOnlyList<ImageDto> Images(Product p) =>
        p.Images.OrderBy(i => i.SortOrder).Select(i => new ImageDto(i.Url, i.Alt)).ToList();

    public static IReadOnlyList<AttributeValueDto> Attributes(Product p, Dictionary<string, AttributeDefinition> definitions) =>
        p.Attributes
            .OrderBy(a => definitions.TryGetValue(a.Key, out var d) ? d.SortOrder : int.MaxValue)
            .ThenBy(a => a.Key, StringComparer.Ordinal)
            .Select(a => new AttributeValueDto(a.Key, definitions.TryGetValue(a.Key, out var d) ? d.Label : a.Key, a.Value))
            .ToList();
}

internal sealed record ProductRow(
    int Id,
    string Slug,
    string Name,
    string Brand,
    int CategoryId,
    string CategorySlug,
    string CategoryName,
    decimal PriceBs,
    bool IsAvailable,
    ProductCondition Condition,
    bool IsFeatured,
    string? ThumbnailUrl,
    string? ThumbnailAlt,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    bool IsDeleted,
    DateTime? DeletedAt);
