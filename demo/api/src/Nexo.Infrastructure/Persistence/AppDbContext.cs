using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Nexo.Application.Common;
using Nexo.Domain.Auditing;
using Nexo.Domain.Catalog;
using Nexo.Domain.Content;
using Nexo.Domain.Identity;
using Nexo.Domain.Imports;
using Nexo.Domain.Messaging;
using Nexo.Infrastructure.Persistence.Auditing;

namespace Nexo.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options, ICurrentUser? currentUser = null, TimeProvider? clock = null)
    : DbContext(options), IAppDbContext
{
    public DbSet<Category> Categories => Set<Category>();

    public DbSet<Product> Products => Set<Product>();

    public DbSet<ProductImage> ProductImages => Set<ProductImage>();

    public DbSet<ProductAttribute> ProductAttributes => Set<ProductAttribute>();

    public DbSet<AttributeDefinition> AttributeDefinitions => Set<AttributeDefinition>();

    public DbSet<NewsArticle> News => Set<NewsArticle>();

    public DbSet<Page> Pages => Set<Page>();

    public DbSet<ContactMessage> ContactMessages => Set<ContactMessage>();

    public DbSet<User> Users => Set<User>();

    public DbSet<Role> Roles => Set<Role>();

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<AuditEntry> AuditEntries => Set<AuditEntry>();

    public DbSet<ImportBatch> ImportBatches => Set<ImportBatch>();

    /// <summary>Seeding writes its own curated audit history, so automatic auditing can be switched off.</summary>
    internal bool SuppressAuditing { get; set; }

    public override int SaveChanges(bool acceptAllChangesOnSuccess) =>
        throw new NotSupportedException("Use SaveChangesAsync: auditing runs inside an async transaction.");

    public override async Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        AuditTrail.EnsureImmutability(ChangeTracker);
        if (SuppressAuditing)
        {
            return await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken).ConfigureAwait(false);
        }

        var pending = AuditTrail.Capture(ChangeTracker);
        if (pending.Count == 0)
        {
            return await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken).ConfigureAwait(false);
        }

        // Entity changes and their audit rows commit atomically. Ids of new rows are known only after
        // the first save, so audit rows are written in a second save inside the same transaction.
        var ownTransaction = Database.CurrentTransaction is null
            ? await Database.BeginTransactionAsync(cancellationToken).ConfigureAwait(false)
            : null;
        try
        {
            var written = await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken).ConfigureAwait(false);
            var actor = currentUser?.ToActor() ?? AuditActor.System;
            var now = (clock ?? TimeProvider.System).GetUtcNow().UtcDateTime;
            AuditEntries.AddRange(pending.Select(p => p.ToEntry(actor, now)));
            written += await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken).ConfigureAwait(false);
            if (ownTransaction is not null)
            {
                await ownTransaction.CommitAsync(cancellationToken).ConfigureAwait(false);
            }

            return written;
        }
        finally
        {
            if (ownTransaction is not null)
            {
                await ownTransaction.DisposeAsync().ConfigureAwait(false);
            }
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        var price = modelBuilder.Entity<Product>().Property(p => p.PriceBs);
        if (Database.IsSqlite())
        {
            // SQLite has no decimal type (cannot sort/compare it): store cents as INTEGER.
            price.HasConversion(v => (long)(v * 100m), v => v / 100m);
        }
        else
        {
            price.HasPrecision(18, 2);
        }
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // Everything is stored in UTC; make sure values read back are flagged as UTC (serialized with "Z").
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
        configurationBuilder.Properties<DateTime?>().HaveConversion<NullableUtcDateTimeConverter>();
    }

    private sealed class UtcDateTimeConverter() : ValueConverter<DateTime, DateTime>(
        v => v.Kind == DateTimeKind.Utc ? v : v.ToUniversalTime(),
        v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

    private sealed class NullableUtcDateTimeConverter() : ValueConverter<DateTime?, DateTime?>(
        v => v == null ? v : v.Value.Kind == DateTimeKind.Utc ? v : v.Value.ToUniversalTime(),
        v => v == null ? v : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc));
}
