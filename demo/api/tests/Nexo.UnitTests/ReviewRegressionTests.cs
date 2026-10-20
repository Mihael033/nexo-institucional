using Nexo.Application.Auditing;
using Nexo.Application.Categories;
using Nexo.Application.Common;
using Nexo.Application.Imports;
using Nexo.Application.Products;

namespace Nexo.UnitTests;

/// <summary>Regression tests for issues found during the QA review of the API.</summary>
public sealed class ReviewRegressionTests
{
    [Theory]
    [InlineData("10,125", 10.125)]
    [InlineData("10.1234", 10.1234)]
    [InlineData("1250.505", 1250.505)]
    [InlineData("1.250,505", 1250.505)]
    [InlineData("1,250,000", 1250000)]
    public void Extra_decimals_are_kept_so_validation_can_reject_them(string raw, double expected) =>
        Assert.Equal((decimal)expected, CsvValues.ParsePrice(raw));

    [Theory]
    [InlineData("1,2,3")]
    [InlineData("1.2.3")]
    [InlineData("12.50,3.1")]
    [InlineData("1,25.000")]
    public void Malformed_separators_are_rejected(string raw) => Assert.Null(CsvValues.ParsePrice(raw));

    [Fact]
    public void Price_with_three_decimals_fails_product_validation()
    {
        var request = new ProductUpsertRequest
        {
            Name = "Silla",
            CategoryId = 1,
            Brand = "Andes",
            PriceBs = CsvValues.ParsePrice("10,125")!.Value,
            Description = "Descripción suficiente.",
            Images = ["https://picsum.photos/seed/x/800/600"],
        };
        var errors = new ProductUpsertRequestValidator().Validate(request).Errors;
        Assert.Contains(errors, e => e.PropertyName == "PriceBs" && e.ErrorMessage.Contains("2 decimales", StringComparison.Ordinal));
    }

    [Theory]
    [InlineData("---", null, false)]
    [InlineData("+++", null, false)]
    [InlineData("---", "producto-x", true)]
    [InlineData("Silla 2", null, true)]
    public void Name_must_produce_a_slug_when_none_is_given(string name, string? slug, bool valid)
    {
        var request = new ProductUpsertRequest
        {
            Name = name,
            Slug = slug,
            CategoryId = 1,
            Brand = "Andes",
            PriceBs = 10,
            Description = "Descripción suficiente.",
            Images = ["https://picsum.photos/seed/x/800/600"],
        };
        Assert.Equal(valid, new ProductUpsertRequestValidator().Validate(request).IsValid);
    }

    [Fact]
    public void Category_name_must_produce_a_slug() =>
        Assert.False(new CategoryUpsertRequestValidator().Validate(new CategoryUpsertRequest("¡¡¡", null, null)).IsValid);

    [Fact]
    public void Unclosed_quotes_are_rejected() =>
        Assert.Throws<BadRequestException>(() => Csv.Parse("nombre;descripcion\nSilla;\"sin cerrar\nMesa;ok", ';'));

    [Theory]
    [InlineData(" =1+1")]
    [InlineData("\t=1+1")]
    [InlineData("\r+cmd")]
    [InlineData("  @SUM(A1)")]
    public void Formulas_after_leading_whitespace_are_neutralized(string value)
    {
        var csv = Csv.Write([[value]]).TrimStart('﻿');
        Assert.StartsWith("'", csv.TrimStart('"'), StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("10/17/2026")]
    [InlineData("17-10-2026")]
    [InlineData("2026/10/17")]
    public void Non_iso_dates_are_rejected(string value) => Assert.Null(DateRange.ToUtc(value, TimeZoneInfo.Utc, endOfDay: true));

    [Fact]
    public void Iso_timestamps_are_still_accepted() =>
        Assert.Equal(new DateTime(2026, 10, 17, 10, 0, 0, DateTimeKind.Utc), DateRange.ToUtc("2026-10-17T10:00:00Z", TimeZoneInfo.Utc, endOfDay: true));

    [Theory]
    [InlineData("2026-10-18", "2026-10-17", false)]
    [InlineData("2026-10-17", "2026-10-17", true)]
    [InlineData("2026-10-01", null, true)]
    public void Audit_filter_requires_from_before_to(string from, string? to, bool valid)
    {
        var query = new ListAuditQuery(null, null, null, null, from, to, null, null, null, null);
        Assert.Equal(valid, new ListAuditQueryValidator().Validate(query).IsValid);
    }
}
