using Nexo.Domain.Catalog;
using Nexo.Domain.Common;
using Nexo.Domain.Identity;
using Nexo.Domain.Imports;
using Nexo.Domain.Messaging;

namespace Nexo.UnitTests;

public sealed class TextNormalizerTests
{
    [Theory]
    [InlineData("Vehículos", "vehiculos")]
    [InlineData("  Garantía   y SOPORTE ", "garantia y soporte")]
    [InlineData("Ñandutí", "nanduti")]
    [InlineData(null, "")]
    public void ForSearch_removes_accents_case_and_extra_spaces(string? input, string expected) =>
        Assert.Equal(expected, TextNormalizer.ForSearch(input));

    [Theory]
    [InlineData("Router Wi-Fi 7", "router-wi-fi-7")]
    [InlineData("Escritorio ejecutivo en «L»", "escritorio-ejecutivo-en-l")]
    [InlineData("  --Cámara 4K--  ", "camara-4k")]
    public void Slugify_produces_url_safe_slugs(string input, string expected) =>
        Assert.Equal(expected, TextNormalizer.Slugify(input));

    [Fact]
    public void Slugify_truncates_without_trailing_hyphen()
    {
        var slug = TextNormalizer.Slugify("abc def ghi", maxLength: 4);
        Assert.Equal("abc", slug);
    }

    [Theory]
    [InlineData("router-wi-fi-7", true)]
    [InlineData("Router", false)]
    [InlineData("a--b", false)]
    [InlineData("", false)]
    public void IsValidSlug(string slug, bool expected) => Assert.Equal(expected, TextNormalizer.IsValidSlug(slug));
}

public sealed class ProductTests
{
    private static readonly DateTime Now = new(2026, 10, 17, 12, 0, 0, DateTimeKind.Utc);

    private static ProductData Data(string[]? images = null, Dictionary<string, string>? attributes = null, string slug = "taladro-percutor") =>
        new("Taladro percutor", slug, 1, "Andes", 1250.505m, true, ProductCondition.New, false, "Taladro para mantenimiento.",
            images ?? ["https://img/1.jpg", "https://img/2.jpg"],
            attributes ?? new Dictionary<string, string> { ["ubicacion"] = "La Paz", ["garantiaMeses"] = "12" });

    [Fact]
    public void Create_builds_images_attributes_and_search_text()
    {
        var product = new Product(Data(), Now);

        Assert.Equal(1250.50m, product.PriceBs);
        Assert.Equal(["https://img/1.jpg", "https://img/2.jpg"], product.Images.OrderBy(i => i.SortOrder).Select(i => i.Url));
        Assert.Equal("Taladro percutor", product.Images[0].Alt);
        Assert.Equal(2, product.Attributes.Count);
        Assert.Contains("andes", product.SearchText, StringComparison.Ordinal);
        Assert.Equal(Now, product.CreatedAt);
    }

    [Fact]
    public void Update_keeps_unchanged_children_and_replaces_changed_ones()
    {
        var product = new Product(Data(), Now);
        var location = product.Attributes.Single(a => a.Key == "ubicacion");
        var firstImages = product.Images.ToList();

        product.Update(Data(attributes: new Dictionary<string, string> { ["ubicacion"] = "La Paz", ["garantiaMeses"] = "24" }), Now.AddDays(1));

        Assert.Same(location, product.Attributes.Single(a => a.Key == "ubicacion"));
        Assert.Equal("24", product.Attributes.Single(a => a.Key == "garantiaMeses").Value);
        Assert.Equal(firstImages, product.Images);
        Assert.Equal(Now.AddDays(1), product.UpdatedAt);
    }

    [Fact]
    public void Update_drops_blank_attributes()
    {
        var product = new Product(Data(), Now);
        product.Update(Data(attributes: new Dictionary<string, string> { ["ubicacion"] = " " }), Now);
        Assert.Empty(product.Attributes);
    }

