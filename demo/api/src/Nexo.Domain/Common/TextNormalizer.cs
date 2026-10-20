using System.Globalization;
using System.Text;

namespace Nexo.Domain.Common;

public static class TextNormalizer
{
    /// <summary>Lowercase, accent-free form used for search ("Vehículos" → "vehiculos").</summary>
    public static string ForSearch(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var decomposed = value.Trim().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);
        var lastWasSpace = false;
        foreach (var c in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            if (char.IsWhiteSpace(c))
            {
                if (!lastWasSpace)
                {
                    builder.Append(' ');
                }

                lastWasSpace = true;
                continue;
            }

            builder.Append(char.ToLowerInvariant(c));
            lastWasSpace = false;
        }

        return builder.ToString().Normalize(NormalizationForm.FormC);
    }

    /// <summary>URL slug: a-z, 0-9 and single hyphens ("Router Wi-Fi 7" → "router-wi-fi-7").</summary>
    public static string Slugify(string? value, int maxLength = 160)
    {
        var normalized = ForSearch(value);
        var builder = new StringBuilder(normalized.Length);
        foreach (var c in normalized)
        {
            if (c is (>= 'a' and <= 'z') or (>= '0' and <= '9'))
            {
                builder.Append(c);
            }
            else if (builder.Length > 0 && builder[^1] != '-')
            {
                builder.Append('-');
            }
        }

        var slug = builder.ToString().Trim('-');
        return slug.Length <= maxLength ? slug : slug[..maxLength].TrimEnd('-');
    }

    public static bool IsValidSlug(string? value) =>
        !string.IsNullOrEmpty(value) && value == Slugify(value, int.MaxValue);
}
