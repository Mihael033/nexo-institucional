namespace Nexo.Domain.Common;

public abstract class Entity
{
    public int Id { get; protected set; }
}

/// <summary>Entities whose writes are recorded automatically in the audit trail.</summary>
public interface IAuditable
{
    /// <summary>Human readable name used in audit summaries (e.g. the product name).</summary>
    string AuditLabel { get; }
}

/// <summary>Child entity whose changes are audited as part of its parent aggregate.</summary>
public interface IAuditChild
{
}

public interface ISoftDeletable
{
    bool IsDeleted { get; }

    DateTime? DeletedAt { get; }
}

/// <summary>Excludes a property from audit snapshots (secrets, counters, denormalized data).</summary>
[AttributeUsage(AttributeTargets.Property)]
public sealed class AuditIgnoreAttribute : Attribute
{
}
