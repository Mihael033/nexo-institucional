using System.Globalization;
using System.Security.Claims;
using Nexo.Application.Common;
using Nexo.Infrastructure.Security;

namespace Nexo.Api.Infrastructure;

/// <summary>Current caller resolved from the JWT claims and the HTTP connection.</summary>
internal sealed class HttpCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public int? UserId =>
        int.TryParse(Principal?.FindFirstValue("sub"), NumberStyles.None, CultureInfo.InvariantCulture, out var id) ? id : null;

    public string? Name => Principal?.FindFirstValue("name");

    public string? Email => Principal?.FindFirstValue("email");

    public string? IpAddress => accessor.HttpContext?.Connection.RemoteIpAddress?.ToString();

    public string? UserAgent
    {
        get
        {
            var value = accessor.HttpContext?.Request.Headers.UserAgent.ToString();
            return string.IsNullOrEmpty(value) ? null : value.Length > 300 ? value[..300] : value;
        }
    }

    public bool HasPermission(string permission) =>
        Principal?.HasClaim(JwtTokenService.PermissionClaim, permission) ?? false;
}
