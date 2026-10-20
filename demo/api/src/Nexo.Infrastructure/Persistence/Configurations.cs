using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nexo.Domain.Auditing;
using Nexo.Domain.Catalog;
using Nexo.Domain.Content;
using Nexo.Domain.Identity;
using Nexo.Domain.Imports;
using Nexo.Domain.Messaging;

namespace Nexo.Infrastructure.Persistence;

internal sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.Property(c => c.Name).HasMaxLength(80).IsRequired();
        builder.Property(c => c.Slug).HasMaxLength(100).IsRequired();
        builder.Property(c => c.Description).HasMaxLength(300);
        builder.HasIndex(c => c.Slug).IsUnique();
        builder.Ignore(c => c.AuditLabel);
    }
}

internal sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.Property(p => p.Name).HasMaxLength(150).IsRequired();
        builder.Property(p => p.Slug).HasMaxLength(160).IsRequired();
        builder.Property(p => p.Brand).HasMaxLength(80).IsRequired();
        builder.Property(p => p.Description).HasMaxLength(4000).IsRequired();
        builder.Property(p => p.SearchText).HasMaxLength(4400).IsRequired();
        builder.Property(p => p.NormalizedName).HasMaxLength(150).IsRequired();
        builder.Ignore(p => p.AuditLabel);

        builder.HasOne(p => p.Category).WithMany().HasForeignKey(p => p.CategoryId).OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(p => p.Images).WithOne().HasForeignKey(i => i.ProductId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(p => p.Attributes).WithOne().HasForeignKey(a => a.ProductId).OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(p => p.Images).UsePropertyAccessMode(PropertyAccessMode.Field);
        builder.Navigation(p => p.Attributes).UsePropertyAccessMode(PropertyAccessMode.Field);

        // Catalog listing: active products filtered by category / availability, sorted by date, price or name.
        builder.HasIndex(p => p.Slug).IsUnique();
        builder.HasIndex(p => new { p.IsDeleted, p.CategoryId, p.CreatedAt });
        builder.HasIndex(p => new { p.IsDeleted, p.PriceBs });
        builder.HasIndex(p => new { p.IsDeleted, p.NormalizedName });
        builder.HasIndex(p => new { p.IsDeleted, p.IsFeatured });
        builder.HasIndex(p => p.Brand);
    }
}

internal sealed class ProductImageConfiguration : IEntityTypeConfiguration<ProductImage>
{
    public void Configure(EntityTypeBuilder<ProductImage> builder)
    {
        builder.Property(i => i.Url).HasMaxLength(500).IsRequired();
        builder.Property(i => i.Alt).HasMaxLength(200).IsRequired();
        builder.HasIndex(i => new { i.ProductId, i.SortOrder });
    }
}

internal sealed class ProductAttributeConfiguration : IEntityTypeConfiguration<ProductAttribute>
{
    public void Configure(EntityTypeBuilder<ProductAttribute> builder)
    {
        builder.Property(a => a.Key).HasMaxLength(40).IsRequired();
        builder.Property(a => a.Value).HasMaxLength(100).IsRequired();
        builder.HasIndex(a => new { a.ProductId, a.Key }).IsUnique();
        builder.HasIndex(a => new { a.Key, a.Value });
    }
}

internal sealed class AttributeDefinitionConfiguration : IEntityTypeConfiguration<AttributeDefinition>
{
    public void Configure(EntityTypeBuilder<AttributeDefinition> builder)
    {
        builder.HasKey(d => d.Key);
        builder.Property(d => d.Key).HasMaxLength(40);
        builder.Property(d => d.Label).HasMaxLength(80).IsRequired();
    }
}

internal sealed class NewsConfiguration : IEntityTypeConfiguration<NewsArticle>
{
    public void Configure(EntityTypeBuilder<NewsArticle> builder)
    {
        builder.ToTable("News");
        builder.Property(n => n.Slug).HasMaxLength(160).IsRequired();
        builder.Property(n => n.Title).HasMaxLength(200).IsRequired();
        builder.Property(n => n.Excerpt).HasMaxLength(400).IsRequired();
        builder.Property(n => n.Html).IsRequired();
        builder.Property(n => n.CoverImageUrl).HasMaxLength(500).IsRequired();
        builder.Property(n => n.CoverImageAlt).HasMaxLength(200).IsRequired();
        builder.Property(n => n.Author).HasMaxLength(100).IsRequired();
        builder.Property(n => n.Tags).HasMaxLength(300).IsRequired();
        builder.Ignore(n => n.TagList);
        builder.HasIndex(n => n.Slug).IsUnique();
        builder.HasIndex(n => n.PublishedAt);
    }
}

