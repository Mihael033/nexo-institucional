using Nexo.Domain.Common;

namespace Nexo.Domain.Messaging;

public sealed class ContactMessage : Entity, IAuditable
{
    private ContactMessage()
    {
    }

    public ContactMessage(string name, string email, string? phone, string? organization, string subject, string message, string? ipAddress, DateTime createdAt)
    {
        Name = name.Trim();
        Email = email.Trim();
        Phone = string.IsNullOrWhiteSpace(phone) ? null : phone.Trim();
        Organization = string.IsNullOrWhiteSpace(organization) ? null : organization.Trim();
        Subject = subject.Trim();
        Message = message.Trim();
        IpAddress = ipAddress;
        CreatedAt = createdAt;
    }

    public string Name { get; private set; } = string.Empty;

    public string Email { get; private set; } = string.Empty;

    public string? Phone { get; private set; }

    public string? Organization { get; private set; }

    public string Subject { get; private set; } = string.Empty;

    public string Message { get; private set; } = string.Empty;

    public bool IsRead { get; private set; }

    public DateTime? ReadAt { get; private set; }

    public string? ReadBy { get; private set; }

    [AuditIgnore]
    public string? IpAddress { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public string AuditLabel => Name;

    public void MarkAsRead(string readBy, DateTime now)
    {
        if (IsRead)
        {
            return;
        }

        IsRead = true;
        ReadAt = now;
        ReadBy = readBy;
    }

    public void MarkAsUnread()
    {
        IsRead = false;
        ReadAt = null;
        ReadBy = null;
    }
}
