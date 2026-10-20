using System.Text.Json;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Nexo.Application.Common;
using Nexo.Application.Products;

namespace Nexo.Application.Content;

public sealed record SiteDto(
    string Name,
    string Slogan,
    string Description,
    SiteContactDto Contact,
    IReadOnlyList<SiteSocialDto> Social,
    IReadOnlyList<SiteNavDto> Nav);

public sealed record SiteContactDto(string Address, string Phone, string Whatsapp, string Email, string Hours);

public sealed record SiteSocialDto(string Network, string Url);

public sealed record SiteNavDto(string Label, string Href);

public sealed record SeoDto(string Title, string Description, string? OgImageUrl);

public sealed record PageSummaryDto(string Slug, string Title, DateTime UpdatedAt);

/// <summary>A CMS block; <see cref="Data"/> shape depends on <see cref="Type"/> (see CONTRATO-API.md).</summary>
public sealed record PageBlockDto(string Id, string Type, JsonElement Data);

public sealed record PageDto(string Slug, string Title, SeoDto Seo, IReadOnlyList<PageBlockDto> Blocks, DateTime UpdatedAt);

public record NewsSummaryDto
{
    public required int Id { get; init; }

    public required string Slug { get; init; }

    public required string Title { get; init; }

    public required string Excerpt { get; init; }

    public required ImageDto CoverImage { get; init; }

    public required string Author { get; init; }

    public required IReadOnlyList<string> Tags { get; init; }

    public required DateTime PublishedAt { get; init; }
}

public sealed record NewsDetailDto : NewsSummaryDto
{
    public required string Html { get; init; }

    public required SeoDto Seo { get; init; }

    public required IReadOnlyList<NewsSummaryDto> Related { get; init; }
}

public sealed record GetSiteQuery : IRequest<SiteDto>;

public sealed record ListPagesQuery : IRequest<IReadOnlyList<PageSummaryDto>>;

public sealed record GetPageQuery(string Slug) : IRequest<PageDto>;

public sealed record ListNewsQuery(int? Page, int? PageSize, string? Sort) : IRequest<PagedResult<NewsSummaryDto>>, IPagedRequest;

public sealed record GetNewsQuery(string Slug) : IRequest<NewsDetailDto>;

public sealed class ListNewsQueryValidator : AbstractValidator<ListNewsQuery>
{
    public ListNewsQueryValidator()
    {
        this.AddPagingRules();
        RuleFor(x => x.Sort).MustBeOneOf("newest", "oldest");
    }
}

internal sealed class ContentHandlers(IAppDbContext db, IOptions<SiteOptions> site) :
    IRequestHandler<GetSiteQuery, SiteDto>,
    IRequestHandler<ListPagesQuery, IReadOnlyList<PageSummaryDto>>,
    IRequestHandler<GetPageQuery, PageDto>,
    IRequestHandler<ListNewsQuery, PagedResult<NewsSummaryDto>>,
    IRequestHandler<GetNewsQuery, NewsDetailDto>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public Task<SiteDto> Handle(GetSiteQuery request, CancellationToken cancellationToken)
    {
        var s = site.Value;
        return Task.FromResult(new SiteDto(
            s.Name,
            s.Slogan,
            s.Description,
            new SiteContactDto(s.Contact.Address, s.Contact.Phone, s.Contact.Whatsapp, s.Contact.Email, s.Contact.Hours),
            s.Social.Select(x => new SiteSocialDto(x.Network, x.Url)).ToList(),
            s.Nav.Select(x => new SiteNavDto(x.Label, x.Href)).ToList()));
    }

    public async Task<IReadOnlyList<PageSummaryDto>> Handle(ListPagesQuery request, CancellationToken cancellationToken) =>
        await db.Pages.AsNoTracking()
            .OrderBy(p => p.Id)
            .Select(p => new PageSummaryDto(p.Slug, p.Title, p.UpdatedAt))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

    public async Task<PageDto> Handle(GetPageQuery request, CancellationToken cancellationToken)
    {
        var page = await db.Pages.AsNoTracking().FirstOrDefaultAsync(p => p.Slug == request.Slug, cancellationToken).ConfigureAwait(false)
            ?? throw new NotFoundException("La página no existe.");
        var blocks = JsonSerializer.Deserialize<List<PageBlockDto>>(page.BlocksJson, Json) ?? [];
        return new PageDto(page.Slug, page.Title, new SeoDto(page.SeoTitle, page.SeoDescription, page.OgImageUrl), blocks, page.UpdatedAt);
    }

    public async Task<PagedResult<NewsSummaryDto>> Handle(ListNewsQuery request, CancellationToken cancellationToken)
    {
        var query = db.News.AsNoTracking();
        query = request.Sort == "oldest"
            ? query.OrderBy(n => n.PublishedAt).ThenBy(n => n.Id)
            : query.OrderByDescending(n => n.PublishedAt).ThenByDescending(n => n.Id);
        var page = await query.ToPagedAsync(request, cancellationToken).ConfigureAwait(false);
        return page.Map(ToSummary);
    }

    public async Task<NewsDetailDto> Handle(GetNewsQuery request, CancellationToken cancellationToken)
    {
        var article = await db.News.AsNoTracking().FirstOrDefaultAsync(n => n.Slug == request.Slug, cancellationToken).ConfigureAwait(false)
            ?? throw new NotFoundException("La noticia no existe.");
        var related = await db.News.AsNoTracking()
            .Where(n => n.Id != article.Id)
            .OrderByDescending(n => n.PublishedAt)
            .Take(3)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var summary = ToSummary(article);
        return new NewsDetailDto
        {
            Id = summary.Id,
            Slug = summary.Slug,
            Title = summary.Title,
            Excerpt = summary.Excerpt,
            CoverImage = summary.CoverImage,
            Author = summary.Author,
            Tags = summary.Tags,
            PublishedAt = summary.PublishedAt,
            Html = article.Html,
            Seo = new SeoDto(article.Title, article.Excerpt, article.CoverImageUrl),
            Related = related.Select(ToSummary).ToList(),
        };
    }

    private static NewsSummaryDto ToSummary(Domain.Content.NewsArticle n) => new()
    {
        Id = n.Id,
        Slug = n.Slug,
        Title = n.Title,
        Excerpt = n.Excerpt,
        CoverImage = new ImageDto(n.CoverImageUrl, n.CoverImageAlt),
        Author = n.Author,
        Tags = n.TagList,
        PublishedAt = n.PublishedAt,
    };
}
