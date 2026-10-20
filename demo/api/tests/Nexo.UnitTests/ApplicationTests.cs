using System.Text;
using Microsoft.Extensions.Options;
using Nexo.Application.Auditing;
using Nexo.Application.Common;
using Nexo.Application.Imports;
using Nexo.Application.Messages;
using Nexo.Application.Products;
using Nexo.Domain.Auditing;
using Nexo.Infrastructure.Security;

namespace Nexo.UnitTests;

public sealed class CsvTests
{
    [Theory]
    [InlineData("a;b;c\n1;2;3", ';')]
    [InlineData("a,b,c\n1,2,3", ',')]
    [InlineData("\"x;y\",b,c\n1,2,3", ',')]
    public void Detects_the_delimiter_from_the_header(string text, char expected) =>
        Assert.Equal(expected, Csv.DetectDelimiter(text));

    [Fact]
    public void Parses_quotes_escaped_quotes_multiline_fields_and_line_numbers()
    {
        var text = "nombre;descripcion\r\n\"Silla \"\"Pro\"\"\";\"Línea 1\nLínea 2\"\r\n\r\nMesa;Simple\r\n";

        var records = Csv.Parse(text, ';');

        Assert.Equal(3, records.Count);
        Assert.Equal(["Silla \"Pro\"", "Línea 1\nLínea 2"], records[1].Fields);
        Assert.Equal(2, records[1].LineNumber);
        Assert.Equal(5, records[2].LineNumber);
        Assert.Equal(["Mesa", "Simple"], records[2].Fields);
    }

    [Fact]
    public void Decodes_utf8_with_bom_and_falls_back_to_latin1()
    {
        var utf8 = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes("categoría")).ToArray();
        Assert.Equal("categoría", Csv.Decode(utf8));

        var latin1 = Encoding.Latin1.GetBytes("categoría");
        Assert.Equal("categoría", Csv.Decode(latin1));
    }

    [Fact]
    public void Write_adds_bom_quotes_and_neutralizes_formulas()
    {
        var csv = Csv.Write([["a;b", "say \"hi\"", "=SUM(A1)"]]);

        Assert.StartsWith("﻿", csv, StringComparison.Ordinal);
        Assert.Contains("\"a;b\";\"say \"\"hi\"\"\";'=SUM(A1)", csv, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("1250.50", 1250.50)]
    [InlineData("1.250,50", 1250.50)]
    [InlineData("1250,5", 1250.5)]
    [InlineData("1,250.50", 1250.50)]
    [InlineData("1.250", 1250)]
    [InlineData("1.250.000", 1250000)]
    [InlineData("Bs 2.890,00", 2890)]
    [InlineData("261", 261)]
    public void ParsePrice_accepts_bolivian_and_international_formats(string raw, double expected) =>
        Assert.Equal((decimal)expected, CsvValues.ParsePrice(raw));

    [Theory]
    [InlineData("")]
    [InlineData("abc")]
    [InlineData(null)]
    public void ParsePrice_rejects_garbage(string? raw) => Assert.Null(CsvValues.ParsePrice(raw));

    [Theory]
    [InlineData("si", true)]
    [InlineData("Sí", true)]
    [InlineData("1", true)]
    [InlineData("NO", false)]
    [InlineData("false", false)]
    [InlineData("quizá", null)]
    public void ParseBool(string raw, bool? expected) => Assert.Equal(expected, CsvValues.ParseBool(raw));
}

public sealed class ValidatorTests
{
    private static ProductUpsertRequest Valid() => new()
    {
        Name = "Silla ergonómica",
        CategoryId = 1,
        Brand = "Andes",
        PriceBs = 850.90m,
        IsAvailable = true,
        Description = "Silla ergonómica con apoyo lumbar.",
        Images = ["https://picsum.photos/seed/x/800/600"],
        Attributes = new Dictionary<string, string> { ["ubicacion"] = "Sucre" },
    };

    [Fact]
    public void Valid_product_passes() => Assert.True(new ProductUpsertRequestValidator().Validate(Valid()).IsValid);

    [Fact]
    public void Product_rules_report_each_invalid_field()
    {
        var request = Valid() with
        {
            Name = "",
            Slug = "No Valido",
            PriceBs = 10.123m,
            Images = ["ftp://x"],
            Attributes = new Dictionary<string, string> { ["mal clave"] = "x" },
        };

        var errors = new ProductUpsertRequestValidator().Validate(request).Errors.Select(e => e.PropertyName).ToList();

        Assert.Contains("Name", errors);
        Assert.Contains("Slug", errors);
        Assert.Contains("PriceBs", errors);
        Assert.Contains(errors, e => e.StartsWith("Images", StringComparison.Ordinal));
        Assert.Contains(errors, e => e.StartsWith("Attributes", StringComparison.Ordinal));
    }

    [Fact]
    public void Slug_is_generated_from_the_name_when_empty() =>
        Assert.Equal("silla-ergonomica", Valid().ResolveSlug());

    [Fact]
    public void Contact_rules()
    {
        var validator = new SubmitContactCommandValidator();
        var ok = new SubmitContactCommand("Juan Mamani", "juan@ejemplo.com.bo", "+591 71234567", null, "Cotización", "Necesitamos 20 escritorios.", null);
        Assert.True(validator.Validate(ok).IsValid);

        var bad = ok with { Email = "no-es-correo", Phone = "abc", Message = "corto" };
        var errors = validator.Validate(bad).Errors.Select(e => e.PropertyName).ToList();
        Assert.Equal(["Email", "Phone", "Message"], errors);
    }

