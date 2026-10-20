using Microsoft.AspNetCore.Mvc;
using Nexo.Api.Infrastructure;
using Nexo.Application.Categories;
using Nexo.Application.Common;
using Nexo.Application.Content;
using Nexo.Application.Messages;
using Nexo.Application.Products;

namespace Nexo.Api.Endpoints;

internal static class PublicEndpoints
{
    public static RouteGroupBuilder MapPublicEndpoints(this RouteGroupBuilder api)
    {
        var site = api.MapGroup(string.Empty).WithTags("Sitio público");

        site.MapGet("/site", async (ISender sender, CancellationToken ct) => TypedResults.Ok(await sender.Send(new GetSiteQuery(), ct)))
            .WithName("GetSite").WithSummary("Datos globales del sitio (header, footer, SEO).");

        site.MapGet("/pages", async (ISender sender, CancellationToken ct) => TypedResults.Ok(await sender.Send(new ListPagesQuery(), ct)))
            .WithName("ListPages");

        site.MapGet("/pages/{slug}", async (string slug, ISender sender, CancellationToken ct) => TypedResults.Ok(await sender.Send(new GetPageQuery(slug), ct)))
            .WithName("GetPage").WithSummary("Página institucional con bloques de contenido.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        site.MapGet("/news", async (int? page, int? pageSize, string? sort, ISender sender, CancellationToken ct) =>
                TypedResults.Ok(await sender.Send(new ListNewsQuery(page, pageSize, sort), ct)))
            .WithName("ListNews").ProducesProblem(StatusCodes.Status400BadRequest);

        site.MapGet("/news/{slug}", async (string slug, ISender sender, CancellationToken ct) => TypedResults.Ok(await sender.Send(new GetNewsQuery(slug), ct)))
            .WithName("GetNews").ProducesProblem(StatusCodes.Status404NotFound);

        var catalog = api.MapGroup(string.Empty).WithTags("Catálogo");

        catalog.MapGet("/categories", async (ISender sender, CancellationToken ct) => TypedResults.Ok(await sender.Send(new ListCategoriesQuery(), ct)))
            .WithName("ListCategories");

        catalog.MapGet("/products", async ([AsParameters] ProductQueryParameters query, ISender sender, CancellationToken ct) =>
                TypedResults.Ok(await sender.Send(query.ToPublicQuery(), ct)))
            .WithName("ListProducts").WithSummary("Catálogo público con búsqueda, filtros, orden y paginación.")
            .ProducesProblem(StatusCodes.Status400BadRequest);

        catalog.MapGet("/products/facets", async (ISender sender, CancellationToken ct) => TypedResults.Ok(await sender.Send(new GetProductFacetsQuery(), ct)))
            .WithName("GetProductFacets").WithSummary("Valores disponibles para construir los filtros del catálogo.");

        catalog.MapGet("/products/{slug}", async (string slug, ISender sender, CancellationToken ct) => TypedResults.Ok(await sender.Send(new GetProductBySlugQuery(slug), ct)))
            .WithName("GetProduct").ProducesProblem(StatusCodes.Status404NotFound);

        api.MapPost("/contact", async (SubmitContactCommand body, ISender sender, CancellationToken ct) =>
                TypedResults.Accepted((string?)null, await sender.Send(body, ct)))
            .WithTags("Contacto").WithName("SubmitContact")
            .WithSummary("Formulario de contacto público (honeypot en «website» y límite de 5 envíos cada 10 minutos por IP).")
            .RequireRateLimiting(RateLimitPolicies.Contact)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);

        return api;
    }
}

/// <summary>Query-string contract of the product listings (names as documented in CONTRATO-API.md).</summary>
internal sealed record ProductQueryParameters
{
    [FromQuery(Name = "q")]
    public string? Q { get; init; }

    [FromQuery(Name = "category")]
    public string? Category { get; init; }

    [FromQuery(Name = "brand")]
    public string? Brand { get; init; }

    [FromQuery(Name = "condition")]
    public string? Condition { get; init; }

    [FromQuery(Name = "available")]
    public bool? Available { get; init; }

    [FromQuery(Name = "featured")]
    public bool? Featured { get; init; }

    [FromQuery(Name = "minPrice")]
    public decimal? MinPrice { get; init; }

    [FromQuery(Name = "maxPrice")]
    public decimal? MaxPrice { get; init; }

    [FromQuery(Name = "attr")]
    public string[]? Attr { get; init; }

    [FromQuery(Name = "sort")]
    public string? Sort { get; init; }

    [FromQuery(Name = "page")]
    public int? Page { get; init; }

    [FromQuery(Name = "pageSize")]
    public int? PageSize { get; init; }

    public ListProductsQuery ToPublicQuery() => new()
    {
        Q = Q,
        Category = Category,
        Brand = Brand,
        Condition = Condition,
        Available = Available,
        Featured = Featured,
        MinPrice = MinPrice,
        MaxPrice = MaxPrice,
        Attr = Attr,
        Sort = Sort,
        Page = Page,
        PageSize = PageSize,
    };

    public AdminListProductsQuery ToAdminQuery(string? status) => new()
    {
        Q = Q,
        Category = Category,
        Brand = Brand,
        Condition = Condition,
        Available = Available,
        Featured = Featured,
        MinPrice = MinPrice,
        MaxPrice = MaxPrice,
        Attr = Attr,
        Sort = Sort,
        Page = Page,
        PageSize = PageSize,
        Status = status,
    };
}
