using Nexo.Domain.Common;

namespace Nexo.Domain.Catalog;

public enum ProductCondition
{
    New = 1,
    Used = 2,
}

/// <summary>Display metadata for a dynamic product attribute key.</summary>
public sealed class AttributeDefinition
{
    private AttributeDefinition()
    {
    }

    public AttributeDefinition(string key, string label, int sortOrder)
    {
        Key = key;
        Label = label;
        SortOrder = sortOrder;
    }

    public string Key { get; private set; } = string.Empty;

    public string Label { get; private set; } = string.Empty;

    public int SortOrder { get; private set; }
}

public sealed class ProductImage : Entity, IAuditChild
{
    private ProductImage()
    {
    }

    internal ProductImage(string url, string alt, int sortOrder)
    {
        Url = url;
        Alt = alt;
        SortOrder = sortOrder;
    }

    public int ProductId { get; private set; }

    public string Url { get; private set; } = string.Empty;

    public string Alt { get; private set; } = string.Empty;

    public int SortOrder { get; private set; }
}

/// <summary>Dynamic key/value attribute (EAV) so the catalog can be filtered by any attribute.</summary>
public sealed class ProductAttribute : Entity, IAuditChild
{
    private ProductAttribute()
    {
    }

    internal ProductAttribute(string key, string value)
    {
        Key = key;
        Value = value;
    }

    public int ProductId { get; private set; }

    public string Key { get; private set; } = string.Empty;

    public string Value { get; private set; } = string.Empty;
}

public sealed record ProductData(
    string Name,
    string Slug,
    int CategoryId,
    string Brand,
    decimal PriceBs,
    bool IsAvailable,
    ProductCondition Condition,
    bool IsFeatured,
    string Description,
    IReadOnlyList<string> ImageUrls,
    IReadOnlyDictionary<string, string> Attributes);
