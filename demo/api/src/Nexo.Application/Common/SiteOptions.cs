namespace Nexo.Application.Common;

/// <summary>Global site data (bound from the "Site" configuration section).</summary>
public sealed class SiteOptions
{
    public const string SectionName = "Site";

    public string Name { get; set; } = "Nexo Institucional";

    public string Slogan { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string TimeZoneId { get; set; } = "America/La_Paz";

    public SiteContact Contact { get; set; } = new();

    public IList<SiteSocialLink> Social { get; init; } = [];

    public IList<SiteNavLink> Nav { get; init; } = [];

    public TimeZoneInfo TimeZone
    {
        get
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);
            }
            catch (TimeZoneNotFoundException)
            {
                return TimeZoneInfo.Utc;
            }
        }
    }
}

public sealed class SiteContact
{
    public string Address { get; set; } = string.Empty;

    public string Phone { get; set; } = string.Empty;

    public string Whatsapp { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Hours { get; set; } = string.Empty;
}

public sealed class SiteSocialLink
{
    public string Network { get; set; } = string.Empty;

    public string Url { get; set; } = string.Empty;
}

public sealed class SiteNavLink
{
    public string Label { get; set; } = string.Empty;

    public string Href { get; set; } = string.Empty;
}
