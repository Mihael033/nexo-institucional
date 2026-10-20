using FluentValidation;
using Nexo.Application.Common;
using Nexo.Domain.Catalog;
using Nexo.Domain.Common;

namespace Nexo.Application.Products;

/// <summary>Catalog filters shared by the public and admin listings (bound from the query string).</summary>
public record ProductFilter : IPagedRequest
{
    public string? Q { get; init; }

    /// <summary>Category slugs, comma separated (OR).</summary>
    public string? Category { get; init; }

    /// <summary>Brands, comma separated (OR, case-insensitive).</summary>
    public string? Brand { get; init; }

    /// <summary>new | used.</summary>
    public string? Condition { get; init; }

    public bool? Available { get; init; }

    public bool? Featured { get; init; }

    public decimal? MinPrice { get; init; }

    public decimal? MaxPrice { get; init; }

    /// <summary>Repeatable "key:value". Same key = OR, different keys = AND.</summary>
    public IReadOnlyList<string>? Attr { get; init; }

    public string? Sort { get; init; }

    public int? Page { get; init; }

    public int? PageSize { get; init; }
}

public static class ProductSorts
{
    public const string Newest = "newest";
    public const string Oldest = "oldest";
    public const string PriceAsc = "price_asc";
    public const string PriceDesc = "price_desc";
    public const string NameAsc = "name_asc";
    public const string NameDesc = "name_desc";
    public const string Relevance = "relevance";
    public const string UpdatedDesc = "updated_desc";

    public static readonly string[] Public = [Newest, Oldest, PriceAsc, PriceDesc, NameAsc, NameDesc, Relevance];

    public static readonly string[] Admin = [.. Public, UpdatedDesc];
}

internal static class ProductQuery
{
    public static IQueryable<Product> ApplyFilter(this IQueryable<Product> query, ProductFilter filter)
    {
        // Category slugs are already accent-free, so "vehiculo" also finds the "Vehículos" category.
        foreach (var term in SearchTerms(filter.Q))
        {
            query = query.Where(p => p.SearchText.Contains(term) || p.Category!.Slug.Contains(term));
        }

        var categories = QueryText.SplitList(filter.Category);
        if (categories.Count > 0)
        {
            query = query.Where(p => categories.Contains(p.Category!.Slug));
        }

        var brands = QueryText.SplitList(filter.Brand).Select(b => b.ToLowerInvariant()).ToList();
        if (brands.Count > 0)
        {
            query = query.Where(p => brands.Contains(p.Brand.ToLower()));
        }

        if (ParseCondition(filter.Condition) is { } condition)
        {
            query = query.Where(p => p.Condition == condition);
        }

        if (filter.Available is { } available)
        {
            query = query.Where(p => p.IsAvailable == available);
        }

        if (filter.Featured is { } featured)
        {
            query = query.Where(p => p.IsFeatured == featured);
        }

        if (filter.MinPrice is { } min)
        {
            query = query.Where(p => p.PriceBs >= min);
        }

        if (filter.MaxPrice is { } max)
        {
            query = query.Where(p => p.PriceBs <= max);
        }

        foreach (var group in ParseAttributes(filter.Attr).GroupBy(a => a.Key, a => a.Value, StringComparer.Ordinal))
        {
            var key = group.Key;
            var values = group.Distinct(StringComparer.Ordinal).ToList();
            query = query.Where(p => p.Attributes.Any(a => a.Key == key && values.Contains(a.Value)));
        }

        return query;
    }

    public static IQueryable<Product> ApplySort(this IQueryable<Product> query, ProductFilter filter)
    {
        var sort = filter.Sort ?? ProductSorts.Newest;
        var firstTerm = SearchTerms(filter.Q).FirstOrDefault();
        if (sort == ProductSorts.Relevance && firstTerm is null)
        {
            sort = ProductSorts.Newest;
        }

        return sort switch
        {
            ProductSorts.Oldest => query.OrderBy(p => p.CreatedAt).ThenBy(p => p.Id),
            ProductSorts.PriceAsc => query.OrderBy(p => p.PriceBs).ThenBy(p => p.Id),
            ProductSorts.PriceDesc => query.OrderByDescending(p => p.PriceBs).ThenBy(p => p.Id),
            ProductSorts.NameAsc => query.OrderBy(p => p.NormalizedName).ThenBy(p => p.Id),
            ProductSorts.NameDesc => query.OrderByDescending(p => p.NormalizedName).ThenBy(p => p.Id),
            ProductSorts.UpdatedDesc => query.OrderByDescending(p => p.UpdatedAt).ThenByDescending(p => p.Id),
            ProductSorts.Relevance => query
                .OrderBy(p => p.NormalizedName.StartsWith(firstTerm!) ? 0 : p.NormalizedName.Contains(firstTerm!) ? 1 : 2)
                .ThenByDescending(p => p.CreatedAt)
                .ThenBy(p => p.Id),
            _ => query.OrderByDescending(p => p.CreatedAt).ThenByDescending(p => p.Id),
        };
    }

    public static IReadOnlyList<string> SearchTerms(string? q) =>
        TextNormalizer.ForSearch(q).Split(' ', StringSplitOptions.RemoveEmptyEntries).Take(8).ToList();

    public static ProductCondition? ParseCondition(string? value) => value switch
    {
        "new" => ProductCondition.New,
        "used" => ProductCondition.Used,
        _ => null,
    };

    public static IEnumerable<(string Key, string Value)> ParseAttributes(IReadOnlyList<string>? values)
    {
        foreach (var raw in values ?? [])
        {
            var separator = raw.IndexOf(':', StringComparison.Ordinal);
            if (separator > 0 && separator < raw.Length - 1)
            {
                yield return (raw[..separator].Trim(), raw[(separator + 1)..].Trim());
            }
        }
    }
}

public sealed class ProductFilterValidator : AbstractValidator<ProductFilter>
{
    public ProductFilterValidator(string[] allowedSorts)
    {
        this.AddPagingRules();
        RuleFor(x => x.Q).MaximumLength(100);
        RuleFor(x => x.Condition).MustBeOneOf("new", "used");
        RuleFor(x => x.Sort).MustBeOneOf(allowedSorts);
        RuleFor(x => x.MinPrice).GreaterThanOrEqualTo(0);
        RuleFor(x => x.MaxPrice).GreaterThanOrEqualTo(0)
            .GreaterThanOrEqualTo(x => x.MinPrice ?? 0).WithMessage("El precio máximo debe ser mayor o igual al mínimo.");
        RuleFor(x => x.Attr)
            .Must(values => values is null || (values.Count <= 20 && values.All(v => v.Length <= 150 && v.IndexOf(':', StringComparison.Ordinal) is > 0 && !v.EndsWith(':'))))
            .WithMessage("Cada filtro de atributo debe tener el formato clave:valor.");
    }
}
