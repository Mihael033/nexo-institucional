using Nexo.Domain.Common;

namespace Nexo.Domain.Content;

public sealed class NewsArticle : Entity
{
    private NewsArticle()
    {
    }

    public NewsArticle(string slug, string title, string excerpt, string html, string coverImageUrl, string coverImageAlt, string author, IEnumerable<string> tags, DateTime publishedAt)
    {
        Slug = slug;
        Title = title;
        Excerpt = excerpt;
        Html = html;
        CoverImageUrl = coverImageUrl;
        CoverImageAlt = coverImageAlt;
        Author = author;
        Tags = string.Join(',', tags);
        PublishedAt = publishedAt;
    }

    public string Slug { get; private set; } = string.Empty;

    public string Title { get; private set; } = string.Empty;

    public string Excerpt { get; private set; } = string.Empty;

    public string Html { get; private set; } = string.Empty;

    public string CoverImageUrl { get; private set; } = string.Empty;

    public string CoverImageAlt { get; private set; } = string.Empty;

    public string Author { get; private set; } = string.Empty;

    /// <summary>Comma separated tags.</summary>
    public string Tags { get; private set; } = string.Empty;

    public DateTime PublishedAt { get; private set; }

    public IReadOnlyList<string> TagList => Tags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}

/// <summary>CMS page made of typed blocks, stored as a JSON document.</summary>
public sealed class Page : Entity
{
    private Page()
    {
    }

    public Page(string slug, string title, string seoTitle, string seoDescription, string? ogImageUrl, string blocksJson, DateTime updatedAt)
    {
        Slug = slug;
        Title = title;
        SeoTitle = seoTitle;
        SeoDescription = seoDescription;
        OgImageUrl = ogImageUrl;
        BlocksJson = blocksJson;
        UpdatedAt = updatedAt;
    }

    public string Slug { get; private set; } = string.Empty;

    public string Title { get; private set; } = string.Empty;

    public string SeoTitle { get; private set; } = string.Empty;

    public string SeoDescription { get; private set; } = string.Empty;

    public string? OgImageUrl { get; private set; }

    public string BlocksJson { get; private set; } = "[]";

    public DateTime UpdatedAt { get; private set; }
}
