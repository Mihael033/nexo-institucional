using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Nexo.Application.Auditing;
using Nexo.Application.Common;
using Nexo.Domain.Identity;

namespace Nexo.Application.Dashboard;

public sealed record DashboardTotalsDto(int Products, int ProductsAvailable, int ProductsFeatured, int Categories, int News, int Messages, int MessagesUnread, int Users);

public sealed record CategoryCountDto(string Slug, string Name, int Count);

public sealed record DailyCountDto(DateOnly Date, int Count);

public sealed record DashboardDto(
    DashboardTotalsDto Totals,
    IReadOnlyList<CategoryCountDto> ProductsByCategory,
    IReadOnlyList<DailyCountDto> MessagesLast7Days,
    IReadOnlyList<AuditEntrySummaryDto>? RecentActivity);

public sealed record GetDashboardQuery : IRequest<DashboardDto>;

internal sealed class DashboardHandler(IAppDbContext db, TimeProvider clock, ICurrentUser currentUser, IOptions<SiteOptions> site)
    : IRequestHandler<GetDashboardQuery, DashboardDto>
{
    public async Task<DashboardDto> Handle(GetDashboardQuery request, CancellationToken cancellationToken)
    {
        var products = db.Products.AsNoTracking().Where(p => !p.IsDeleted);
        var totals = new DashboardTotalsDto(
            await products.CountAsync(cancellationToken).ConfigureAwait(false),
            await products.CountAsync(p => p.IsAvailable, cancellationToken).ConfigureAwait(false),
            await products.CountAsync(p => p.IsFeatured, cancellationToken).ConfigureAwait(false),
            await db.Categories.CountAsync(cancellationToken).ConfigureAwait(false),
            await db.News.CountAsync(cancellationToken).ConfigureAwait(false),
            await db.ContactMessages.CountAsync(cancellationToken).ConfigureAwait(false),
            await db.ContactMessages.CountAsync(m => !m.IsRead, cancellationToken).ConfigureAwait(false),
            await db.Users.CountAsync(cancellationToken).ConfigureAwait(false));

        var byCategory = await db.Categories.AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new CategoryCountDto(c.Slug, c.Name, products.Count(p => p.CategoryId == c.Id)))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        // Days are calendar days in the site's time zone (America/La_Paz).
        var zone = site.Value.TimeZone;
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(clock.UtcNow(), zone));
        var firstDay = today.AddDays(-6);
        var since = TimeZoneInfo.ConvertTimeToUtc(firstDay.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified), zone);
        var recentMessages = await db.ContactMessages.AsNoTracking()
            .Where(m => m.CreatedAt >= since)
            .Select(m => m.CreatedAt)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var perDay = recentMessages
            .GroupBy(d => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(d, zone)))
            .ToDictionary(g => g.Key, g => g.Count());
        var last7Days = Enumerable.Range(0, 7)
            .Select(i => firstDay.AddDays(i))
            .Select(day => new DailyCountDto(day, perDay.GetValueOrDefault(day)))
            .ToList();

        List<AuditEntrySummaryDto>? recent = null;
        if (currentUser.HasPermission(Permissions.AuditRead))
        {
            var entries = await db.AuditEntries.AsNoTracking()
                .OrderByDescending(a => a.OccurredAt).ThenByDescending(a => a.Id)
                .Take(8)
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);
            recent = entries.Select(AuditHandlers.ToSummary).ToList();
        }

        return new DashboardDto(totals, byCategory, last7Days, recent);
    }
}