    [Fact]
    public void Delete_and_restore_toggle_soft_delete()
    {
        var product = new Product(Data(), Now);

        product.Delete(Now.AddHours(1));
        Assert.True(product.IsDeleted);
        Assert.Equal(Now.AddHours(1), product.DeletedAt);

        product.Restore(Now.AddHours(2));
        Assert.False(product.IsDeleted);
        Assert.Null(product.DeletedAt);
    }

    [Theory]
    [InlineData("Not A Slug")]
    [InlineData("")]
    public void Invalid_slug_is_rejected(string slug) =>
        Assert.Throws<DomainException>(() => new Product(Data(slug: slug), Now));

    [Fact]
    public void Product_requires_an_image() =>
        Assert.Throws<DomainException>(() => new Product(Data(images: []), Now));
}

public sealed class UserTests
{
    private static readonly DateTime Now = new(2026, 10, 17, 12, 0, 0, DateTimeKind.Utc);

    private static User NewUser() => new("Ana", " Ana@Nexo.com.BO ", "hash", new Role(Role.Editor, "x", [Permissions.ProductsRead]), Now);

    [Fact]
    public void Email_is_normalized() => Assert.Equal("ana@nexo.com.bo", NewUser().Email);

    [Fact]
    public void Fifth_consecutive_failure_locks_the_account_for_15_minutes()
    {
        var user = NewUser();
        for (var i = 0; i < 4; i++)
        {
            Assert.False(user.RegisterFailedLogin(Now));
        }

        Assert.True(user.RegisterFailedLogin(Now));
        Assert.True(user.IsLockedOut(Now.AddMinutes(14)));
        Assert.False(user.IsLockedOut(Now.AddMinutes(15)));
    }

    [Fact]
    public void Successful_login_resets_the_counter()
    {
        var user = NewUser();
        user.RegisterFailedLogin(Now);
        user.RegisterFailedLogin(Now);
        user.RegisterSuccessfulLogin(Now);
        Assert.Equal(0, user.FailedLoginCount);
        Assert.Equal(Now, user.LastLoginAt);
    }

    [Fact]
    public void Role_rejects_unknown_permissions() =>
        Assert.Throws<DomainException>(() => new Role("X", "x", ["products.fly"]));

    [Fact]
    public void Refresh_token_is_inactive_after_revoke_or_expiry()
    {
        var token = new RefreshToken(1, "hash", Guid.NewGuid(), Now, Now.AddDays(7), null);
        Assert.True(token.IsActive(Now));
        Assert.False(token.IsActive(Now.AddDays(7)));

        token.Revoke(Now, "logout");
        Assert.False(token.IsActive(Now));
        Assert.Equal("logout", token.RevokedReason);
    }
}

public sealed class MessageAndImportTests
{
    private static readonly DateTime Now = new(2026, 10, 17, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Contact_message_read_state()
    {
        var message = new ContactMessage(" Juan ", "juan@x.bo", " ", null, "Hola", "Mensaje de prueba", "1.1.1.1", Now);
        Assert.Equal("Juan", message.Name);
        Assert.Null(message.Phone);

        message.MarkAsRead("Ana", Now);
        Assert.True(message.IsRead);
        Assert.Equal("Ana", message.ReadBy);

        message.MarkAsUnread();
        Assert.False(message.IsRead);
        Assert.Null(message.ReadAt);
    }

    [Fact]
    public void Import_batch_can_be_confirmed_once_and_expires()
    {
        var batch = new ImportBatch("id", 1, "a.csv", 1, 1, "[]", "[]", Now);
        Assert.True(batch.CanConfirm(Now.AddMinutes(29)));
        Assert.False(batch.CanConfirm(Now.AddMinutes(30)));

        batch.MarkConfirmed(Now);
        Assert.False(batch.CanConfirm(Now));
        Assert.Throws<InvalidOperationException>(() => batch.MarkConfirmed(Now));
    }
}
