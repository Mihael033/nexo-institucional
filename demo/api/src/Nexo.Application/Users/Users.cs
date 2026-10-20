using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Nexo.Application.Common;

namespace Nexo.Application.Users;

public sealed record AdminUserDto(int Id, string Name, string Email, string Role, bool IsActive, bool IsLockedOut, DateTime? LastLoginAt, DateTime CreatedAt);

public sealed record RoleDto(string Name, string Description, IReadOnlyList<string> Permissions, int UserCount);

public sealed record ListUsersQuery(string? Q, string? Role, int? Page, int? PageSize) : IRequest<PagedResult<AdminUserDto>>, IPagedRequest;

public sealed record ListRolesQuery : IRequest<IReadOnlyList<RoleDto>>;

public sealed class ListUsersQueryValidator : AbstractValidator<ListUsersQuery>
{
    public ListUsersQueryValidator()
    {
        this.AddPagingRules();
        RuleFor(x => x.Q).MaximumLength(100);
        RuleFor(x => x.Role).MaximumLength(50);
    }
}

internal sealed class UserHandlers(IAppDbContext db, TimeProvider clock) :
    IRequestHandler<ListUsersQuery, PagedResult<AdminUserDto>>,
    IRequestHandler<ListRolesQuery, IReadOnlyList<RoleDto>>
{
    public async Task<PagedResult<AdminUserDto>> Handle(ListUsersQuery request, CancellationToken cancellationToken)
    {
        var now = clock.UtcNow();
        var query = db.Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(request.Q))
        {
            var pattern = QueryText.LikeContains(request.Q.Trim());
            query = query.Where(u => EF.Functions.Like(u.Name, pattern, "\\") || EF.Functions.Like(u.Email, pattern, "\\"));
        }

        if (!string.IsNullOrWhiteSpace(request.Role))
        {
            query = query.Where(u => u.Role.Name == request.Role);
        }

        return await query
            .OrderBy(u => u.Name).ThenBy(u => u.Id)
            .Select(u => new AdminUserDto(u.Id, u.Name, u.Email, u.Role.Name, u.IsActive, u.LockoutEnd != null && u.LockoutEnd > now, u.LastLoginAt, u.CreatedAt))
            .ToPagedAsync(request, cancellationToken)
            .ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<RoleDto>> Handle(ListRolesQuery request, CancellationToken cancellationToken)
    {
        var roles = await db.Roles.AsNoTracking()
            .Include(r => r.Permissions)
            .OrderBy(r => r.Id)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var counts = await db.Users.AsNoTracking()
            .GroupBy(u => u.RoleId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken)
            .ConfigureAwait(false);
        return roles
            .Select(r => new RoleDto(
                r.Name,
                r.Description,
                r.Permissions.Select(p => p.Permission).Order(StringComparer.Ordinal).ToList(),
                counts.GetValueOrDefault(r.Id)))
            .ToList();
    }
}
