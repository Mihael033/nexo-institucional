using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Nexo.Api.Endpoints;
using Nexo.Api.Infrastructure;
using Nexo.Application;
using Nexo.Application.Common;
using Nexo.Domain.Identity;
using Nexo.Infrastructure;
using Nexo.Infrastructure.Persistence;
using Nexo.Infrastructure.Security;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, logger) => logger
    .ReadFrom.Configuration(context.Configuration)
    .Enrich.FromLogContext());

// JSON bodies are small; only the CSV import endpoint raises this limit.
builder.Services.Configure<KestrelServerOptions>(kestrel => kestrel.Limits.MaxRequestBodySize = 1024 * 1024);

builder.Services.Configure<SiteOptions>(builder.Configuration.GetSection(SiteOptions.SectionName));
builder.Services.Configure<AuthCookieOptions>(builder.Configuration.GetSection(AuthCookieOptions.SectionName));
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration, builder.Environment);

builder.Services.AddAuthorizationBuilder().AddPermissionPolicies();
builder.Services.AddApiRateLimiting(builder.Configuration);
builder.Services.AddProblemDetails(options => options.CustomizeProblemDetails = GlobalExceptionHandler.Customize);
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower));
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
});
builder.Services.AddCors(options => options.AddPolicy("web", policy => policy
    .WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:3000"])
    .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE")
    .WithHeaders("Authorization", "Content-Type", "Accept")
    .WithExposedHeaders("Retry-After", "Location", "Content-Disposition")
    .AllowCredentials()
    .SetPreflightMaxAge(TimeSpan.FromMinutes(10))));
builder.Services.AddHealthChecks().AddDbContextCheck<AppDbContext>("database");
builder.Services.AddNexoOpenApi();

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseMiddleware<SecurityHeadersMiddleware>();
if (!app.Environment.IsDevelopment() && !app.Environment.IsEnvironment("Testing"))
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseSerilogRequestLogging();
app.UseCors("web");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

if (app.Configuration.GetValue("OpenApi:Enabled", app.Environment.IsDevelopment()))
{
    app.MapOpenApi("/openapi/{documentName}.json");
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "Nexo Institucional API v1");
        options.RoutePrefix = "swagger";
        options.DocumentTitle = "Nexo Institucional API";
    });
}

app.MapHealthChecks("/health");
var api = app.MapGroup("/api/v1");
api.MapAuthEndpoints();
api.MapPublicEndpoints();
api.MapAdminEndpoints();

var signingKey = app.Services.GetRequiredService<JwtSigningKey>();
if (signingKey.IsEphemeral)
{
    app.Logger.LogWarning("Jwt:SigningKey not configured: using an ephemeral development key.");
}

await app.Services.InitializeDatabaseAsync(app.Configuration);
await app.RunAsync();

/// <summary>Entry point (public for WebApplicationFactory in integration tests).</summary>
public partial class Program
{
}

internal static class PermissionPolicies
{
    /// <summary>One authorization policy per permission, checked against the "perm" claims of the JWT.</summary>
    public static AuthorizationBuilder AddPermissionPolicies(this AuthorizationBuilder builder)
    {
        foreach (var permission in Permissions.All)
        {
            builder.AddPolicy(permission, policy => policy.RequireAuthenticatedUser().RequireClaim(JwtTokenService.PermissionClaim, permission));
        }

        return builder;
    }
}
