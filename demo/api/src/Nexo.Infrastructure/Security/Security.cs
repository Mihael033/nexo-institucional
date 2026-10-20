using System.Globalization;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Nexo.Application.Common;
using Nexo.Domain.Identity;

namespace Nexo.Infrastructure.Security;

public sealed class SecurityOptions
{
    public const string SectionName = "Security";

    /// <summary>PBKDF2 iterations for new hashes (OWASP 2023+ recommends 210,000 for HMAC-SHA512).</summary>
    public int PasswordHashIterations { get; set; } = 210_000;
}

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "nexo-api";

    public string Audience { get; set; } = "nexo-web";

    /// <summary>HMAC key (≥ 32 bytes). Comes from user-secrets / environment, never from source control.</summary>
    public string? SigningKey { get; set; }

    public int AccessTokenMinutes { get; set; } = 15;

    public int RefreshTokenDays { get; set; } = 7;
}

/// <summary>Resolved signing key shared by token creation and validation.</summary>
public sealed class JwtSigningKey(SymmetricSecurityKey key, bool isEphemeral)
{
    public SymmetricSecurityKey Key { get; } = key;

    public bool IsEphemeral { get; } = isEphemeral;

    public static JwtSigningKey Create(JwtOptions options, bool allowEphemeral)
    {
        ArgumentNullException.ThrowIfNull(options);
        if (!string.IsNullOrWhiteSpace(options.SigningKey))
        {
            var bytes = Encoding.UTF8.GetBytes(options.SigningKey);
            if (bytes.Length < 32)
            {
                throw new InvalidOperationException("Jwt:SigningKey must be at least 32 bytes.");
            }

            return new JwtSigningKey(new SymmetricSecurityKey(bytes), false);
        }

        if (!allowEphemeral)
        {
            throw new InvalidOperationException("Jwt:SigningKey is required outside Development. Configure it via environment variable Jwt__SigningKey or a secret store.");
        }

        // Development only: random per-process key. Access tokens die on restart; refresh tokens (DB) survive.
        return new JwtSigningKey(new SymmetricSecurityKey(RandomNumberGenerator.GetBytes(64)), true);
    }
}

/// <summary>PBKDF2-HMAC-SHA512 with per-password salt. Format: pbkdf2-sha512$iterations$salt$hash.</summary>
public sealed class Pbkdf2PasswordHasher(IOptions<SecurityOptions> options) : IPasswordHasher
{
    private const string Prefix = "pbkdf2-sha512";
    private const int SaltSize = 16;
    private const int HashSize = 32;

    public string Hash(string password)
    {
        ArgumentNullException.ThrowIfNull(password);
        var iterations = Math.Max(1, options.Value.PasswordHashIterations);
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA512, HashSize);
        return string.Join('$', Prefix, iterations.ToString(CultureInfo.InvariantCulture), Convert.ToBase64String(salt), Convert.ToBase64String(hash));
    }

    public bool Verify(string password, string hash)
    {
        ArgumentNullException.ThrowIfNull(password);
        ArgumentNullException.ThrowIfNull(hash);
        var parts = hash.Split('$');
        if (parts.Length != 4 || parts[0] != Prefix || !int.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out var iterations) || iterations < 1)
        {
            return false;
        }

        try
        {
            var salt = Convert.FromBase64String(parts[2]);
            var expected = Convert.FromBase64String(parts[3]);
            var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA512, expected.Length);
            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}

public sealed class JwtTokenService(IOptions<JwtOptions> options, JwtSigningKey signingKey, TimeProvider clock) : ITokenService
{
    public const string PermissionClaim = "perm";

    public TimeSpan RefreshTokenLifetime => TimeSpan.FromDays(options.Value.RefreshTokenDays);

    public AccessToken CreateAccessToken(User user, IReadOnlyCollection<string> permissions)
    {
        ArgumentNullException.ThrowIfNull(user);
        ArgumentNullException.ThrowIfNull(permissions);
        var jwt = options.Value;
        var now = clock.GetUtcNow().UtcDateTime;
        var lifetime = TimeSpan.FromMinutes(jwt.AccessTokenMinutes);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString(CultureInfo.InvariantCulture)),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Name, user.Name),
            new("role", user.Role.Name),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
        };
        claims.AddRange(permissions.Select(p => new Claim(PermissionClaim, p)));

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = jwt.Issuer,
            Audience = jwt.Audience,
            Subject = new ClaimsIdentity(claims),
            IssuedAt = now,
            NotBefore = now,
            Expires = now.Add(lifetime),
            SigningCredentials = new SigningCredentials(signingKey.Key, SecurityAlgorithms.HmacSha256),
        };
        return new AccessToken(new JsonWebTokenHandler().CreateToken(descriptor), (int)lifetime.TotalSeconds);
    }

    public RefreshTokenMaterial CreateRefreshToken()
    {
        var raw = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));
        return new RefreshTokenMaterial(raw, HashRefreshToken(raw));
    }

    public string HashRefreshToken(string rawToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
}
