using Nexo.Domain.Common;

namespace Nexo.Domain.Identity;

public static class Permissions
{
    public const string DashboardRead = "dashboard.read";
    public const string ProductsRead = "products.read";
    public const string ProductsWrite = "products.write";
    public const string ProductsImport = "products.import";
    public const string CategoriesWrite = "categories.write";
    public const string MessagesRead = "messages.read";
    public const string MessagesWrite = "messages.write";
    public const string UsersRead = "users.read";
    public const string AuditRead = "audit.read";

    public static readonly IReadOnlyList<string> All =
    [
        DashboardRead, ProductsRead, ProductsWrite, ProductsImport, CategoriesWrite,
        MessagesRead, MessagesWrite, UsersRead, AuditRead,
    ];
}

public sealed class Role : Entity
{
    public const string Admin = "Admin";
    public const string Editor = "Editor";

    private readonly List<RolePermission> _permissions = [];

    private Role()
    {
    }

    public Role(string name, string description, IEnumerable<string> permissions)
    {
        Name = name;
        Description = description;
        foreach (var permission in permissions.Distinct(StringComparer.Ordinal))
        {
            if (!Identity.Permissions.All.Contains(permission))
            {
                throw new DomainException($"Unknown permission '{permission}'.");
            }

            _permissions.Add(new RolePermission(permission));
        }
    }

    public string Name { get; private set; } = string.Empty;

    public string Description { get; private set; } = string.Empty;

    public IReadOnlyList<RolePermission> Permissions => _permissions;
}

public sealed class RolePermission
{
    private RolePermission()
    {
    }

    internal RolePermission(string permission) => Permission = permission;

    public int RoleId { get; private set; }

    public string Permission { get; private set; } = string.Empty;
}

public sealed class User : Entity, IAuditable
{
    public const int MaxFailedAttempts = 5;
    public static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

    private User()
    {
    }

    public User(string name, string email, string passwordHash, Role role, DateTime createdAt)
    {
        Name = name;
        Email = NormalizeEmail(email);
        PasswordHash = passwordHash;
        Role = role;
        CreatedAt = createdAt;
        IsActive = true;
    }

    public string Name { get; private set; } = string.Empty;

    /// <summary>Always stored lowercase.</summary>
    public string Email { get; private set; } = string.Empty;

    [AuditIgnore]
    public string PasswordHash { get; private set; } = string.Empty;

    public int RoleId { get; private set; }

    public Role Role { get; private set; } = null!;

    public bool IsActive { get; private set; }

    [AuditIgnore]
    public int FailedLoginCount { get; private set; }

    [AuditIgnore]
    public DateTime? LockoutEnd { get; private set; }

    [AuditIgnore]
    public DateTime? LastLoginAt { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public string AuditLabel => Email;

    public static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    public bool IsLockedOut(DateTime now) => LockoutEnd is { } end && end > now;

    /// <summary>Counts a failed login; locks the account after <see cref="MaxFailedAttempts"/> in a row.</summary>
    /// <returns>True when this failure locked the account.</returns>
    public bool RegisterFailedLogin(DateTime now)
    {
        FailedLoginCount++;
        if (FailedLoginCount < MaxFailedAttempts)
        {
            return false;
        }

        FailedLoginCount = 0;
        LockoutEnd = now.Add(LockoutDuration);
        return true;
    }

    public void RegisterSuccessfulLogin(DateTime now)
    {
        FailedLoginCount = 0;
        LockoutEnd = null;
        LastLoginAt = now;
    }
}

/// <summary>
/// Opaque refresh token (only its SHA-256 hash is stored). Tokens rotate on every use;
/// all tokens issued from the same login share a family so reuse can revoke the whole chain.
/// </summary>
public sealed class RefreshToken : Entity
{
    private RefreshToken()
    {
    }

    public RefreshToken(int userId, string tokenHash, Guid familyId, DateTime createdAt, DateTime expiresAt, string? createdByIp)
    {
        UserId = userId;
        TokenHash = tokenHash;
        FamilyId = familyId;
        CreatedAt = createdAt;
        ExpiresAt = expiresAt;
        CreatedByIp = createdByIp;
    }

    public int UserId { get; private set; }

    public User User { get; private set; } = null!;

    public string TokenHash { get; private set; } = string.Empty;

    public Guid FamilyId { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime ExpiresAt { get; private set; }

    public DateTime? RevokedAt { get; private set; }

    public string? RevokedReason { get; private set; }

    public string? CreatedByIp { get; private set; }

    public bool IsActive(DateTime now) => RevokedAt is null && ExpiresAt > now;

    public void Revoke(DateTime now, string reason)
    {
        if (RevokedAt is not null)
        {
            return;
        }

        RevokedAt = now;
        RevokedReason = reason;
    }
}
