using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Nexo.Application.Common;
using Nexo.Application.Products;

namespace Nexo.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = typeof(DependencyInjection).Assembly;
        services.AddScoped<ISender, Sender>();
        services.AddScoped<ProductReader>();

        // Register every IRequestHandler<,> implementation (one class may handle several requests).
        foreach (var type in assembly.GetTypes().Where(t => t is { IsClass: true, IsAbstract: false }))
        {
            foreach (var contract in type.GetInterfaces().Where(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IRequestHandler<,>)))
            {
                services.AddScoped(contract, type);
            }
        }

        // Validators with constructor arguments are composed via Include/SetValidator, not resolved directly.
        services.AddValidatorsFromAssembly(assembly, ServiceLifetime.Singleton, filter: r => r.ValidatorType.GetConstructor(Type.EmptyTypes) is not null, includeInternalTypes: true);
        ValidatorOptions.Global.DefaultClassLevelCascadeMode = CascadeMode.Continue;
        ValidatorOptions.Global.DefaultRuleLevelCascadeMode = CascadeMode.Stop;

        return services;
    }
}
