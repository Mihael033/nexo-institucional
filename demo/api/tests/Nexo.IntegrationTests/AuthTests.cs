using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Nexo.Application.Common;
using Nexo.Domain.Identity;

namespace Nexo.IntegrationTests;

public sealed class AuthTests(NexoApiFactory factory) : IClassFixture<NexoApiFactory>
{
    [Fact]
    public async Task Login_returns_token_and_sets_a_hardened_refresh_cookie()
    {
        var response = await factory.Anonymous().PostAsJsonAsync("/api/v1/auth/login", new { email = "ADMIN@nexo.com.bo ", password = NexoApiFactory.Password });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.JsonAsync();
        Assert.Equal("Bearer", body.GetProperty("tokenType").GetString());
        Assert.Equal(900, body.GetProperty("expiresIn").GetInt32());
        Assert.Equal("Admin", body.GetProperty("user").GetProperty("role").GetString());
        Assert.Contains("audit.read", body.GetProperty("user").GetProperty("permissions").EnumerateArray().Select(p => p.GetString()));
        Assert.False(body.TryGetProperty("refreshToken", out _));

        var cookie = response.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith("nexo_refresh=", StringComparison.Ordinal)).ToLowerInvariant();
        Assert.Contains("httponly", cookie, StringComparison.Ordinal);
        Assert.Contains("samesite=strict", cookie, StringComparison.Ordinal);
        Assert.Contains("secure", cookie, StringComparison.Ordinal);
        Assert.Contains("path=/api/v1/auth", cookie, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Wrong_password_is_a_generic_401_and_is_audited()
    {
        var response = await factory.Anonymous().PostAsJsonAsync("/api/v1/auth/login", new { email = "nadie@nexo.com.bo", password = "x" });
        await response.AssertProblemAsync(401, "auth.invalid_credentials");

        var admin = await factory.AuthenticatedAsync();
        var audit = await admin.GetJsonAsync("/api/v1/admin/audit?action=login_failed&q=nadie");
        Assert.Equal(1, audit.GetProperty("totalItems").GetInt32());
    }

    [Fact]
    public async Task Account_is_locked_after_five_failures()
    {
        const string email = "bloqueo@nexo.com.bo";
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<Infrastructure.Persistence.AppDbContext>();
            var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
            var role = await db.Roles.SingleAsync(r => r.Name == Role.Editor);
            db.Users.Add(new User("Bloqueo", email, hasher.Hash("Correcta#1"), role, DateTime.UtcNow));
            await db.SaveChangesAsync();
        }

        var client = factory.Anonymous();
        for (var i = 0; i < 4; i++)
        {
            await (await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password = "mala" })).AssertProblemAsync(401, "auth.invalid_credentials");
        }

        var fifth = await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password = "mala" });
        var locked = await fifth.AssertProblemAsync(423, "auth.locked_out");
        Assert.True(locked.TryGetProperty("lockoutEnd", out _));

        // Even the right password is refused while locked.
        await (await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password = "Correcta#1" })).AssertProblemAsync(423, "auth.locked_out");
    }

    [Fact]
    public async Task Refresh_rotates_and_reuse_revokes_the_whole_family()
    {
        var client = factory.Anonymous();
        var login = await NexoApiFactory.LoginAsync(client, NexoApiFactory.EditorEmail);

        var first = await Refresh(client, login.RefreshCookie);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var rotated = NexoApiFactory.RefreshCookie(first);
        Assert.NotNull(rotated);
        Assert.NotEqual(login.RefreshCookie, rotated);
        Assert.Equal("Editor", (await first.JsonAsync()).GetProperty("user").GetProperty("role").GetString());

        // Replaying the old cookie is treated as theft: 401 and the new cookie dies too.
        await (await Refresh(client, login.RefreshCookie)).AssertProblemAsync(401, "auth.invalid_refresh");
        await (await Refresh(client, rotated!)).AssertProblemAsync(401, "auth.invalid_refresh");
    }

    [Fact]
    public async Task Refresh_without_cookie_is_401()
    {
        var response = await factory.Anonymous().PostAsync(new Uri("/api/v1/auth/refresh", UriKind.Relative), null);
        await response.AssertProblemAsync(401, "auth.invalid_refresh");
    }

    [Fact]
    public async Task Logout_revokes_the_refresh_token_and_clears_the_cookie()
    {
        var client = factory.Anonymous();
        var login = await NexoApiFactory.LoginAsync(client, NexoApiFactory.AdminEmail);

        using var logout = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/logout");
        logout.Headers.Add("Cookie", login.RefreshCookie);
        var response = await client.SendAsync(logout);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Contains(response.Headers.GetValues("Set-Cookie"), c => c.StartsWith("nexo_refresh=;", StringComparison.Ordinal));
        await (await Refresh(client, login.RefreshCookie)).AssertProblemAsync(401, "auth.invalid_refresh");
    }

    [Fact]
    public async Task Me_requires_a_valid_token()
    {
        var client = factory.Anonymous();
        await (await client.GetAsync(new Uri("/api/v1/auth/me", UriKind.Relative))).AssertProblemAsync(401, "unauthorized");

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.");
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(new Uri("/api/v1/auth/me", UriKind.Relative))).StatusCode);

        var editor = await factory.AuthenticatedAsync(NexoApiFactory.EditorEmail);
        var me = await editor.GetJsonAsync("/api/v1/auth/me");
        Assert.Equal("Carlos Mamani", me.GetProperty("name").GetString());
        Assert.DoesNotContain("users.read", me.GetProperty("permissions").EnumerateArray().Select(p => p.GetString()));
    }

    private static Task<HttpResponseMessage> Refresh(HttpClient client, string cookie)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
        request.Headers.Add("Cookie", cookie);
        return client.SendAsync(request);
    }
}

