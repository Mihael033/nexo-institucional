using Nexo.Domain.Catalog;

namespace Nexo.Application.Products;

public sealed record ImageDto(string Url, string Alt);

public sealed record CategoryRefDto(int Id, string Slug, string Name);

public sealed record AttributeValueDto(string Key, string Label, string Value);

public record ProductSummaryDto
{
    public required int Id { get; init; }

    public required string Slug { get; init; }

    public required string Name { get; init; }

    public required string Brand { get; init; }

    public required CategoryRefDto Category { get; init; }

    public required decimal PriceBs { get; init; }

    public required bool IsAvailable { get; init; }

    public required ProductCondition Condition { get; init; }

    public required bool IsFeatured { get; init; }

    public required ImageDto Thumbnail { get; init; }

    public required DateTime CreatedAt { get; init; }
}

public sealed record ProductDetailDto : ProductSummaryDto
{
    public required string Description { get; init; }

    public required IReadOnlyList<ImageDto> Images { get; init; }

    public required IReadOnlyList<AttributeValueDto> Attributes { get; init; }

    public required IReadOnlyList<ProductSummaryDto> Related { get; init; }

    public required DateTime UpdatedAt { get; init; }
}

public record AdminProductDto : ProductSummaryDto
{
    public required bool IsDeleted { get; init; }

    public required DateTime? DeletedAt { get; init; }

    public required DateTime UpdatedAt { get; init; }
}

public sealed record AdminProductDetailDto : AdminProductDto
{
    public required string Description { get; init; }

    public required IReadOnlyList<ImageDto> Images { get; init; }

    public required IReadOnlyList<AttributeValueDto> Attributes { get; init; }
}

public sealed record FacetValueDto(string Value, int Count);

public sealed record CategoryFacetDto(string Slug, string Name, int Count);

public sealed record ConditionFacetDto(ProductCondition Value, string Label, int Count);

public sealed record AvailabilityFacetDto(int Available, int Unavailable);

public sealed record PriceRangeDto(decimal Min, decimal Max);

public sealed record AttributeFacetDto(string Key, string Label, IReadOnlyList<FacetValueDto> Values);

public sealed record ProductFacetsDto(
    IReadOnlyList<CategoryFacetDto> Categories,
    IReadOnlyList<FacetValueDto> Brands,
    IReadOnlyList<ConditionFacetDto> Conditions,
    AvailabilityFacetDto Availability,
    PriceRangeDto Price,
    IReadOnlyList<AttributeFacetDto> Attributes);

public static class ProductConditionText
{
    public static string Label(ProductCondition condition) => condition == ProductCondition.New ? "Nuevo" : "Usado";
}
