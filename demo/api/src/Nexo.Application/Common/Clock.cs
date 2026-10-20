namespace Nexo.Application.Common;

public static class ClockExtensions
{
    public static DateTime UtcNow(this TimeProvider timeProvider) => timeProvider.GetUtcNow().UtcDateTime;
}

/// <summary>Converts calendar dates typed by admins (Bolivia time) to UTC ranges.</summary>
public static class DateRange
{
    /// <summary>
    /// Parses "YYYY-MM-DD" (local calendar day in <paramref name="zone"/>) or a full ISO timestamp.
    /// When <paramref name="endOfDay"/> is true a date-only value returns the start of the next day (exclusive bound).
    /// </summary>
    public static DateTime? ToUtc(string? value, TimeZoneInfo zone, bool endOfDay)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (DateOnly.TryParseExact(value, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var date))
        {
            var local = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
            if (endOfDay)
            {
                local = local.AddDays(1);
            }

            return TimeZoneInfo.ConvertTimeToUtc(local, zone);
        }

        // Otherwise only a full ISO 8601 timestamp is accepted ("2026-10-17T10:00:00Z"); "10/17/2026" is rejected.
        return value.Length > 10 && value[4] == '-' && value[7] == '-' && value[10] == 'T'
            && DateTimeOffset.TryParse(value, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.AssumeUniversal, out var parsed)
            ? parsed.UtcDateTime
            : null;
    }

    public static bool IsDateOnly(string? value) =>
        DateOnly.TryParseExact(value, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out _);

    /// <summary>True when both bounds are present and <paramref name="from"/> is after <paramref name="to"/>.</summary>
    public static bool IsInverted(string? from, string? to) =>
        ToUtc(from, TimeZoneInfo.Utc, endOfDay: false) is { } start
        && ToUtc(to, TimeZoneInfo.Utc, endOfDay: true) is { } end
        && start >= end;

    public static bool IsValid(string? value) =>
        string.IsNullOrWhiteSpace(value) || ToUtc(value, TimeZoneInfo.Utc, false) is not null;
}
