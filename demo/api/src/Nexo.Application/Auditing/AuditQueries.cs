using System.Text.Json;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Nexo.Application.Common;
using Nexo.Domain.Auditing;

namespace Nexo.Application.Auditing;

public record AuditEntrySummaryDto
{
    public required long Id { get; init; }

    public required DateTime OccurredAt { get; init; }

    public required int? UserId { get; init; }

    public required string? UserName { get; init; }

    public required string? UserEmail { get; init; }

    public required AuditAction Action { get; init; }

    public required string EntityType { get; init; }

    public required string? EntityId { get; init; }

    public required string Summary { get; init; }

    public required string? IpAddress { get; init; }
}

public sealed record AuditEntryDetailDto : AuditEntrySummaryDto
{
    public required JsonElement? Before { get; init; }

    public required JsonElement? After { get; init; }

    public required IReadOnlyList<AuditChange> Changes { get; init; }

    public required string? UserAgent { get; init; }
}

public sealed record LabeledValueDto(string Value, string Label);

public sealed record AuditUserOptionDto(int Id, string Name);

public sealed record AuditMetaDto(IReadOnlyList<LabeledValueDto> Actions, IReadOnlyList<LabeledValueDto> EntityTypes, IReadOnlyList<AuditUserOptionDto> Users);

public sealed record ListAuditQuery(
    int? UserId,
    string? Action,
    string? EntityType,
    string? EntityId,
    string? From,
    string? To,
    string? Q,
    string? Sort,
    int? Page,
    int? PageSize) : IRequest<PagedResult<AuditEntrySummaryDto>>, IPagedRequest;

public sealed record GetAuditEntryQuery(long Id) : IRequest<AuditEntryDetailDto>;

public sealed record GetAuditMetaQuery : IRequest<AuditMetaDto>;

public sealed class ListAuditQueryValidator : AbstractValidator<ListAuditQuery>
{
    public ListAuditQueryValidator()
    {
        this.AddPagingRules();
        RuleFor(x => x.Action).Must(v => AuditFilters.ParseActions(v) is not null)
            .WithMessage($"Acción no válida. Use: {string.Join(", ", Enum.GetValues<AuditAction>().Select(AuditText.ToSnakeCase))}.");
        RuleFor(x => x.EntityType).Must(v => QueryText.SplitList(v).All(AuditText.EntityLabels.ContainsKey))
            .WithMessage($"Entidad no válida. Use: {string.Join(", ", AuditText.EntityLabels.Keys)}.");
        RuleFor(x => x.EntityId).MaximumLength(64);
        RuleFor(x => x.From).Must(DateRange.IsValid).WithMessage("Fecha inválida. Use AAAA-MM-DD.");
        RuleFor(x => x.To).Must(DateRange.IsValid).WithMessage("Fecha inválida. Use AAAA-MM-DD.")
            .Must((query, to) => !DateRange.IsInverted(query.From, to)).WithMessage("La fecha «hasta» debe ser igual o posterior a la fecha «desde».");
        RuleFor(x => x.Q).MaximumLength(100);
        RuleFor(x => x.Sort).MustBeOneOf("newest", "oldest");
    }
}

internal static class AuditFilters
{
    private static readonly Dictionary<string, AuditAction> BySnakeCase =
        Enum.GetValues<AuditAction>().ToDictionary(AuditText.ToSnakeCase, a => a, StringComparer.Ordinal);

    /// <summary>Parses "create,update" into actions; null when any value is unknown.</summary>
    public static IReadOnlyList<AuditAction>? ParseActions(string? value)
    {
        var result = new List<AuditAction>();
        foreach (var item in QueryText.SplitList(value))
        {
            if (!BySnakeCase.TryGetValue(item, out var action))
            {
                return null;
            }

            result.Add(action);
        }

        return result;
    }
}

