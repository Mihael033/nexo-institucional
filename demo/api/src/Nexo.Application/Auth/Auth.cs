using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Nexo.Application.Auditing;
using Nexo.Application.Common;
using Nexo.Domain.Auditing;
using Nexo.Domain.Identity;

namespace Nexo.Application.Auth;

public sealed record AuthUserDto(int Id, string Name, string Email, string Role, IReadOnlyList<string> Permissions);

public sealed record LoginResponse(string AccessToken, string TokenType, int ExpiresIn, AuthUserDto User);

/// <summary>Login/refresh outcome. The refresh token goes to an httpOnly cookie, never to the JSON body.</summary>
public sealed record AuthResult(LoginResponse Response, string RefreshToken, DateTime RefreshTokenExpiresAt);

public sealed record LoginCommand(string Email, string Password) : IRequest<AuthResult>;

public sealed record RefreshCommand(string? RefreshToken) : IRequest<AuthResult>;

public sealed record LogoutCommand(string? RefreshToken) : IRequest<Unit>;

public sealed record GetMeQuery : IRequest<AuthUserDto>;

public sealed class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Email).Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Ingrese su correo electrónico.")
            .MaximumLength(150).EmailAddress().WithMessage("Ingrese un correo electrónico válido.");
        RuleFor(x => x.Password).Must(v => !string.IsNullOrEmpty(v)).WithMessage("Ingrese su contraseña.")
            .MaximumLength(128);
    }
}

