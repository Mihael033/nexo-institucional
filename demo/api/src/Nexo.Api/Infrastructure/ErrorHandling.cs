using System.Diagnostics;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Nexo.Application.Common;
using Nexo.Domain.Common;

namespace Nexo.Api.Infrastructure;

/// <summary>Maps exceptions to RFC 9457 ProblemDetails with a stable <c>code</c> extension.</summary>
internal sealed partial class GlobalExceptionHandler(IProblemDetailsService problemDetails, ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var problem = exception switch
        {
            ValidationException validation => ValidationProblem(validation),
            AppException app => FromAppException(app),
            BadHttpRequestException bad => new ProblemDetails
            {
                Status = bad.StatusCode,
                Detail = bad.StatusCode == StatusCodes.Status413PayloadTooLarge
                    ? "La solicitud supera el tamaño máximo permitido."
                    : "La solicitud no tiene un formato válido.",
                Extensions = { ["code"] = "bad_request" },
            },
            DomainException domain => new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Detail = domain.Message,
                Extensions = { ["code"] = "bad_request" },
            },
            _ => null,
        };

        if (problem is null)
        {
            LogUnhandled(logger, exception);
            problem = new ProblemDetails
            {
                Status = StatusCodes.Status500InternalServerError,
                Detail = "Ocurrió un error inesperado. Intente nuevamente.",
                Extensions = { ["code"] = "server_error" },
            };
        }

        httpContext.Response.StatusCode = problem.Status ?? StatusCodes.Status500InternalServerError;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problem,
            Exception = exception,
        }).ConfigureAwait(false);
    }

    /// <summary>Fills title, type, instance, code and traceId on every ProblemDetails the API writes.</summary>
    public static void Customize(ProblemDetailsContext context)
    {
        var problem = context.ProblemDetails;
        var status = problem.Status ?? context.HttpContext.Response.StatusCode;
        problem.Status = status;
        problem.Type ??= $"https://httpstatuses.io/{status}";
        problem.Instance ??= context.HttpContext.Request.Path;
        if (problem.Title is null || problem.Title.StartsWith("One or more", StringComparison.Ordinal) || problem.Title == ReasonPhrase(status))
        {
            problem.Title = TitleFor(status);
        }

        problem.Detail ??= DetailFor(status);
        problem.Extensions.TryAdd("code", CodeFor(status));
        problem.Extensions["traceId"] = Activity.Current?.Id ?? context.HttpContext.TraceIdentifier;
        problem.Extensions.Remove("exception");
    }

    private static ProblemDetails ValidationProblem(ValidationException exception)
    {
        var errors = exception.Errors
            .GroupBy(e => ToFieldName(e.PropertyName), StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).Distinct(StringComparer.Ordinal).ToArray(), StringComparer.Ordinal);
        return new ProblemDetails
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Datos inválidos",
            Detail = "Uno o más campos no son válidos.",
            Extensions =
            {
                ["code"] = "validation_failed",
                ["errors"] = errors,
            },
        };
    }

    private static ProblemDetails FromAppException(AppException exception)
    {
        var problem = new ProblemDetails
        {
            Status = exception.Status,
            Title = exception.Title,
            Detail = exception.Message,
            Extensions = { ["code"] = exception.Code },
        };
        foreach (var (key, value) in exception.Extensions)
        {
            problem.Extensions[key] = value;
        }

        return problem;
    }

    /// <summary>"Body.Images[0]" → "images[0]": request field names as the client sent them.</summary>
    internal static string ToFieldName(string propertyName)
    {
        var path = propertyName.StartsWith("Body.", StringComparison.Ordinal) ? propertyName[5..] : propertyName;
        return string.Join('.', path.Split('.').Select(segment => segment.Length == 0 ? segment : char.ToLowerInvariant(segment[0]) + segment[1..]));
    }

    private static string TitleFor(int status) => status switch
    {
        400 => "Solicitud inválida",
        401 => "No autenticado",
        403 => "Acceso denegado",
        404 => "No encontrado",
        405 => "Método no permitido",
        409 => "Conflicto",
        410 => "Ya no disponible",
        413 => "Solicitud demasiado grande",
        415 => "Tipo de contenido no admitido",
        423 => "Cuenta bloqueada",
        429 => "Demasiadas solicitudes",
        _ => status >= 500 ? "Error del servidor" : "Error",
    };

    private static string? DetailFor(int status) => status switch
    {
        401 => "Debe iniciar sesión para continuar.",
        403 => "No tiene permiso para realizar esta acción.",
        404 => "El recurso solicitado no existe.",
        405 => "El método HTTP no está permitido para este recurso.",
        429 => "Realizó demasiadas solicitudes. Espere un momento e intente nuevamente.",
        _ => null,
    };

    private static string CodeFor(int status) => status switch
    {
        400 or 413 or 415 => "bad_request",
        401 => "unauthorized",
        403 => "forbidden",
        404 => "not_found",
        405 => "method_not_allowed",
        409 => "conflict",
        429 => "rate_limited",
        _ => status >= 500 ? "server_error" : "error",
    };

    private static string? ReasonPhrase(int status) => Microsoft.AspNetCore.WebUtilities.ReasonPhrases.GetReasonPhrase(status);

    [LoggerMessage(Level = LogLevel.Error, Message = "Unhandled exception")]
    private static partial void LogUnhandled(ILogger logger, Exception exception);
}
