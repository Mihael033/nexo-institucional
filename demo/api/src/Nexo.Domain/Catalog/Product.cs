using Nexo.Domain.Common;

namespace Nexo.Domain.Catalog;

public sealed class Product : Entity, IAuditable, ISoftDeletable
{
    private readonly List<ProductImage> _images = [];
    private readonly List<ProductAttribute> _attributes = [];

    private Product()
    {
    }

    public Product(ProductData data, DateTime now)
    {
        CreatedAt = now;
        Apply(data, now);
    }

    public string Name { get; private set; } = string.Empty;

    public string Slug { get; private set; } = string.Empty;

    public int CategoryId { get; private set; }

    public Category? Category { get; private set; }

    public string Brand { get; private set; } = string.Empty;

    public decimal PriceBs { get; private set; }

    public bool IsAvailable { get; private set; }

    public ProductCondition Condition { get; private set; }

    public bool IsFeatured { get; private set; }

    public string Description { get; private set; } = string.Empty;

    /// <summary>Accent-free lowercase text (name, brand, description) for portable search.</summary>
    [AuditIgnore]
    public string SearchText { get; private set; } = string.Empty;

    [AuditIgnore]
    public string NormalizedName { get; private set; } = string.Empty;

    public bool IsDeleted { get; private set; }

    public DateTime? DeletedAt { get; private set; }

    public DateTime CreatedAt { get; private set; }

    [AuditIgnore]
    public DateTime UpdatedAt { get; private set; }

    public IReadOnlyList<ProductImage> Images => _images;

    public IReadOnlyList<ProductAttribute> Attributes => _attributes;

    public string AuditLabel => Name;

    public void Update(ProductData data, DateTime now) => Apply(data, now);

    public void Delete(DateTime now)
    {
        if (IsDeleted)
        {
            return;
        }

        IsDeleted = true;
        DeletedAt = now;
        UpdatedAt = now;
    }

    public void Restore(DateTime now)
    {
        if (!IsDeleted)
        {
            return;
        }

        IsDeleted = false;
        DeletedAt = null;
        UpdatedAt = now;
    }

    private void Apply(ProductData data, DateTime now)
    {
        if (!TextNormalizer.IsValidSlug(data.Slug))
        {
            throw new DomainException($"Invalid slug '{data.Slug}'.");
        }

        if (data.PriceBs < 0)
        {
            throw new DomainException("Price cannot be negative.");
        }

        if (data.ImageUrls.Count == 0)
        {
            throw new DomainException("A product needs at least one image.");
        }

        Name = data.Name.Trim();
        Slug = data.Slug;
        CategoryId = data.CategoryId;
        Brand = data.Brand.Trim();
        PriceBs = decimal.Round(data.PriceBs, 2);
        IsAvailable = data.IsAvailable;
        Condition = data.Condition;
        IsFeatured = data.IsFeatured;
        Description = data.Description.Trim();
        NormalizedName = TextNormalizer.ForSearch(Name);
        SearchText = TextNormalizer.ForSearch($"{Name} {Brand} {Description}");
        UpdatedAt = now;

        SyncImages(data.ImageUrls);
        SyncAttributes(data.Attributes);
    }

    private void SyncImages(IReadOnlyList<string> urls)
    {
        var desired = urls
            .Select((url, index) => (Url: url.Trim(), Alt: index == 0 ? Name : $"{Name} ({index + 1})"))
            .ToList();
        var current = _images.OrderBy(i => i.SortOrder).Select(i => (i.Url, i.Alt)).ToList();
        if (current.SequenceEqual(desired))
        {
            return;
        }

        _images.Clear();
        for (var i = 0; i < desired.Count; i++)
        {
            _images.Add(new ProductImage(desired[i].Url, desired[i].Alt, i));
        }
    }

    private void SyncAttributes(IReadOnlyDictionary<string, string> attributes)
    {
        var desired = attributes
            .Where(a => !string.IsNullOrWhiteSpace(a.Value))
            .ToDictionary(a => a.Key.Trim(), a => a.Value.Trim(), StringComparer.Ordinal);

        _attributes.RemoveAll(a => !desired.TryGetValue(a.Key, out var value) || value != a.Value);
        foreach (var (key, value) in desired)
        {
            if (!_attributes.Exists(a => a.Key == key))
            {
                _attributes.Add(new ProductAttribute(key, value));
            }
        }
    }
}