internal sealed class PageConfiguration : IEntityTypeConfiguration<Page>
{
    public void Configure(EntityTypeBuilder<Page> builder)
    {
        builder.Property(p => p.Slug).HasMaxLength(100).IsRequired();
        builder.Property(p => p.Title).HasMaxLength(150).IsRequired();
        builder.Property(p => p.SeoTitle).HasMaxLength(150).IsRequired();
        builder.Property(p => p.SeoDescription).HasMaxLength(300).IsRequired();
        builder.Property(p => p.OgImageUrl).HasMaxLength(500);
        builder.Property(p => p.BlocksJson).IsRequired();
        builder.HasIndex(p => p.Slug).IsUnique();
    }
}

internal sealed class ContactMessageConfiguration : IEntityTypeConfiguration<ContactMessage>
{
    public void Configure(EntityTypeBuilder<ContactMessage> builder)
    {
        builder.Property(m => m.Name).HasMaxLength(100).IsRequired();
        builder.Property(m => m.Email).HasMaxLength(150).IsRequired();
        builder.Property(m => m.Phone).HasMaxLength(30);
        builder.Property(m => m.Organization).HasMaxLength(150);
        builder.Property(m => m.Subject).HasMaxLength(150).IsRequired();
        builder.Property(m => m.Message).HasMaxLength(2000).IsRequired();
        builder.Property(m => m.ReadBy).HasMaxLength(100);
        builder.Property(m => m.IpAddress).HasMaxLength(45);
        builder.Ignore(m => m.AuditLabel);
        builder.HasIndex(m => new { m.IsRead, m.CreatedAt });
        builder.HasIndex(m => m.CreatedAt);
    }
}

internal sealed class RoleConfiguration : IEntityTypeConfiguration<Role>
{
    public void Configure(EntityTypeBuilder<Role> builder)
    {
        builder.Property(r => r.Name).HasMaxLength(50).IsRequired();
        builder.Property(r => r.Description).HasMaxLength(200).IsRequired();
        builder.HasIndex(r => r.Name).IsUnique();
        builder.HasMany(r => r.Permissions).WithOne().HasForeignKey(p => p.RoleId).OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(r => r.Permissions).UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

internal sealed class RolePermissionConfiguration : IEntityTypeConfiguration<RolePermission>
{
    public void Configure(EntityTypeBuilder<RolePermission> builder)
    {
        builder.HasKey(p => new { p.RoleId, p.Permission });
        builder.Property(p => p.Permission).HasMaxLength(50);
    }
}

internal sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.Property(u => u.Name).HasMaxLength(100).IsRequired();
        builder.Property(u => u.Email).HasMaxLength(150).IsRequired();
        builder.Property(u => u.PasswordHash).HasMaxLength(300).IsRequired();
        builder.Ignore(u => u.AuditLabel);
        builder.HasOne(u => u.Role).WithMany().HasForeignKey(u => u.RoleId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(u => u.Email).IsUnique();
    }
}

internal sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.Property(t => t.TokenHash).HasMaxLength(64).IsRequired();
        builder.Property(t => t.RevokedReason).HasMaxLength(30);
        builder.Property(t => t.CreatedByIp).HasMaxLength(45);
        builder.HasOne(t => t.User).WithMany().HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(t => t.TokenHash).IsUnique();
        builder.HasIndex(t => t.FamilyId);
    }
}

internal sealed class AuditEntryConfiguration : IEntityTypeConfiguration<AuditEntry>
{
    public void Configure(EntityTypeBuilder<AuditEntry> builder)
    {
        builder.ToTable("AuditEntries");
        builder.Property(a => a.Action).HasConversion<string>().HasMaxLength(20);
        builder.Property(a => a.EntityType).HasMaxLength(40).IsRequired();
        builder.Property(a => a.EntityId).HasMaxLength(64);
        builder.Property(a => a.Summary).HasMaxLength(500).IsRequired();
        builder.Property(a => a.UserName).HasMaxLength(100);
        builder.Property(a => a.UserEmail).HasMaxLength(150);
        builder.Property(a => a.IpAddress).HasMaxLength(45);
        builder.Property(a => a.UserAgent).HasMaxLength(300);
        builder.HasIndex(a => a.OccurredAt);
        builder.HasIndex(a => new { a.EntityType, a.EntityId });
        builder.HasIndex(a => new { a.UserId, a.OccurredAt });
        builder.HasIndex(a => new { a.Action, a.OccurredAt });
    }
}

internal sealed class ImportBatchConfiguration : IEntityTypeConfiguration<ImportBatch>
{
    public void Configure(EntityTypeBuilder<ImportBatch> builder)
    {
        builder.Property(b => b.Id).HasMaxLength(32);
        builder.Property(b => b.FileName).HasMaxLength(200).IsRequired();
        builder.Property(b => b.ValidRowsJson).IsRequired();
        builder.Property(b => b.ErrorsJson).IsRequired();
        builder.HasIndex(b => new { b.UserId, b.CreatedAt });
    }
}
