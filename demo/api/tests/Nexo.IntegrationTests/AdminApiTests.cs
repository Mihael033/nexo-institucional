using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Microsoft.EntityFrameworkCore;

namespace Nexo.IntegrationTests;

public sealed class ProductAdminTests(NexoApiFactory factory) : IClassFixture<NexoApiFactory>
{
    private static object Body(string name, decimal price = 1250.50m, string ubicacion = "Sucre", string? slug = null) => new
    {
        name,
        slug,
        categoryId = 4,
        brand = "Andes",
        priceBs = price,
        isAvailable = true,
        condition = "new",
        isFeatured = false,
        description = "Producto creado por las pruebas de integración.",
        images = new[] { "https://picsum.photos/seed/test/800/600" },
        attributes = new Dictionary<string, string> { ["ubicacion"] = ubicacion, ["garantiaMeses"] = "12" },
    };

    [Fact]
    public async Task Create_update_delete_restore_with_full_audit_trail()
    {
        var admin = await factory.AuthenticatedAsync();

        var created = await admin.PostAsJsonAsync("/api/v1/admin/products", Body("Taladro de integración"));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var product = await created.JsonAsync();
        var id = product.GetProperty("id").GetInt32();
        Assert.Equal("taladro-de-integracion", product.GetProperty("slug").GetString());
        Assert.Equal($"/api/v1/admin/products/{id}", created.Headers.Location?.OriginalString);
        Assert.Equal(1250.50m, product.GetProperty("priceBs").GetDecimal());

        var updated = await admin.PutAsJsonAsync($"/api/v1/admin/products/{id}", Body("Taladro de integración", 1300m, "Tarija"));
        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync(new Uri($"/api/v1/admin/products/{id}", UriKind.Relative))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await factory.Anonymous().GetAsync(new Uri("/api/v1/products/taladro-de-integracion", UriKind.Relative))).StatusCode);
        var deleted = await admin.GetJsonAsync("/api/v1/admin/products?status=deleted&q=integracion");
        Assert.Equal(1, deleted.GetProperty("totalItems").GetInt32());

        var restored = await admin.PostAsync(new Uri($"/api/v1/admin/products/{id}/restore", UriKind.Relative), null);
        Assert.False((await restored.JsonAsync()).GetProperty("isDeleted").GetBoolean());

        var audit = await admin.GetJsonAsync($"/api/v1/admin/audit?entityType=Product&entityId={id}&sort=oldest");
        var actions = audit.GetProperty("items").EnumerateArray().Select(a => a.GetProperty("action").GetString()).ToList();
        Assert.Equal(["create", "update", "delete", "restore"], actions);
        Assert.All(audit.GetProperty("items").EnumerateArray(), a => Assert.Equal("Ana Quispe", a.GetProperty("userName").GetString()));

        var updateId = audit.GetProperty("items")[1].GetProperty("id").GetInt64();
        var detail = await admin.GetJsonAsync($"/api/v1/admin/audit/{updateId}");
        var changed = detail.GetProperty("changes").EnumerateArray().Select(c => c.GetProperty("field").GetString()).ToList();
        Assert.Equal(["priceBs", "attributes"], changed);
        Assert.Equal(1250.5m, detail.GetProperty("before").GetProperty("priceBs").GetDecimal());
        Assert.Equal(1300m, detail.GetProperty("after").GetProperty("priceBs").GetDecimal());
    }

    [Fact]
    public async Task Saving_without_changes_does_not_create_noise_in_the_audit()
    {
        var admin = await factory.AuthenticatedAsync();
        var created = await (await admin.PostAsJsonAsync("/api/v1/admin/products", Body("Producto sin cambios"))).JsonAsync();
        var id = created.GetProperty("id").GetInt32();

        await admin.PutAsJsonAsync($"/api/v1/admin/products/{id}", Body("Producto sin cambios"));

        var audit = await admin.GetJsonAsync($"/api/v1/admin/audit?entityType=Product&entityId={id}");
        Assert.Equal(1, audit.GetProperty("totalItems").GetInt32());
    }

    [Fact]
    public async Task Duplicate_slug_is_a_conflict()
    {
        var admin = await factory.AuthenticatedAsync();
        var response = await admin.PostAsJsonAsync("/api/v1/admin/products", Body("Otro router", slug: "router-wi-fi-7"));
        await response.AssertProblemAsync(409, "conflict");
    }

    [Fact]
    public async Task Invalid_product_returns_camel_case_field_errors()
    {
        var admin = await factory.AuthenticatedAsync();
        var response = await admin.PostAsJsonAsync("/api/v1/admin/products", new { name = "", categoryId = 0, brand = "", priceBs = -1, description = "x", images = Array.Empty<string>() });

        var errors = (await response.AssertProblemAsync(400, "validation_failed")).GetProperty("errors").EnumerateObject().Select(p => p.Name).ToList();
        Assert.Equal(["name", "categoryId", "brand", "priceBs", "description", "images"], errors);
    }

    [Fact]
    public async Task Unknown_category_is_a_validation_error()
    {
        var admin = await factory.AuthenticatedAsync();
        var body = new
        {
            name = "Producto huérfano",
            categoryId = 999,
            brand = "Andes",
            priceBs = 10,
            isAvailable = true,
            condition = "used",
            isFeatured = false,
            description = "Categoría inexistente para probar.",
            images = new[] { "https://picsum.photos/seed/x/800/600" },
            attributes = new Dictionary<string, string>(),
        };
        var response = await admin.PostAsJsonAsync("/api/v1/admin/products", body);
        var problem = await response.AssertProblemAsync(400, "validation_failed");
        Assert.True(problem.GetProperty("errors").TryGetProperty("categoryId", out _));
    }

    [Fact]
    public async Task Messages_can_be_marked_as_read_and_it_is_audited()
    {
        var admin = await factory.AuthenticatedAsync();
        var unread = await admin.GetJsonAsync("/api/v1/admin/messages?status=unread");
        var id = unread.GetProperty("items")[0].GetProperty("id").GetInt32();

        var response = await admin.PatchAsJsonAsync($"/api/v1/admin/messages/{id}", new { isRead = true });
        var message = await response.JsonAsync();
        Assert.True(message.GetProperty("isRead").GetBoolean());
        Assert.Equal("Ana Quispe", message.GetProperty("readBy").GetString());

        var audit = await admin.GetJsonAsync($"/api/v1/admin/audit?action=mark_read&entityId={id}");
        Assert.Equal(1, audit.GetProperty("totalItems").GetInt32());
    }

    [Fact]
    public async Task Audit_entries_are_immutable()
    {
        await factory.WithDbAsync(async db =>
        {
            var entry = await db.AuditEntries.FirstAsync();
            db.AuditEntries.Remove(entry);
            await Assert.ThrowsAsync<InvalidOperationException>(() => db.SaveChangesAsync());
        });
    }

    [Fact]
    public async Task Audit_filters_and_meta()
    {
        var admin = await factory.AuthenticatedAsync();
        var meta = await admin.GetJsonAsync("/api/v1/admin/audit/meta");
        Assert.Contains(meta.GetProperty("actions").EnumerateArray(), a => a.GetProperty("value").GetString() == "login_failed");

        var today = DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        var logins = await admin.GetJsonAsync($"/api/v1/admin/audit?action=login,login_failed&from=2020-01-01&to={today}");
        Assert.All(logins.GetProperty("items").EnumerateArray(), a => Assert.Contains(a.GetProperty("action").GetString(), new[] { "login", "login_failed" }));
        Assert.True(logins.GetProperty("totalItems").GetInt32() >= 1);

        var none = await admin.GetJsonAsync("/api/v1/admin/audit?from=2020-01-01&to=2020-01-02");
        Assert.Equal(0, none.GetProperty("totalItems").GetInt32());

        var bad = await admin.GetAsync(new Uri("/api/v1/admin/audit?action=hack&from=ayer", UriKind.Relative));
        await bad.AssertProblemAsync(400, "validation_failed");

        var inverted = await admin.GetAsync(new Uri("/api/v1/admin/audit?from=2026-10-18&to=2026-10-17", UriKind.Relative));
        Assert.True((await inverted.AssertProblemAsync(400, "validation_failed")).GetProperty("errors").TryGetProperty("to", out _));

        var symbolsOnly = await admin.PostAsJsonAsync("/api/v1/admin/products", new
        {
            name = "---",
            categoryId = 1,
            brand = "Andes",
            priceBs = 10,
            isAvailable = true,
            condition = "new",
            isFeatured = false,
            description = "Nombre sin letras ni números.",
            images = new[] { "https://picsum.photos/seed/z/800/600" },
            attributes = new Dictionary<string, string>(),
        });
        Assert.True((await symbolsOnly.AssertProblemAsync(400, "validation_failed")).GetProperty("errors").TryGetProperty("name", out _));
    }
}

