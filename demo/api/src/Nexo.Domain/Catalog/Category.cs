using Nexo.Domain.Common;

namespace Nexo.Domain.Catalog;

public sealed class Category : Entity, IAuditable
{
    private Category()
    {
    }

    public Category(string name, string slug, string? description)
    {
        Update(name, slug, description);
    }

    public string Name { get; private set; } = string.Empty;

    public string Slug { get; private set; } = string.Empty;

    public string? Description { get; private set; }

    public string AuditLabel => Name;

    public void Update(string name, string slug, string? description)
    {
        if (!TextNormalizer.IsValidSlug(slug))
        {
            throw new DomainException($"Invalid slug '{slug}'.");
        }

        Name = name.Trim();
        Slug = slug;
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
    }
}
