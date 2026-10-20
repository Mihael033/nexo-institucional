namespace Nexo.Domain.Auditing;

public enum AuditAction
{
    Create = 1,
    Update = 2,
    Delete = 3,
    Restore = 4,
    Import = 5,
    Login = 6,
    LoginFailed = 7,
    Logout = 8,
    MarkRead = 9,
    MarkUnread = 10,
}

/// <summary>Immutable audit record. User data is denormalized so history survives later edits.</summary>
public sealed class AuditEntry
{
    private AuditEntry()
    {
    }

    public AuditEntry(
        DateTime occurredAt,
        AuditAction action,
        string entityType,
        string? entityId,
        string summary,
        AuditActor actor,
        string? beforeJson,
        string? afterJson)
    {
        OccurredAt = occurredAt;
        Action = action;
        EntityType = entityType;
        EntityId = entityId;
        Summary = summary;
        UserId = actor.UserId;
        UserName = actor.UserName;
        UserEmail = actor.UserEmail;
        IpAddress = actor.IpAddress;
        UserAgent = actor.UserAgent;
        BeforeJson = beforeJson;
        AfterJson = afterJson;
    }

    public long Id { get; private set; }

    public DateTime OccurredAt { get; private set; }

    public AuditAction Action { get; private set; }

    public string EntityType { get; private set; } = string.Empty;

    public string? EntityId { get; private set; }

    public string Summary { get; private set; } = string.Empty;

    public int? UserId { get; private set; }

    public string? UserName { get; private set; }

    public string? UserEmail { get; private set; }

    public string? IpAddress { get; private set; }

    public string? UserAgent { get; private set; }

    public string? BeforeJson { get; private set; }

    public string? AfterJson { get; private set; }
}

public sealed record AuditActor(int? UserId, string? UserName, string? UserEmail, string? IpAddress, string? UserAgent)
{
    public static readonly AuditActor System = new(null, "Sistema", null, null, null);
}