public sealed class AuthorizationTests(NexoApiFactory factory) : IClassFixture<NexoApiFactory>
{
    [Theory]
    [InlineData("/api/v1/admin/dashboard")]
    [InlineData("/api/v1/admin/products")]
    [InlineData("/api/v1/admin/audit")]
    public async Task Admin_routes_require_authentication(string url) =>
        await (await factory.Anonymous().GetAsync(new Uri(url, UriKind.Relative))).AssertProblemAsync(401, "unauthorized");

    [Theory]
    [InlineData("/api/v1/admin/users")]
    [InlineData("/api/v1/admin/roles")]
    [InlineData("/api/v1/admin/audit")]
    [InlineData("/api/v1/admin/audit/meta")]
    public async Task Editor_cannot_see_users_or_audit(string url)
    {
        var editor = await factory.AuthenticatedAsync(NexoApiFactory.EditorEmail);
        await (await editor.GetAsync(new Uri(url, UriKind.Relative))).AssertProblemAsync(403, "forbidden");
    }

    [Fact]
    public async Task Editor_dashboard_has_no_recent_activity()
    {
        var editor = await factory.AuthenticatedAsync(NexoApiFactory.EditorEmail);
        var dashboard = await editor.GetJsonAsync("/api/v1/admin/dashboard");
        Assert.Equal(System.Text.Json.JsonValueKind.Null, dashboard.GetProperty("recentActivity").ValueKind);
        Assert.Equal(30, dashboard.GetProperty("totals").GetProperty("products").GetInt32());
    }

    [Fact]
    public async Task Admin_dashboard_has_totals_chart_and_activity()
    {
        var admin = await factory.AuthenticatedAsync();
        var dashboard = await admin.GetJsonAsync("/api/v1/admin/dashboard");

        Assert.Equal(7, dashboard.GetProperty("messagesLast7Days").GetArrayLength());
        Assert.Equal(5, dashboard.GetProperty("productsByCategory").GetArrayLength());
        Assert.InRange(dashboard.GetProperty("recentActivity").GetArrayLength(), 1, 8);
        Assert.Equal(3, dashboard.GetProperty("totals").GetProperty("messagesUnread").GetInt32());
    }

    [Fact]
    public async Task Admin_lists_users_and_roles()
    {
        var admin = await factory.AuthenticatedAsync();
        var users = await admin.GetJsonAsync("/api/v1/admin/users?role=Editor");
        Assert.Contains(users.GetProperty("items").EnumerateArray(), u => u.GetProperty("email").GetString() == NexoApiFactory.EditorEmail);

        var roles = await admin.GetJsonAsync("/api/v1/admin/roles");
        var editorRole = roles.EnumerateArray().Single(r => r.GetProperty("name").GetString() == "Editor");
        Assert.DoesNotContain("audit.read", editorRole.GetProperty("permissions").EnumerateArray().Select(p => p.GetString()));
    }
}
