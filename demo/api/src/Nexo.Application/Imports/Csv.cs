using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Nexo.Application.Common;

namespace Nexo.Application.Imports;

public sealed record CsvRecord(int LineNumber, IReadOnlyList<string> Fields);

/// <summary>Small RFC 4180 reader/writer (quotes, escaped quotes, multi-line fields, ; or , delimiter).</summary>
public static class Csv
{
    public static char DetectDelimiter(string text)
    {
        var semicolons = 0;
        var commas = 0;
        var inQuotes = false;
        foreach (var c in text)
        {
            if (c == '"')
            {
                inQuotes = !inQuotes;
            }
            else if (!inQuotes && c is '\n' or '\r')
            {
                break;
            }
            else if (!inQuotes && c == ';')
            {
                semicolons++;
            }
            else if (!inQuotes && c == ',')
            {
                commas++;
            }
        }

        return semicolons >= commas && semicolons > 0 ? ';' : ',';
    }

    public static IReadOnlyList<CsvRecord> Parse(string text, char delimiter)
    {
        var records = new List<CsvRecord>();
        var fields = new List<string>();
        var field = new StringBuilder();
        var inQuotes = false;
        var line = 1;
        var recordLine = 1;
        var i = 0;

        void EndField()
        {
            fields.Add(field.ToString());
            field.Clear();
        }

        void EndRecord()
        {
            EndField();
            if (fields.Count > 1 || fields[0].Length > 0)
            {
                records.Add(new CsvRecord(recordLine, fields.ToArray()));
            }

            fields.Clear();
        }

        while (i < text.Length)
        {
            var c = text[i];
            if (inQuotes)
            {
                if (c == '"')
                {
                    if (i + 1 < text.Length && text[i + 1] == '"')
                    {
                        field.Append('"');
                        i += 2;
                        continue;
                    }

                    inQuotes = false;
                }
                else
                {
                    if (c == '\n')
                    {
                        line++;
                    }

                    field.Append(c);
                }

                i++;
                continue;
            }

            if (c == '"' && field.Length == 0)
            {
                inQuotes = true;
            }
            else if (c == delimiter)
            {
                EndField();
            }
            else if (c is '\r' or '\n')
            {
                if (c == '\r' && i + 1 < text.Length && text[i + 1] == '\n')
                {
                    i++;
                }

                EndRecord();
                line++;
                recordLine = line;
            }
            else
            {
                field.Append(c);
            }

            i++;
        }

        if (inQuotes)
        {
            throw new BadRequestException($"El archivo CSV contiene comillas sin cerrar (registro que empieza en la línea {recordLine}).");
        }

        if (field.Length > 0 || fields.Count > 0)
        {
            EndRecord();
        }

        return records;
    }

    /// <summary>Decodes UTF-8 (with or without BOM); falls back to Latin-1 for files saved by Excel as ANSI.</summary>
    public static string Decode(byte[] content)
    {
        ArgumentNullException.ThrowIfNull(content);
        var span = content.AsSpan();
        if (span.StartsWith((ReadOnlySpan<byte>)[0xEF, 0xBB, 0xBF]))
        {
            span = span[3..];
        }

        try
        {
            return new UTF8Encoding(false, throwOnInvalidBytes: true).GetString(span);
        }
        catch (DecoderFallbackException)
        {
            return Encoding.Latin1.GetString(span);
        }
    }

    public static string Write(IEnumerable<IReadOnlyList<string>> rows, char delimiter = ';')
    {
        ArgumentNullException.ThrowIfNull(rows);
        var builder = new StringBuilder();
        builder.Append('﻿');
        foreach (var row in rows)
        {
            builder.AppendJoin(delimiter, row.Select(value => Escape(value, delimiter)));
            builder.Append("\r\n");
        }

        return builder.ToString();
    }

    private static string Escape(string value, char delimiter)
    {
        // Neutralize spreadsheet formula injection: =, +, -, @ first (also after leading whitespace) or a leading tab/CR.
        var trimmed = value.AsSpan().TrimStart();
        if ((trimmed.Length > 0 && trimmed[0] is '=' or '+' or '-' or '@') || (value.Length > 0 && value[0] is '\t' or '\r'))
        {
            value = "'" + value;
        }

        return value.Contains(delimiter, StringComparison.Ordinal) || value.Contains('"', StringComparison.Ordinal) || value.Contains('\n', StringComparison.Ordinal) || value.Contains('\r', StringComparison.Ordinal)
            ? "\"" + value.Replace("\"", "\"\"", StringComparison.Ordinal) + "\""
            : value;
    }
}

/// <summary>Lenient parsing of values typed by people in spreadsheets (Bolivian formats).</summary>
public static class CsvValues
{
    /// <summary>Accepts "1250.50", "1.250,50", "1250,50", "1,250.50", "Bs 1.250,50" and "1.250".</summary>
    public static decimal? ParsePrice(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        var value = raw.Trim();
        if (value.StartsWith("Bs", StringComparison.OrdinalIgnoreCase))
        {
            value = value[2..].TrimStart('.', ' ');
        }

        value = value.Replace(" ", string.Empty, StringComparison.Ordinal);
        var normalized = NormalizeSeparators(value);
        if (normalized is null)
        {
            return null;
        }

        value = normalized;
        return decimal.TryParse(value, NumberStyles.AllowDecimalPoint | NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out var result)
            ? result
            : null;
    }

    /// <summary>
    /// Returns the number with "." as decimal point, or null when separators are malformed.
    /// Thousands separators are only removed when they form valid 3-digit groups, so "10,125" stays
    /// 10.125 (and is then rejected for having more than 2 decimals) instead of becoming 10125.
    /// </summary>
    private static string? NormalizeSeparators(string value)
    {
        var dots = value.Count(c => c == '.');
        var commas = value.Count(c => c == ',');
        if (dots > 0 && commas > 0)
        {
            var decimalSeparator = value.LastIndexOf('.') > value.LastIndexOf(',') ? '.' : ',';
            var thousands = decimalSeparator == '.' ? ',' : '.';
            var pattern = $@"^-?\d{{1,3}}(\{thousands}\d{{3}})*\{decimalSeparator}\d+$";
            return Regex.IsMatch(value, pattern)
                ? value.Replace(thousands.ToString(), string.Empty, StringComparison.Ordinal).Replace(decimalSeparator, '.')
                : null;
        }

        if (commas > 0)
        {
            // Bolivian convention: a single comma is the decimal separator.
            return commas == 1 ? value.Replace(',', '.') : ThousandsOnly(value, ',');
        }

        if (dots > 1)
        {
            return ThousandsOnly(value, '.');
        }

        // A single dot after a 1-3 digit group followed by exactly three digits ("1.250") is a thousands separator.
        return dots == 1 && Regex.IsMatch(value, @"^-?\d{1,3}\.\d{3}$") ? value.Replace(".", string.Empty, StringComparison.Ordinal) : value;
    }

    private static string? ThousandsOnly(string value, char separator) =>
        Regex.IsMatch(value, $@"^-?\d{{1,3}}(\{separator}\d{{3}})+$") ? value.Replace(separator.ToString(), string.Empty, StringComparison.Ordinal) : null;

    public static bool? ParseBool(string? raw) => raw?.Trim().ToLowerInvariant() switch
    {
        "si" or "sí" or "s" or "true" or "1" or "yes" or "x" => true,
        "no" or "n" or "false" or "0" => false,
        _ => null,
    };
}
