namespace Nexo.Application.Common;

/// <summary>Expected failure that maps to a ProblemDetails response (status + stable code).</summary>
public abstract class AppException(int status, string code, string title, string detail) : Exception(detail)
{
    public int Status { get; } = status;

    public string Code { get; } = code;

    public string Title { get; } = title;

    public IDictionary<string, object?> Extensions { get; } = new Dictionary<string, object?>();
}

public sealed class BadRequestException(string detail)
    : AppException(400, "bad_request", "Solicitud inválida", detail);

public sealed class NotFoundException(string detail = "El recurso solicitado no existe.")
    : AppException(404, "not_found", "No encontrado", detail);

public sealed class ConflictException(string detail)
    : AppException(409, "conflict", "Conflicto", detail);

public sealed class ForbiddenException(string detail = "No tiene permiso para realizar esta acción.")
    : AppException(403, "forbidden", "Acceso denegado", detail);

public sealed class GoneException(string code, string detail)
    : AppException(410, code, "Ya no disponible", detail);

public sealed class InvalidCredentialsException()
    : AppException(401, "auth.invalid_credentials", "Credenciales inválidas", "Correo electrónico o contraseña incorrectos.");

public sealed class InvalidRefreshTokenException()
    : AppException(401, "auth.invalid_refresh", "Sesión expirada", "Su sesión expiró. Inicie sesión nuevamente.");

public sealed class LockedOutException : AppException
{
    public LockedOutException(DateTime lockoutEnd)
        : base(423, "auth.locked_out", "Cuenta bloqueada", "La cuenta está bloqueada temporalmente por demasiados intentos fallidos. Intente más tarde.")
    {
        Extensions["lockoutEnd"] = lockoutEnd;
    }
}
