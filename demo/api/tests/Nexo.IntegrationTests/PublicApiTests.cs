using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Nexo.IntegrationTests;

public sealed class PublicApiTests(NexoApiFactory factory) : IClassFixture<NexoApiFactory>
{
    private readonly HttpClient _client = factory.Anonymous();

    [Fact]
    public async Task Health_and_openapi_are_available()
    {
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync(new Uri("/health", UriKind.Relative))).StatusCode);
        var openApi = await _client.GetJsonAsync("/openapi/v1.json");
        Assert.True(openApi.GetProperty("paths").TryGetProperty("/api/v1/products", out _));
        Assert.True(openApi.GetProperty("components").GetProperty("securitySchemes").TryGetProperty("Bearer", out _));
    }

    [Fact]
    public async Task Products_are_paged_with_the_standard_envelope()
    {
        var page = await _client.GetJsonAsync("/api/v1/products?page=2&pageSize=12");

        Assert.Equal(30, page.GetProperty("totalItems").GetInt32());
        Assert.Equal(3, page.GetProperty("totalPages").GetInt32());
        Assert.Equal(12, page.GetProperty("items").GetArrayLength());
        var first = page.GetProperty("items")[0];
        Assert.Equal(JsonValueKind.Number, first.GetProperty("priceBs").ValueKind);
        Assert.StartsWith("https://", first.GetProperty("thumbnail").GetProperty("url").GetString(), StringComparison.Ordinal);
        Assert.EndsWith("Z", first.GetProperty("createdAt").GetString(), StringComparison.Ordinal);
        Assert.False(first.TryGetProperty("description", out _));
    }

    [Theory]
    [InlineData("vehiculo")]
    [InlineData("VEHÍCULOS")]
    public async Task Search_ignores_case_and_accents_and_matches_the_category(string q)
    {
        var page = await _client.GetJsonAsync($"/api/v1/products?q={Uri.EscapeDataString(q)}&pageSize=50");
        Assert.Equal(6, page.GetProperty("totalItems").GetInt32());
        Assert.All(page.GetProperty("items").EnumerateArray(), p => Assert.Equal("vehiculos", p.GetProperty("category").GetProperty("slug").GetString()));
    }

    [Fact]
    public async Task Filters_combine_category_price_attributes_and_sort()
    {
        var page = await _client.GetJsonAsync("/api/v1/products?category=equipos-de-red,herramientas&minPrice=100&maxPrice=5000.50&attr=ubicacion:La%20Paz&attr=ubicacion:El%20Alto&sort=price_asc&pageSize=50");
        var items = page.GetProperty("items").EnumerateArray().ToList();

        Assert.NotEmpty(items);
        var prices = items.Select(p => p.GetProperty("priceBs").GetDecimal()).ToList();
        Assert.Equal(prices.Order(), prices);
        Assert.All(prices, p => Assert.InRange(p, 100m, 5000.50m));
        foreach (var item in items)
        {
            var detail = await _client.GetJsonAsync($"/api/v1/products/{item.GetProperty("slug").GetString()}");
            var location = detail.GetProperty("attributes").EnumerateArray().Single(a => a.GetProperty("key").GetString() == "ubicacion").GetProperty("value").GetString();
            Assert.Contains(location, new[] { "La Paz", "El Alto" });
        }
    }

    [Fact]
    public async Task Facets_describe_the_catalog()
    {
        var facets = await _client.GetJsonAsync("/api/v1/products/facets");

        Assert.Equal(5, facets.GetProperty("categories").GetArrayLength());
        Assert.Equal(6, facets.GetProperty("brands").GetArrayLength());
        var conditions = facets.GetProperty("conditions").EnumerateArray().Select(c => c.GetProperty("value").GetString()).ToList();
        Assert.Equal(["new", "used"], conditions);
        var location = facets.GetProperty("attributes").EnumerateArray().Single(a => a.GetProperty("key").GetString() == "ubicacion");
        Assert.Equal("Ubicación", location.GetProperty("label").GetString());
        Assert.Equal(6, location.GetProperty("values").GetArrayLength());
        Assert.True(facets.GetProperty("price").GetProperty("max").GetDecimal() > facets.GetProperty("price").GetProperty("min").GetDecimal());
    }

    [Fact]
    public async Task Product_detail_has_gallery_attributes_and_related()
    {
        var detail = await _client.GetJsonAsync("/api/v1/products/router-wi-fi-7");

        Assert.Equal("Router Wi-Fi 7", detail.GetProperty("name").GetString());
        Assert.Equal(3, detail.GetProperty("images").GetArrayLength());
        Assert.Equal(4, detail.GetProperty("related").GetArrayLength());
        Assert.All(detail.GetProperty("related").EnumerateArray(), r => Assert.Equal("equipos-de-red", r.GetProperty("category").GetProperty("slug").GetString()));
        Assert.Contains(detail.GetProperty("attributes").EnumerateArray(), a => a.GetProperty("label").GetString() == "Garantía (meses)");
    }

    [Fact]
    public async Task Errors_are_problem_details_in_spanish()
    {
        await (await _client.GetAsync(new Uri("/api/v1/products/no-existe", UriKind.Relative))).AssertProblemAsync(404, "not_found");

        var invalid = await _client.GetAsync(new Uri("/api/v1/products?pageSize=500&sort=random", UriKind.Relative));
        var errors = (await invalid.AssertProblemAsync(400, "validation_failed")).GetProperty("errors");
        Assert.True(errors.TryGetProperty("pageSize", out _));
        Assert.True(errors.TryGetProperty("sort", out _));
    }

    [Fact]
    public async Task Site_pages_and_news_are_served()
    {
        var site = await _client.GetJsonAsync("/api/v1/site");
        Assert.Equal("contacto@nexo.com.bo", site.GetProperty("contact").GetProperty("email").GetString());

        var home = await _client.GetJsonAsync("/api/v1/pages/inicio");
        var types = home.GetProperty("blocks").EnumerateArray().Select(b => b.GetProperty("type").GetString()).ToList();
        Assert.Equal(["hero", "richText", "features", "stats", "cta"], types);
        Assert.Equal(4, (await _client.GetJsonAsync("/api/v1/pages")).GetArrayLength());

        var news = await _client.GetJsonAsync("/api/v1/news");
        Assert.Equal(3, news.GetProperty("totalItems").GetInt32());
        var slug = news.GetProperty("items")[0].GetProperty("slug").GetString();
        var article = await _client.GetJsonAsync($"/api/v1/news/{slug}");
        Assert.Contains("<p>", article.GetProperty("html").GetString(), StringComparison.Ordinal);
        Assert.Equal(2, article.GetProperty("related").GetArrayLength());
    }

    [Fact]
    public async Task Categories_have_product_counts()
    {
        var categories = await _client.GetJsonAsync("/api/v1/categories");
        Assert.Equal(5, categories.GetArrayLength());
        Assert.All(categories.EnumerateArray(), c => Assert.Equal(6, c.GetProperty("productCount").GetInt32()));
    }

    [Fact]
    public async Task Security_headers_are_present_even_on_errors()
    {
        var response = await _client.GetAsync(new Uri("/api/v1/products/no-existe", UriKind.Relative));
        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").Single());
        Assert.Contains("default-src 'none'", response.Headers.GetValues("Content-Security-Policy").Single(), StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("http://localhost:3000", true)]
    [InlineData("https://evil.example", false)]
    public async Task Cors_only_allows_the_web_origin(string origin, bool allowed)
    {
        using var request = new HttpRequestMessage(HttpMethod.Options, "/api/v1/auth/login");
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "POST");
        request.Headers.Add("Access-Control-Request-Headers", "content-type");
        var response = await _client.SendAsync(request);

        Assert.Equal(allowed, response.Headers.TryGetValues("Access-Control-Allow-Origin", out var values) && values.Single() == origin);
        if (allowed)
        {
            Assert.Equal("true", response.Headers.GetValues("Access-Control-Allow-Credentials").Single());
        }
    }

    [Fact]
    public async Task Contact_form_saves_message_visible_in_the_panel()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/contact", new
        {
            name = "Juan Mamani",
            email = "juan@ejemplo.com.bo",
            phone = "+591 71234567",
            organization = "Fundación de prueba",
            subject = "Cotización de sillas",
            message = "Necesitamos 20 sillas ergonómicas para La Paz.",
            website = "",
        });
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var id = (await response.JsonAsync()).GetProperty("id").GetInt32();

        var admin = await factory.AuthenticatedAsync();
        var message = await admin.GetJsonAsync($"/api/v1/admin/messages/{id}");
        Assert.Equal("Juan Mamani", message.GetProperty("name").GetString());
        Assert.False(message.GetProperty("isRead").GetBoolean());

        var audit = await admin.GetJsonAsync($"/api/v1/admin/audit?entityType=ContactMessage&entityId={id}");
        Assert.Equal("create", audit.GetProperty("items")[0].GetProperty("action").GetString());
    }

    [Fact]
    public async Task Contact_honeypot_is_accepted_but_not_saved()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/contact", new
        {
            name = "Bot",
            email = "bot@spam.com",
            subject = "Oferta",
            message = "Compre seguidores baratos ahora mismo.",
            website = "http://spam.example",
        });
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        var admin = await factory.AuthenticatedAsync();
        var list = await admin.GetJsonAsync("/api/v1/admin/messages?q=bot%40spam.com&status=all");
        Assert.Equal(0, list.GetProperty("totalItems").GetInt32());
    }

    [Fact]
    public async Task Contact_validation_returns_field_errors()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/contact", new { name = "J", email = "nope", subject = "Hi", message = "corto" });
        var errors = (await response.AssertProblemAsync(400, "validation_failed")).GetProperty("errors");
        Assert.Equal(["name", "email", "subject", "message"], errors.EnumerateObject().Select(p => p.Name));
        Assert.Equal("Ingrese un correo electrónico válido.", errors.GetProperty("email")[0].GetString());
    }
}

public sealed class ContactRateLimitTests(LowContactLimitFactory factory) : IClassFixture<LowContactLimitFactory>
{
    [Fact]
    public async Task Contact_is_rate_limited_per_ip()
    {
        var client = factory.Anonymous();
        var body = new { name = "Ana Rojas", email = "ana@ejemplo.com.bo", subject = "Consulta", message = "Mensaje de prueba de límite." };

        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/v1/contact", body)).StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/v1/contact", body)).StatusCode);

        var limited = await client.PostAsJsonAsync("/api/v1/contact", body);
        await limited.AssertProblemAsync(429, "rate_limited");
        Assert.True(int.Parse(limited.Headers.GetValues("Retry-After").Single(), System.Globalization.CultureInfo.InvariantCulture) > 0);
    }
}
