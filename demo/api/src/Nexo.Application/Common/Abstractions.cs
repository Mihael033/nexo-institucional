using Microsoft.EntityFrameworkCore;
using Nexo.Domain.Auditing;
using Nexo.Domain.Catalog;
using Nexo.Domain.Content;
using Nexo.Domain.Identity;
using Nexo.Domain.Imports;
using Nexo.Domain.Messaging;

namespace Nexo.Application.Common;

public interface IAppDbContext
{
    DbSet<Category> Categories { get; }

    DbSet<Product> Products { get; }

    DbSet<ProductImage> ProductImages { get; }

    DbSet<ProductAttribute> ProductAttributes { get; }

    DbSet<AttributeDefinition> AttributeDefinitions { get; }

    DbSet<NewsArticle> News { get; }

    DbSet<Page> Pages { get; }

    DbSet<ContactMessage> ContactMessages { get; }

    DbSet<User> Users { get; }

    DbSet<Role> Roles { get; }

    DbSet<RefreshToken> RefreshTokens { get; }

    DbSet<AuditEntry> AuditEntries { get; }

    DbSet<ImportBatch> ImportBatches { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

/// <summary>Who is calling: authenticated user (if any) plus request metadata for auditing.</summary>
public interface ICurrentUser
{
    int? UserId { get; }

    string? Name { get; }

    string? Email { get; }

    string? IpAddress { get; }

    string? UserAgent { get; }

    bool HasPermission(string permission);

    AuditActor ToActor() => UserId is null
        ? new AuditActor(null, null, null, IpAddress, UserAgent)
        : new AuditActor(UserId, Name, Email, IpAddress, UserAgent);
}

public interface IPasswordHasher
{
    string Hash(string password);

    bool Verify(string password, string hash);
}

public sealed record AccessToken(string Token, int ExpiresInSeconds);

public sealed record RefreshTokenMaterial(string RawToken, string Hash);

public interface ITokenService
{
    TimeSpan RefreshTokenLifetime { get; }

    AccessToken CreateAccessToken(User user, IReadOnlyCollection<string> permissions);

    RefreshTokenMaterial CreateRefreshToken();

    string HashRefreshToken(string rawToken);
}
