using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace Nexo.Application.Common;

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalItems, int TotalPages);

public interface IPagedRequest
{
    int? Page { get; }

    int? PageSize { get; }
}

public static class Paging
{
    public const int DefaultPageSize = 12;
    public const int MaxPageSize = 100;

    public static (int Page, int PageSize) Resolve(IPagedRequest request) =>
        (request.Page ?? 1, request.PageSize ?? DefaultPageSize);

    public static async Task<PagedResult<T>> ToPagedAsync<T>(this IQueryable<T> query, IPagedRequest request, CancellationToken cancellationToken)
    {
        var (page, pageSize) = Resolve(request);
        var total = await query.CountAsync(cancellationToken).ConfigureAwait(false);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken).ConfigureAwait(false);
        return new PagedResult<T>(items, page, pageSize, total, (int)Math.Ceiling(total / (double)pageSize));
    }

    public static PagedResult<TOut> Map<TIn, TOut>(this PagedResult<TIn> page, Func<TIn, TOut> map) =>
        new(page.Items.Select(map).ToList(), page.Page, page.PageSize, page.TotalItems, page.TotalPages);

    public static void AddPagingRules<T>(this AbstractValidator<T> validator)
        where T : IPagedRequest
    {
        validator.RuleFor(x => x.Page).GreaterThanOrEqualTo(1).WithMessage("La página debe ser 1 o mayor.");
        validator.RuleFor(x => x.PageSize).InclusiveBetween(1, MaxPageSize)
            .WithMessage($"El tamaño de página debe estar entre 1 y {MaxPageSize}.");
    }

    public static IRuleBuilderOptions<T, string?> MustBeOneOf<T>(this IRuleBuilder<T, string?> rule, params string[] allowed) =>
        rule.Must(value => value is null || allowed.Contains(value, StringComparer.Ordinal))
            .WithMessage($"Valor no permitido. Use: {string.Join(", ", allowed)}.");
}

/// <summary>Helpers shared by list handlers.</summary>
public static class QueryText
{
    /// <summary>Splits "a,b, c" into distinct trimmed values.</summary>
    public static IReadOnlyList<string> SplitList(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? []
            : value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Distinct(StringComparer.Ordinal).ToList();

    /// <summary>Escapes LIKE wildcards so user input is matched literally.</summary>
    public static string LikeContains(string value) =>
        "%" + value.Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("%", "\\%", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal) + "%";
}
