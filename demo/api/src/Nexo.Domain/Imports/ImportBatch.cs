namespace Nexo.Domain.Imports;

/// <summary>A validated CSV upload waiting for confirmation (validate → confirm flow).</summary>
public sealed class ImportBatch
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(30);

    private ImportBatch()
    {
    }

    public ImportBatch(string id, int userId, string fileName, int totalRows, int validRows, string validRowsJson, string errorsJson, DateTime createdAt)
    {
        Id = id;
        UserId = userId;
        FileName = fileName;
        TotalRows = totalRows;
        ValidRows = validRows;
        ValidRowsJson = validRowsJson;
        ErrorsJson = errorsJson;
        CreatedAt = createdAt;
        ExpiresAt = createdAt.Add(Lifetime);
    }

    public string Id { get; private set; } = string.Empty;

    public int UserId { get; private set; }

    public string FileName { get; private set; } = string.Empty;

    public int TotalRows { get; private set; }

    public int ValidRows { get; private set; }

    public string ValidRowsJson { get; private set; } = "[]";

    public string ErrorsJson { get; private set; } = "[]";

    public DateTime CreatedAt { get; private set; }

    public DateTime ExpiresAt { get; private set; }

    public DateTime? ConfirmedAt { get; private set; }

    public bool CanConfirm(DateTime now) => ConfirmedAt is null && ExpiresAt > now;

    public void MarkConfirmed(DateTime now)
    {
        if (!CanConfirm(now))
        {
            throw new InvalidOperationException("Import batch can no longer be confirmed.");
        }

        ConfirmedAt = now;
    }
}