public sealed class ImportTests(NexoApiFactory factory) : IClassFixture<NexoApiFactory>
{
    private const string Header = "nombre;slug;categoria;marca;precio_bs;disponible;estado;descripcion;imagenes;ubicacion";

    private static MultipartFormDataContent File(string content, string fileName = "productos.csv")
    {
        var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(Encoding.UTF8.GetBytes(content));
        file.Headers.ContentType = new MediaTypeHeaderValue("text/csv");
        form.Add(file, "file", fileName);
        return form;
    }

    [Fact]
    public async Task Template_is_a_csv_with_the_expected_columns()
    {
        var admin = await factory.AuthenticatedAsync();
        var response = await admin.GetAsync(new Uri("/api/v1/admin/products/import/template", UriKind.Relative));

        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        var text = await response.Content.ReadAsStringAsync();
        Assert.StartsWith("nombre*;slug;categoria*", text.TrimStart('﻿'), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Validate_preview_errors_report_and_confirm()
    {
        var admin = await factory.AuthenticatedAsync();
        var csv = string.Join("\n",
            Header,
            "Silla nueva de importación;;mobiliario-de-oficina;Andes;1.250,50;si;Nuevo;Silla ergonómica para oficinas.;https://picsum.photos/seed/s/800/600;La Paz",
            "Switch 24 puertos;switch-24-puertos;equipos-de-red;Sajama;500;no;Usado;Switch actualizado desde CSV.;https://picsum.photos/seed/sw/800/600;Sucre",
            ";;xyz;Andes;abc;quiza;Roto;corta;ftp://x;",
            "Silla duplicada;silla-nueva-de-importacion;mobiliario-de-oficina;Andes;10;si;Nuevo;Descripción suficientemente larga.;https://picsum.photos/seed/d/800/600;La Paz");

        var validate = await admin.PostAsync(new Uri("/api/v1/admin/products/import/validate", UriKind.Relative), File(csv));
        Assert.Equal(HttpStatusCode.OK, validate.StatusCode);
        var preview = await validate.JsonAsync();
        Assert.Equal(4, preview.GetProperty("totalRows").GetInt32());
        Assert.Equal(2, preview.GetProperty("validRows").GetInt32());
        Assert.Equal(1, preview.GetProperty("toCreate").GetInt32());
        Assert.Equal(1, preview.GetProperty("toUpdate").GetInt32());

        var rows = preview.GetProperty("rows").EnumerateArray().ToList();
        Assert.Equal(2, rows[0].GetProperty("rowNumber").GetInt32());
        Assert.Equal(1250.50m, rows[0].GetProperty("data").GetProperty("priceBs").GetDecimal());
        var invalidColumns = rows[2].GetProperty("errors").EnumerateArray().Select(e => e.GetProperty("column").GetString()).ToHashSet();
        Assert.Superset(new HashSet<string?> { "nombre", "categoria", "precio_bs", "disponible", "estado", "descripcion", "imagenes" }, invalidColumns);
        Assert.Contains(rows[3].GetProperty("errors").EnumerateArray(), e => e.GetProperty("message").GetString()!.Contains("repetido", StringComparison.Ordinal));

        var importId = preview.GetProperty("importId").GetString();
        var report = await admin.GetAsync(new Uri($"/api/v1/admin/products/import/{importId}/errors", UriKind.Relative));
        var reportText = (await report.Content.ReadAsStringAsync()).TrimStart('﻿');
        Assert.StartsWith("fila;columna;error", reportText, StringComparison.Ordinal);
        Assert.Contains("4;categoria;", reportText, StringComparison.Ordinal);

        // Nothing is written before confirmation.
        Assert.Equal(HttpStatusCode.NotFound, (await factory.Anonymous().GetAsync(new Uri("/api/v1/products/silla-nueva-de-importacion", UriKind.Relative))).StatusCode);

        var confirm = await (await admin.PostAsync(new Uri($"/api/v1/admin/products/import/{importId}/confirm", UriKind.Relative), null)).JsonAsync();
        Assert.Equal(1, confirm.GetProperty("created").GetInt32());
        Assert.Equal(1, confirm.GetProperty("updated").GetInt32());
        Assert.Equal(2, confirm.GetProperty("skipped").GetInt32());

        var switchDetail = await factory.Anonymous().GetJsonAsync("/api/v1/products/switch-24-puertos");
        Assert.Equal(500m, switchDetail.GetProperty("priceBs").GetDecimal());
        var attributes = switchDetail.GetProperty("attributes").EnumerateArray().ToDictionary(a => a.GetProperty("key").GetString()!, a => a.GetProperty("value").GetString());
        Assert.Equal("Sucre", attributes["ubicacion"]);
        Assert.True(attributes.ContainsKey("garantiaMeses"), "Columns absent from the file must keep their current values.");

        await (await admin.PostAsync(new Uri($"/api/v1/admin/products/import/{importId}/confirm", UriKind.Relative), null)).AssertProblemAsync(410, "import.expired");

        var audit = await admin.GetJsonAsync($"/api/v1/admin/audit?action=import&entityId={importId}");
        Assert.Equal(1, audit.GetProperty("totalItems").GetInt32());
    }

    [Fact]
    public async Task Rows_with_extra_decimals_or_no_usable_slug_are_invalid()
    {
        var admin = await factory.AuthenticatedAsync();
        var csv = string.Join("\n",
            Header,
            "Precio con tres decimales;;herramientas;Andes;10,125;si;Nuevo;Descripción suficientemente larga.;https://picsum.photos/seed/p/800/600;La Paz",
            "---;;herramientas;Andes;10;si;Nuevo;Descripción suficientemente larga.;https://picsum.photos/seed/q/800/600;La Paz");

        var preview = await (await admin.PostAsync(new Uri("/api/v1/admin/products/import/validate", UriKind.Relative), File(csv))).JsonAsync();

        Assert.Equal(0, preview.GetProperty("validRows").GetInt32());
        var rows = preview.GetProperty("rows").EnumerateArray().ToList();
        Assert.Contains(rows[0].GetProperty("errors").EnumerateArray(), e => e.GetProperty("column").GetString() == "precio_bs");
        Assert.Contains(rows[1].GetProperty("errors").EnumerateArray(), e => e.GetProperty("column").GetString() == "nombre");
    }

    [Fact]
    public async Task Another_user_cannot_confirm_my_batch()
    {
        var admin = await factory.AuthenticatedAsync();
        var csv = Header + "\nMesa de reuniones;;mobiliario-de-oficina;Andes;900;si;Nuevo;Mesa para ocho personas.;https://picsum.photos/seed/m/800/600;Cochabamba";
        var preview = await (await admin.PostAsync(new Uri("/api/v1/admin/products/import/validate", UriKind.Relative), File(csv))).JsonAsync();

        var editor = await factory.AuthenticatedAsync(NexoApiFactory.EditorEmail);
        var response = await editor.PostAsync(new Uri($"/api/v1/admin/products/import/{preview.GetProperty("importId").GetString()}/confirm", UriKind.Relative), null);
        await response.AssertProblemAsync(403, "forbidden");
    }

    [Theory]
    [InlineData("nombre;marca\nX;Y", "productos.csv", "Faltan columnas obligatorias")]
    [InlineData("hola", "productos.xlsx", null)]
    public async Task Bad_files_are_rejected(string content, string fileName, string? detail)
    {
        var admin = await factory.AuthenticatedAsync();
        var response = await admin.PostAsync(new Uri("/api/v1/admin/products/import/validate", UriKind.Relative), File(content, fileName));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        if (detail is not null)
        {
            Assert.Contains(detail, (await response.JsonAsync()).GetProperty("detail").GetString(), StringComparison.Ordinal);
        }
    }
}
