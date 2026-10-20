using System.Text.Json;
using System.Text.Json.Nodes;
using Nexo.Application.Common;
using Nexo.Domain.Auditing;

namespace Nexo.Application.Auditing;

/// <summary>Spanish (es-BO) labels and summaries for audit entries.</summary>
public static class AuditText
{
    public const string Product = "Product";
    public const string Category = "Category";
    public const string ContactMessage = "ContactMessage";
    public const string User = "User";
    public const string ImportBatch = "ImportBatch";

    public static readonly IReadOnlyDictionary<AuditAction, string> ActionLabels = new Dictionary<AuditAction, string>
    {
        [AuditAction.Create] = "Creación",
        [AuditAction.Update] = "Edición",
        [AuditAction.Delete] = "Eliminación",
        [AuditAction.Restore] = "Restauración",
        [AuditAction.Import] = "Importación",
        [AuditAction.Login] = "Inicio de sesión",
        [AuditAction.LoginFailed] = "Inicio de sesión fallido",
        [AuditAction.Logout] = "Cierre de sesión",
        [AuditAction.MarkRead] = "Marcado como leído",
        [AuditAction.MarkUnread] = "Marcado como no leído",
    };

    public static readonly IReadOnlyDictionary<string, string> EntityLabels = new Dictionary<string, string>
    {
        [Product] = "Producto",
        [Category] = "Categoría",
        [ContactMessage] = "Mensaje de contacto",
        [User] = "Usuario",
        [ImportBatch] = "Importación",
    };

    private static readonly Dictionary<string, string> EntityArticles = new()
    {
        [Product] = "el producto",
        [Category] = "la categoría",
        [ContactMessage] = "el mensaje de",
        [User] = "el usuario",
        [ImportBatch] = "la importación",
    };

    public static string Summarize(AuditAction action, string entityType, string label)
    {
        var target = $"{EntityArticles.GetValueOrDefault(entityType, entityType)} «{label}»";
        return action switch
        {
            AuditAction.Create when entityType == ContactMessage => $"Nuevo mensaje de contacto de «{label}»",
            AuditAction.Create => $"Creó {target}",
            AuditAction.Update => $"Actualizó {target}",
            AuditAction.Delete => $"Eliminó {target}",
            AuditAction.Restore => $"Restauró {target}",
            AuditAction.MarkRead => $"Marcó como leído {target}",
            AuditAction.MarkUnread => $"Marcó como no leído {target}",
            _ => $"{ActionLabels[action]}: {label}",
        };
    }

    public static string ToSnakeCase(AuditAction action) => JsonNamingPolicy.SnakeCaseLower.ConvertName(action.ToString());
}

public static class AuditLog
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    /// <summary>Adds an explicit (non entity-change) audit record, saved with the next SaveChanges.</summary>
    public static void Record(
        this IAppDbContext db,
        TimeProvider clock,
        AuditActor actor,
        AuditAction action,
        string entityType,
        string? entityId,
        string summary,
        object? before = null,
        object? after = null)
    {
        db.AuditEntries.Add(new AuditEntry(
            clock.UtcNow(),
            action,
            entityType,
            entityId,
            summary,
            actor,
            before is null ? null : JsonSerializer.Serialize(before, Json),
            after is null ? null : JsonSerializer.Serialize(after, Json)));
    }

    /// <summary>Field-level diff between two JSON snapshots (top-level keys).</summary>
    public static IReadOnlyList<AuditChange> Diff(string? beforeJson, string? afterJson)
    {
        var before = Parse(beforeJson);
        var after = Parse(afterJson);
        var keys = before.Select(p => p.Key).Union(after.Select(p => p.Key), StringComparer.Ordinal);
        var changes = new List<AuditChange>();
        foreach (var key in keys)
        {
            before.TryGetPropertyValue(key, out var oldValue);
            after.TryGetPropertyValue(key, out var newValue);
            if (!JsonNode.DeepEquals(oldValue, newValue))
            {
                changes.Add(new AuditChange(key, oldValue?.DeepClone(), newValue?.DeepClone()));
            }
        }

        return changes;
    }

    private static JsonObject Parse(string? json) =>
        string.IsNullOrEmpty(json) ? [] : JsonNode.Parse(json) as JsonObject ?? [];
}

public sealed record AuditChange(string Field, JsonNode? Before, JsonNode? After);