internal sealed class AuthHandlers(
    IAppDbContext db,
    TimeProvider clock,
    IPasswordHasher hasher,
    ITokenService tokens,
    ICurrentUser currentUser) :
    IRequestHandler<LoginCommand, AuthResult>,
    IRequestHandler<RefreshCommand, AuthResult>,
    IRequestHandler<LogoutCommand, Unit>,
    IRequestHandler<GetMeQuery, AuthUserDto>
{
    private static string? _dummyHash;

    public async Task<AuthResult> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var email = User.NormalizeEmail(request.Email);
        var now = clock.UtcNow();
        var user = await UsersWithPermissions().FirstOrDefaultAsync(u => u.Email == email, cancellationToken).ConfigureAwait(false);

        if (user is null)
        {
            // Same cost as a real verification so response time does not reveal which e-mails exist.
            hasher.Verify(request.Password, _dummyHash ??= hasher.Hash(Guid.NewGuid().ToString()));
            await RecordFailure(null, email, "usuario inexistente", cancellationToken).ConfigureAwait(false);
            throw new InvalidCredentialsException();
        }

        if (user.IsLockedOut(now))
        {
            await RecordFailure(user, email, "cuenta bloqueada", cancellationToken).ConfigureAwait(false);
            throw new LockedOutException(user.LockoutEnd!.Value);
        }

        if (!hasher.Verify(request.Password, user.PasswordHash) || !user.IsActive)
        {
            var locked = user.RegisterFailedLogin(now);
            await RecordFailure(user, email, locked ? "contraseña incorrecta; cuenta bloqueada" : "contraseña incorrecta", cancellationToken).ConfigureAwait(false);
            if (locked)
            {
                throw new LockedOutException(user.LockoutEnd!.Value);
            }

            throw new InvalidCredentialsException();
        }

        user.RegisterSuccessfulLogin(now);
        var result = Issue(user, Guid.NewGuid(), now);
        db.Record(clock, ActorFor(user), AuditAction.Login, AuditText.User, user.Id.ToString(System.Globalization.CultureInfo.InvariantCulture), $"Inició sesión: {user.Email}");
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return result;
    }

    public async Task<AuthResult> Handle(RefreshCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken) || request.RefreshToken.Length > 200)
        {
            throw new InvalidRefreshTokenException();
        }

        var now = clock.UtcNow();
        var hash = tokens.HashRefreshToken(request.RefreshToken);
        var token = await db.RefreshTokens
            .Include(t => t.User).ThenInclude(u => u.Role).ThenInclude(r => r.Permissions)
            .FirstOrDefaultAsync(t => t.TokenHash == hash, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new InvalidRefreshTokenException();

        if (token.RevokedAt is not null)
        {
            // A rotated token was presented again: assume theft and kill the whole session family.
            await RevokeFamily(token.FamilyId, now, "reuse_detected", cancellationToken).ConfigureAwait(false);
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            throw new InvalidRefreshTokenException();
        }

        if (!token.IsActive(now) || !token.User.IsActive || token.User.IsLockedOut(now))
        {
            token.Revoke(now, "invalid");
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            throw new InvalidRefreshTokenException();
        }

        token.Revoke(now, "rotated");
        var result = Issue(token.User, token.FamilyId, now);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return result;
    }

    public async Task<Unit> Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken) || request.RefreshToken.Length > 200)
        {
            return Unit.Value;
        }

        var now = clock.UtcNow();
        var hash = tokens.HashRefreshToken(request.RefreshToken);
        var token = await db.RefreshTokens.Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == hash, cancellationToken)
            .ConfigureAwait(false);
        if (token is null || !token.IsActive(now))
        {
            return Unit.Value;
        }

        await RevokeFamily(token.FamilyId, now, "logout", cancellationToken).ConfigureAwait(false);
        db.Record(clock, ActorFor(token.User), AuditAction.Logout, AuditText.User, token.UserId.ToString(System.Globalization.CultureInfo.InvariantCulture), $"Cerró sesión: {token.User.Email}");
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return Unit.Value;
    }

    public async Task<AuthUserDto> Handle(GetMeQuery request, CancellationToken cancellationToken)
    {
        var user = await UsersWithPermissions().AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == currentUser.UserId && u.IsActive, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new NotFoundException("El usuario no existe.");
        return ToDto(user);
    }

    internal static AuthUserDto ToDto(User user) => new(
        user.Id,
        user.Name,
        user.Email,
        user.Role.Name,
        user.Role.Permissions.Select(p => p.Permission).Order(StringComparer.Ordinal).ToList());

    private IQueryable<User> UsersWithPermissions() =>
        db.Users.Include(u => u.Role).ThenInclude(r => r.Permissions);

    private AuthResult Issue(User user, Guid familyId, DateTime now)
    {
        var dto = ToDto(user);
        var access = tokens.CreateAccessToken(user, dto.Permissions.ToList());
        var refresh = tokens.CreateRefreshToken();
        var expiresAt = now.Add(tokens.RefreshTokenLifetime);
        db.RefreshTokens.Add(new RefreshToken(user.Id, refresh.Hash, familyId, now, expiresAt, currentUser.IpAddress));
        return new AuthResult(new LoginResponse(access.Token, "Bearer", access.ExpiresInSeconds, dto), refresh.RawToken, expiresAt);
    }

    private async Task RevokeFamily(Guid familyId, DateTime now, string reason, CancellationToken cancellationToken)
    {
        var family = await db.RefreshTokens
            .Where(t => t.FamilyId == familyId && t.RevokedAt == null)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        foreach (var member in family)
        {
            member.Revoke(now, reason);
        }
    }

    private async Task RecordFailure(User? user, string email, string reason, CancellationToken cancellationToken)
    {
        var actor = new AuditActor(user?.Id, user?.Name, user?.Email, currentUser.IpAddress, currentUser.UserAgent);
        var attempted = email.Length > 150 ? email[..150] : email;
        db.Record(
            clock,
            actor,
            AuditAction.LoginFailed,
            AuditText.User,
            user?.Id.ToString(System.Globalization.CultureInfo.InvariantCulture),
            $"Intento de inicio de sesión fallido para «{attempted}» ({reason})",
            after: new { email = attempted, reason });
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    private AuditActor ActorFor(User user) => new(user.Id, user.Name, user.Email, currentUser.IpAddress, currentUser.UserAgent);
}