internal sealed class AuditHandlers(IAppDbContext db, IOptions<SiteOptions> site) :
    IRequestHandler<ListAuditQuery, PagedResult<AuditEntrySummaryDto>>,
    IRequestHandler<GetAuditEntryQuery, AuditEntryDetailDto>,
    IRequestHandler<GetAuditMetaQuery, AuditMetaDto>
{
    public async Task<PagedResult<AuditEntrySummaryDto>> Handle(ListAuditQuery request, CancellationToken cancellationToken)
    {
        var query = db.AuditEntries.AsNoTracking();
        if (request.UserId is { } userId)
        {
            query = query.Where(a => a.UserId == userId);
        }

        var actions = AuditFilters.ParseActions(request.Action) ?? [];
        if (actions.Count > 0)
        {
            query = query.Where(a => actions.Contains(a.Action));
        }

        var entityTypes = QueryText.SplitList(request.EntityType);
        if (entityTypes.Count > 0)
        {
            query = query.Where(a => entityTypes.Contains(a.EntityType));
        }

        if (!string.IsNullOrWhiteSpace(request.EntityId))
        {
            query = query.Where(a => a.EntityId == request.EntityId);
        }

        var zone = site.Value.TimeZone;
        if (DateRange.ToUtc(request.From, zone, endOfDay: false) is { } from)
        {
            query = query.Where(a => a.OccurredAt >= from);
        }

        if (DateRange.ToUtc(request.To, zone, endOfDay: true) is { } to)
        {
            query = DateRange.IsDateOnly(request.To) ? query.Where(a => a.OccurredAt < to) : query.Where(a => a.OccurredAt <= to);
        }

        if (!string.IsNullOrWhiteSpace(request.Q))
        {
            var pattern = QueryText.LikeContains(request.Q.Trim());
            query = query.Where(a => EF.Functions.Like(a.Summary, pattern, "\\"));
        }

        query = request.Sort == "oldest"
            ? query.OrderBy(a => a.OccurredAt).ThenBy(a => a.Id)
            : query.OrderByDescending(a => a.OccurredAt).ThenByDescending(a => a.Id);

        var page = await query.ToPagedAsync(request, cancellationToken).ConfigureAwait(false);
        return page.Map(ToSummary);
    }

    public async Task<AuditEntryDetailDto> Handle(GetAuditEntryQuery request, CancellationToken cancellationToken)
    {
        var entry = await db.AuditEntries.AsNoTracking().FirstOrDefaultAsync(a => a.Id == request.Id, cancellationToken).ConfigureAwait(false)
            ?? throw new NotFoundException("El registro de auditoría no existe.");
        var s = ToSummary(entry);
        return new AuditEntryDetailDto
        {
            Id = s.Id,
            OccurredAt = s.OccurredAt,
            UserId = s.UserId,
            UserName = s.UserName,
            UserEmail = s.UserEmail,
            Action = s.Action,
            EntityType = s.EntityType,
            EntityId = s.EntityId,
            Summary = s.Summary,
            IpAddress = s.IpAddress,
            Before = ParseJson(entry.BeforeJson),
            After = ParseJson(entry.AfterJson),
            Changes = AuditLog.Diff(entry.BeforeJson, entry.AfterJson),
            UserAgent = entry.UserAgent,
        };
    }

    public async Task<AuditMetaDto> Handle(GetAuditMetaQuery request, CancellationToken cancellationToken)
    {
        var users = await db.Users.AsNoTracking()
            .OrderBy(u => u.Name)
            .Select(u => new AuditUserOptionDto(u.Id, u.Name))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return new AuditMetaDto(
            AuditText.ActionLabels.Select(a => new LabeledValueDto(AuditText.ToSnakeCase(a.Key), a.Value)).ToList(),
            AuditText.EntityLabels.Select(e => new LabeledValueDto(e.Key, e.Value)).ToList(),
            users);
    }

    internal static AuditEntrySummaryDto ToSummary(AuditEntry a) => new()
    {
        Id = a.Id,
        OccurredAt = a.OccurredAt,
        UserId = a.UserId,
        UserName = a.UserName,
        UserEmail = a.UserEmail,
        Action = a.Action,
        EntityType = a.EntityType,
        EntityId = a.EntityId,
        Summary = a.Summary,
        IpAddress = a.IpAddress,
    };

    private static JsonElement? ParseJson(string? json)
    {
        if (string.IsNullOrEmpty(json))
        {
            return null;
        }

        using var document = JsonDocument.Parse(json);
        return document.RootElement.Clone();
    }
}
