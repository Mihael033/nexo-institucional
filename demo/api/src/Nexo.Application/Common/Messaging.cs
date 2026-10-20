using System.Collections.Concurrent;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.DependencyInjection;

namespace Nexo.Application.Common;

#pragma warning disable CA1040 // Marker interface is intentional: it carries the response type.
public interface IRequest<TResponse>
{
}
#pragma warning restore CA1040

public interface IRequestHandler<in TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    Task<TResponse> Handle(TRequest request, CancellationToken cancellationToken);
}

/// <summary>Light CQRS dispatcher: validates the request (FluentValidation) and runs its handler.</summary>
public interface ISender
{
    Task<TResponse> Send<TResponse>(IRequest<TResponse> request, CancellationToken cancellationToken = default);
}

public readonly record struct Unit
{
    public static readonly Unit Value;
}

internal sealed class Sender(IServiceProvider services) : ISender
{
    private static readonly ConcurrentDictionary<Type, object> Pipelines = new();

    public Task<TResponse> Send<TResponse>(IRequest<TResponse> request, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        var pipeline = (Pipeline<TResponse>)Pipelines.GetOrAdd(
            request.GetType(),
            static type => Activator.CreateInstance(typeof(Pipeline<,>).MakeGenericType(type, typeof(TResponse)))!);
        return pipeline.Run(request, services, cancellationToken);
    }

    private abstract class Pipeline<TResponse>
    {
        public abstract Task<TResponse> Run(object request, IServiceProvider services, CancellationToken cancellationToken);
    }

#pragma warning disable CA1812 // Instantiated through reflection.
    private sealed class Pipeline<TRequest, TResponse> : Pipeline<TResponse>
#pragma warning restore CA1812
        where TRequest : IRequest<TResponse>
    {
        public override async Task<TResponse> Run(object request, IServiceProvider services, CancellationToken cancellationToken)
        {
            var typed = (TRequest)request;
            var failures = new List<ValidationFailure>();
            foreach (var validator in services.GetServices<IValidator<TRequest>>())
            {
                var result = await validator.ValidateAsync(typed, cancellationToken).ConfigureAwait(false);
                failures.AddRange(result.Errors);
            }

            if (failures.Count > 0)
            {
                throw new ValidationException(failures);
            }

            var handler = services.GetRequiredService<IRequestHandler<TRequest, TResponse>>();
            return await handler.Handle(typed, cancellationToken).ConfigureAwait(false);
        }
    }
}
