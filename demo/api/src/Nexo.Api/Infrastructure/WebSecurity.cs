using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Nexo.Api.Infrastructure;

public sealed class RateLimitingOptions
{
    public const string SectionName = "RateLimiting";

    public int ContactPermitLimit { get; set; } = 5;

    public int ContactWindowSeconds { get; set; } = 600;

    public int LoginPermitLimit { get; set; } = 10;

    public int LoginWindowSeconds { get; set; } = 60;

    public int RefreshPermitLimit { get; set; } = 30;

    public int RefreshWindowSeconds { get; set; } = 60;
}

public sealed class AuthCookieOptions
{
    public const string SectionName = "Auth";

    public string RefreshCookieName { get; set; } = "nexo_refresh";

    /// <summary>Secure flag; keep true in production (HTTPS). Development over http://localhost may disable it.</summary>
    public bool RefreshCookieSecure { get; set; } = true;
}

internal static class RateLimitPolicies
{
    public const string Contact = "contact";
    public const string Login = "login";
    public const string Refresh = "refresh";

    public static IServiceCollection AddApiRateLimiting(this IServiceCollection services, IConfiguration configuration)
    {
        var options = configuration.GetSection(RateLimitingOptions.SectionName).Get<RateLimitingOptions>() ?? new RateLimitingOptions();
        services.AddRateLimiter(limiter =>
        {
            limiter.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            limiter.AddPolicy(Contact, context => PerIp(context, options.ContactPermitLimit, options.ContactWindowSeconds));
            limiter.AddPolicy(Login, context => PerIp(context, options.LoginPermitLimit, options.LoginWindowSeconds));
            limiter.AddPolicy(Refresh, context => PerIp(context, options.RefreshPermitLimit, options.RefreshWindowSeconds));
            limiter.OnRejected = async (context, cancellationToken) =>
            {
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    context.HttpContext.Response.Headers.RetryAfter = ((int)Math.Ceiling(retryAfter.TotalSeconds)).ToString(CultureInfo.InvariantCulture);
                }

                var problems = context.HttpContext.RequestServices.GetRequiredService<IProblemDetailsService>();
                await problems.WriteAsync(new ProblemDetailsContext
                {
                    HttpContext = context.HttpContext,
                    ProblemDetails = new ProblemDetails { Status = StatusCodes.Status429TooManyRequests },
                }).ConfigureAwait(false);
            };
        });
        return services;
    }

    private static RateLimitPartition<string> PerIp(HttpContext context, int permits, int windowSeconds) =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permits,
                Window = TimeSpan.FromSeconds(windowSeconds),
                QueueLimit = 0,
            });
}

/// <summary>Defensive response headers (OWASP). The API serves JSON only, so the CSP is locked down.</summary>
internal sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    public Task InvokeAsync(HttpContext context)
    {
        // Applied when the response starts so they survive the exception handler clearing headers.
        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;
            headers.XContentTypeOptions = "nosniff";
            headers.XFrameOptions = "DENY";
            headers["Referrer-Policy"] = "no-referrer";
            headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
            headers["Cross-Origin-Opener-Policy"] = "same-origin";
            if (!context.Request.Path.StartsWithSegments("/swagger", StringComparison.OrdinalIgnoreCase))
            {
                headers.ContentSecurityPolicy = "default-src 'none'; frame-ancestors 'none'";
            }

            return Task.CompletedTask;
        });

        return next(context);
    }
}
