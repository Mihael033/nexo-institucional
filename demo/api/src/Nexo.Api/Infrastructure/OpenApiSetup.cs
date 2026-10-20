using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi;

namespace Nexo.Api.Infrastructure;

internal static class OpenApiSetup
{
    private const string Scheme = "Bearer";

    public static IServiceCollection AddNexoOpenApi(this IServiceCollection services) =>
        services.AddOpenApi(options =>
        {
            options.AddDocumentTransformer((document, _, _) =>
            {
                document.Info = new OpenApiInfo
                {
                    Title = "Nexo Institucional API",
                    Version = "v1",
                    Description = "API de la plataforma institucional (demo). Contrato humano: demo/CONTRATO-API.md.",
                };
                document.Components ??= new OpenApiComponents();
                document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
                document.Components.SecuritySchemes[Scheme] = new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    Description = "Access token devuelto por POST /api/v1/auth/login.",
                };
                return Task.CompletedTask;
            });

            options.AddOperationTransformer((operation, context, _) =>
            {
                var requiresAuth = context.Description.ActionDescriptor.EndpointMetadata.OfType<IAuthorizeData>().Any();
                if (requiresAuth)
                {
                    operation.Security ??= [];
                    operation.Security.Add(new OpenApiSecurityRequirement
                    {
                        [new OpenApiSecuritySchemeReference(Scheme, context.Document)] = [],
                    });
                }

                return Task.CompletedTask;
            });
        });
}
