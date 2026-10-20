using System.Globalization;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata;
using Nexo.Application.Auditing;
using Nexo.Domain.Auditing;
using Nexo.Domain.Common;
using Nexo.Domain.Messaging;

namespace Nexo.Infrastructure.Persistence.Auditing;

/// <summary>
/// Builds audit records from the change tracker. Aggregates are snapshotted as a whole:
/// a product's images and attributes (<see cref="IAuditChild"/>) appear inside the product's before/after.
/// </summary>
internal static class AuditTrail
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static void EnsureImmutability(ChangeTracker tracker)
    {
        if (tracker.Entries<AuditEntry>().Any(e => e.State is EntityState.Modified or EntityState.Deleted))
        {
            throw new InvalidOperationException("Audit entries are immutable and cannot be modified or deleted.");
        }
    }

    public static List<PendingAudit> Capture(ChangeTracker tracker)
    {
        tracker.DetectChanges();
        var entries = tracker.Entries().ToList();
        var roots = new List<EntityEntry>();

        foreach (var entry in entries.Where(e => e.Entity is IAuditable))
        {
            var childChanged = ChildNavigations(entry.Metadata)
                .Any(nav => ChildEntries(entries, entry, nav, original: false).Any(c => c.State != EntityState.Unchanged)
                    || ChildEntries(entries, entry, nav, original: true).Any(c => c.State == EntityState.Deleted));
            if (entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted || childChanged)
            {
                roots.Add(entry);
            }
        }

        var pending = new List<PendingAudit>();
        foreach (var root in roots)
        {
            var before = root.State == EntityState.Added ? null : Snapshot(entries, root, original: true);
            var after = root.State == EntityState.Deleted ? null : Snapshot(entries, root, original: false);
            var action = ResolveAction(root, before, after);
            if (action == AuditAction.Update && JsonNode.DeepEquals(before, after))
            {
                continue;
            }

            pending.Add(new PendingAudit(
                root,
                root.State == EntityState.Added ? null : Convert.ToString(root.Property("Id").CurrentValue, CultureInfo.InvariantCulture),
                action,
                root.Metadata.ClrType.Name,
                ((IAuditable)root.Entity).AuditLabel,
                before?.ToJsonString(Json),
                after?.ToJsonString(Json)));
        }

        return pending;
    }

    private static AuditAction ResolveAction(EntityEntry root, JsonObject? before, JsonObject? after)
    {
        switch (root.State)
        {
            case EntityState.Added:
                return AuditAction.Create;
            case EntityState.Deleted:
                return AuditAction.Delete;
        }

        if (root.Entity is ISoftDeletable && Changed(before, after, nameof(ISoftDeletable.IsDeleted), out var deleted))
        {
            return deleted ? AuditAction.Delete : AuditAction.Restore;
        }

        if (root.Entity is ContactMessage && Changed(before, after, nameof(ContactMessage.IsRead), out var read))
        {
            return read ? AuditAction.MarkRead : AuditAction.MarkUnread;
        }

        return AuditAction.Update;
    }

    private static bool Changed(JsonObject? before, JsonObject? after, string property, out bool newValue)
    {
        var key = JsonNamingPolicy.CamelCase.ConvertName(property);
        var oldValue = before?[key]?.GetValue<bool>() ?? false;
        newValue = after?[key]?.GetValue<bool>() ?? false;
        return oldValue != newValue;
    }

    private static JsonObject Snapshot(List<EntityEntry> entries, EntityEntry root, bool original)
    {
        var snapshot = Scalars(root, original, excludedForeignKey: null);
        foreach (var navigation in ChildNavigations(root.Metadata))
        {
            var foreignKey = navigation.ForeignKey.Properties[0];
            var children = ChildEntries(entries, root, navigation, original)
                .Where(c => original ? c.State != EntityState.Added : c.State != EntityState.Deleted)
                .Select(c => (Entry: c, Values: Scalars(c, original, foreignKey.Name)))
                .OrderBy(c => c.Values["sortOrder"]?.GetValue<int>() ?? 0)
                .ThenBy(c => c.Values.ToJsonString(Json), StringComparer.Ordinal)
                .Select(c => (JsonNode)c.Values);
            snapshot[JsonNamingPolicy.CamelCase.ConvertName(navigation.Name)] = new JsonArray([.. children]);
        }

        return snapshot;
    }

    private static JsonObject Scalars(EntityEntry entry, bool original, string? excludedForeignKey)
    {
        var values = new JsonObject();
        foreach (var property in entry.Metadata.GetProperties())
        {
            if (property.IsPrimaryKey() || property.IsShadowProperty() || property.Name == excludedForeignKey
                || property.PropertyInfo?.GetCustomAttribute<AuditIgnoreAttribute>() is not null)
            {
                continue;
            }

            var entryProperty = entry.Property(property.Name);
            var value = original ? entryProperty.OriginalValue : entryProperty.CurrentValue;
            values[JsonNamingPolicy.CamelCase.ConvertName(property.Name)] = ToNode(value);
        }

        return values;
    }

    private static JsonNode? ToNode(object? value) => value switch
    {
        null => null,
        Enum e => JsonValue.Create(JsonNamingPolicy.SnakeCaseLower.ConvertName(e.ToString())),
        _ => JsonSerializer.SerializeToNode(value, value.GetType(), Json),
    };

    private static IEnumerable<INavigation> ChildNavigations(IEntityType type) =>
        type.GetNavigations().Where(n => n.IsCollection && typeof(IAuditChild).IsAssignableFrom(n.TargetEntityType.ClrType));

    private static IEnumerable<EntityEntry> ChildEntries(List<EntityEntry> entries, EntityEntry root, INavigation navigation, bool original)
    {
        var foreignKey = navigation.ForeignKey.Properties[0].Name;
        var key = original ? root.Property("Id").OriginalValue : root.Property("Id").CurrentValue;
        return entries.Where(e => e.Metadata.ClrType == navigation.TargetEntityType.ClrType
            && Equals(original ? e.Property(foreignKey).OriginalValue : e.Property(foreignKey).CurrentValue, key));
    }
}

/// <param name="KnownId">Id of existing rows; null for inserts (read from the entry after the first save).</param>
internal sealed record PendingAudit(EntityEntry Root, string? KnownId, AuditAction Action, string EntityType, string Label, string? BeforeJson, string? AfterJson)
{
    public AuditEntry ToEntry(AuditActor actor, DateTime now)
    {
        return new AuditEntry(
            now,
            Action,
            EntityType,
            KnownId ?? Convert.ToString(Root.Property("Id").CurrentValue, CultureInfo.InvariantCulture),
            AuditText.Summarize(Action, EntityType, Label),
            actor,
            BeforeJson,
            AfterJson);
    }
}
