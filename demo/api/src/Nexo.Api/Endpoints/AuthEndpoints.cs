using Microsoft.Extensions.Options;
using Nexo.Api.Infrastructure;
using Nexo.Application.Auth;
using Nexo.Application.Common;

namespace Nexo.Api.Endpoints;

internal static class AuthEndpoints
{
    public const string CookiePath = "/api/v1/auth";

    public static RouteGroupBuilder MapAuthEndpoints(this RouteGroupBuilder api)
    {
        var auth = api.MapGroup("/auth").WithTags("Autenticación");

        auth.MapPost("/login", async (LoginCommand body, ISender sender, HttpContext http, IOptions<AuthCookieOptions> cookie, CancellationToken ct) =>
            {
                var result = await sender.Send(body, ct);
                SetRefreshCookie(http, cookie.Value, result);
                return TypedResults.Ok(result.Response);
            })
            .WithName("Login").WithSummary("Inicia sesión: devuelve el access token y deja el refresh token en una cookie httpOnly.")
            .RequireRateLimiting(RateLimitPolicies.Login)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status423Locked)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);

        auth.MapPost("/refresh", async (ISender sender, HttpContext http, IOptions<AuthCookieOptions> cookie, CancellationToken ct) =>
            {
                try
                {
                    var result = await sender.Send(new RefreshCommand(http.Request.Cookies[cookie.Value.RefreshCookieName]), ct);
                    SetRefreshCookie(http, cookie.Value, result);
                    return TypedResults.Ok(result.Response);
                }
                catch (InvalidRefreshTokenException)
                {
                    ClearRefreshCookie(http, cookie.Value);
                    throw;
                }
            })
            .WithName("Refresh").WithSummary("Rota el refresh token (cookie) y emite un nuevo access token.")
            .RequireRateLimiting(RateLimitPolicies.Refresh)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        auth.MapPost("/logout", async (ISender sender, HttpContext http, IOptions<AuthCookieOptions> cookie, CancellationToken ct) =>
            {
                await sender.Send(new LogoutCommand(http.Request.Cookies[cookie.Value.RefreshCookieName]), ct);
                ClearRefreshCookie(http, cookie.Value);
                return TypedResults.NoContent();
            })
            .WithName("Logout");

        auth.MapGet("/me", async (ISender sender, CancellationToken ct) => TypedResults.Ok(await sender.Send(new GetMeQuery(), ct)))
            .WithName("GetMe").RequireAuthorization()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return api;
    }

    private static void SetRefreshCookie(HttpContext http, AuthCookieOptions options, AuthResult result) =>
        http.Response.Cookies.Append(options.RefreshCookieName, result.RefreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = options.RefreshCookieSecure,
            SameSite = SameSiteMode.Strict,
            Path = CookiePath,
            Expires = new DateTimeOffset(result.RefreshTokenExpiresAt, TimeSpan.Zero),
            IsEssential = true,
        });

    private static void ClearRefreshCookie(HttpContext http, AuthCookieOptions options) =>
        http.Response.Cookies.Delete(options.RefreshCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = options.RefreshCookieSecure,
            SameSite = SameSiteMode.Strict,
            Path = CookiePath,
        });
}
