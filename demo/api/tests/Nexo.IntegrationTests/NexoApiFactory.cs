using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Nexo.Infrastructure.Persistence;

namespace Nexo.IntegrationTests;

/// <summary>Runs the real API against a throw-away SQLite file seeded with the demo data.</summary>
public class NexoApiFactory : WebApplicationFactory<Program>
{
    public const string Password = "Demo#2026";
    public const string AdminEmail = "admin@nexo.com.bo";
    public const string EditorEmail = "editor@nexo.com.bo";

    private readonly string _databasePath = Path.Combine(Path.GetTempPath(), $"nexo-tests-{Guid.NewGuid():N}.db");

    protected virtual int ContactPermitLimit => 1000;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Database:Provider", "Sqlite");
        builder.UseSetting("ConnectionStrings:Sqlite", $"Data Source={_databasePath};Pooling=False");
        builder.UseSetting("Seed:DemoUserPassword", Password);
        builder.UseSetting("Security:PasswordHashIterations", "1000");
        builder.UseSetting("Auth:RefreshCookieSecure", "true");
        builder.UseSetting("RateLimiting:LoginPermitLimit", "1000");
        builder.UseSetting("RateLimiting:RefreshPermitLimit", "1000");
        builder.UseSetting("RateLimiting:ContactPermitLimit", ContactPermitLimit.ToString(System.Globalization.CultureInfo.InvariantCulture));
        builder.UseSetting("OpenApi:Enabled", "true");
        builder.UseSetting("Serilog:MinimumLevel:Default", "Warning");
    }

    public HttpClient Anonymous() => CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });

    public async Task<HttpClient> AuthenticatedAsync(string email = AdminEmail)
    {
        var client = Anonymous();
        var login = await LoginAsync(client, email);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", login.AccessToken);
        return client;
    }

    public static async Task<LoginResult> LoginAsync(HttpClient client, string email, string password = Password)
    {
        var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return new LoginResult(body.GetProperty("accessToken").GetString()!, RefreshCookie(response)!, body);
    }

    /// <summary>Raw "nexo_refresh=value" pair from Set-Cookie (null when cleared or absent).</summary>
    public static string? RefreshCookie(HttpResponseMessage response)
    {
        if (!response.Headers.TryGetValues("Set-Cookie", out var cookies))
        {
            return null;
        }

        var pair = cookies.Select(c => c.Split(';')[0]).FirstOrDefault(c => c.StartsWith("nexo_refresh=", StringComparison.Ordinal));
        return pair is null || pair == "nexo_refresh=" ? null : pair;
    }

    public async Task WithDbAsync(Func<AppDbContext, Task> action)
    {
        using var scope = Services.CreateScope();
        await action(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            try
            {
                File.Delete(_databasePath);
            }
            catch (IOException)
            {
                // Best effort: the temp file may still be locked on Windows.
            }
        }
    }
}

public sealed record LoginResult(string AccessToken, string RefreshCookie, JsonElement Body);

public sealed class LowContactLimitFactory : NexoApiFactory
{
    protected override int ContactPermitLimit => 2;
}

internal static class HttpExtensions
{
    public static async Task<JsonElement> JsonAsync(this HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>();

    public static async Task<JsonElement> GetJsonAsync(this HttpClient client, string url)
    {
        var response = await client.GetAsync(new Uri(url, UriKind.Relative));
        Assert.True(response.IsSuccessStatusCode, $"GET {url} → {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        return await response.JsonAsync();
    }

    public static async Task<JsonElement> AssertProblemAsync(this HttpResponseMessage response, int status, string code)
    {
        Assert.Equal(status, (int)response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.JsonAsync();
        Assert.Equal(code, body.GetProperty("code").GetString());
        Assert.Equal(status, body.GetProperty("status").GetInt32());
        Assert.True(body.TryGetProperty("traceId", out _));
        return body;
    }
}