    [Fact]
    public void Product_filter_rejects_bad_paging_sort_and_attr()
    {
        var validator = new ListProductsQueryValidator();
        var errors = validator.Validate(new ListProductsQuery { PageSize = 101, Sort = "random", Attr = ["sin-dos-puntos"], MinPrice = 10, MaxPrice = 5 })
            .Errors.Select(e => e.PropertyName).ToList();
        Assert.Equal(["PageSize", "Sort", "MaxPrice", "Attr"], errors);
    }
}

public sealed class AuditTests
{
    [Fact]
    public void Diff_lists_only_changed_fields()
    {
        var changes = AuditLog.Diff("""{"name":"A","priceBs":10,"images":[1]}""", """{"name":"A","priceBs":12,"images":[1,2],"isFeatured":true}""");

        Assert.Equal(["priceBs", "images", "isFeatured"], changes.Select(c => c.Field));
        Assert.Equal(10, changes[0].Before!.GetValue<int>());
        Assert.Null(changes[2].Before);
    }

    [Fact]
    public void Diff_handles_create_and_null_snapshots() =>
        Assert.Equal(["name"], AuditLog.Diff(null, """{"name":"A"}""").Select(c => c.Field));

    [Theory]
    [InlineData(AuditAction.Create, "Product", "Creó el producto «Silla»")]
    [InlineData(AuditAction.Delete, "Category", "Eliminó la categoría «Silla»")]
    [InlineData(AuditAction.MarkRead, "ContactMessage", "Marcó como leído el mensaje de «Silla»")]
    [InlineData(AuditAction.Create, "ContactMessage", "Nuevo mensaje de contacto de «Silla»")]
    public void Summaries_are_in_spanish(AuditAction action, string entity, string expected) =>
        Assert.Equal(expected, AuditText.Summarize(action, entity, "Silla"));

    [Fact]
    public void Actions_are_snake_case() => Assert.Equal("login_failed", AuditText.ToSnakeCase(AuditAction.LoginFailed));

    [Fact]
    public void Date_only_filters_use_the_site_time_zone()
    {
        var laPaz = new SiteOptions().TimeZone;
        Assert.Equal(new DateTime(2026, 10, 17, 4, 0, 0, DateTimeKind.Utc), DateRange.ToUtc("2026-10-17", laPaz, endOfDay: false));
        Assert.Equal(new DateTime(2026, 10, 18, 4, 0, 0, DateTimeKind.Utc), DateRange.ToUtc("2026-10-17", laPaz, endOfDay: true));
        Assert.Null(DateRange.ToUtc("17/10/2026", laPaz, endOfDay: false));
    }
}

public sealed class SecurityTests
{
    private static Pbkdf2PasswordHasher Hasher(int iterations = 1000) =>
        new(Options.Create(new SecurityOptions { PasswordHashIterations = iterations }));

    [Fact]
    public void Hash_verifies_and_is_salted()
    {
        var hasher = Hasher();
        var first = hasher.Hash("Demo#2026");
        var second = hasher.Hash("Demo#2026");

        Assert.NotEqual(first, second);
        Assert.StartsWith("pbkdf2-sha512$1000$", first, StringComparison.Ordinal);
        Assert.True(hasher.Verify("Demo#2026", first));
        Assert.False(hasher.Verify("demo#2026", first));
    }

    [Theory]
    [InlineData("")]
    [InlineData("plain")]
    [InlineData("pbkdf2-sha512$x$a$b")]
    [InlineData("pbkdf2-sha512$10$%%%$b")]
    public void Malformed_hashes_never_verify(string hash) => Assert.False(Hasher().Verify("x", hash));

    [Fact]
    public void Verification_uses_the_iterations_stored_in_the_hash()
    {
        var hash = Hasher(500).Hash("secreto");
        Assert.True(Hasher(210_000).Verify("secreto", hash));
    }

    [Fact]
    public void Signing_key_is_required_outside_development()
    {
        Assert.Throws<InvalidOperationException>(() => JwtSigningKey.Create(new JwtOptions(), allowEphemeral: false));
        Assert.Throws<InvalidOperationException>(() => JwtSigningKey.Create(new JwtOptions { SigningKey = "short" }, allowEphemeral: true));
        Assert.True(JwtSigningKey.Create(new JwtOptions(), allowEphemeral: true).IsEphemeral);
    }

    [Fact]
    public void Refresh_tokens_are_random_and_stored_hashed()
    {
        var service = new JwtTokenService(Options.Create(new JwtOptions()), JwtSigningKey.Create(new JwtOptions(), true), TimeProvider.System);
        var a = service.CreateRefreshToken();
        var b = service.CreateRefreshToken();

        Assert.NotEqual(a.RawToken, b.RawToken);
        Assert.Equal(64, a.Hash.Length);
        Assert.Equal(a.Hash, service.HashRefreshToken(a.RawToken));
        Assert.DoesNotContain(a.RawToken, a.Hash, StringComparison.Ordinal);
    }
}
