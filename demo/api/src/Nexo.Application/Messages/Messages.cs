using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Nexo.Application.Common;
using Nexo.Domain.Messaging;

namespace Nexo.Application.Messages;

public sealed record SubmitContactCommand(
    string Name,
    string Email,
    string? Phone,
    string? Organization,
    string Subject,
    string Message,
    string? Website) : IRequest<ContactReceivedDto>;

public sealed record ContactReceivedDto(int Id, DateTime ReceivedAt);

public sealed record ContactMessageDto(
    int Id,
    string Name,
    string Email,
    string? Phone,
    string? Organization,
    string Subject,
    string Message,
    bool IsRead,
    DateTime? ReadAt,
    string? ReadBy,
    DateTime CreatedAt);

public sealed record ListMessagesQuery(string? Status, string? Q, string? Sort, int? Page, int? PageSize)
    : IRequest<PagedResult<ContactMessageDto>>, IPagedRequest;

public sealed record GetMessageQuery(int Id) : IRequest<ContactMessageDto>;

public sealed record SetMessageReadRequest(bool IsRead);

public sealed record SetMessageReadCommand(int Id, bool IsRead) : IRequest<ContactMessageDto>;

public sealed class SubmitContactCommandValidator : AbstractValidator<SubmitContactCommand>
{
    public SubmitContactCommandValidator()
    {
        RuleFor(x => x.Name).Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Ingrese su nombre.")
            .Length(2, 100).WithMessage("El nombre debe tener entre 2 y 100 caracteres.");
        RuleFor(x => x.Email).Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Ingrese su correo electrónico.")
            .MaximumLength(150).WithMessage("El correo electrónico admite como máximo 150 caracteres.")
            .EmailAddress().WithMessage("Ingrese un correo electrónico válido.");
        RuleFor(x => x.Phone).MaximumLength(30).WithMessage("El teléfono admite como máximo 30 caracteres.")
            .Matches(@"^[0-9+()\-\s]*$").WithMessage("El teléfono solo admite números, espacios y los signos + ( ) -.");
        RuleFor(x => x.Organization).MaximumLength(150).WithMessage("La institución admite como máximo 150 caracteres.");
        RuleFor(x => x.Subject).Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Ingrese el asunto.")
            .Length(3, 150).WithMessage("El asunto debe tener entre 3 y 150 caracteres.");
        RuleFor(x => x.Message).Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("Escriba su mensaje.")
            .Length(10, 2000).WithMessage("El mensaje debe tener entre 10 y 2000 caracteres.");
        RuleFor(x => x.Website).MaximumLength(200);
    }
}

public sealed class ListMessagesQueryValidator : AbstractValidator<ListMessagesQuery>
{
    public ListMessagesQueryValidator()
    {
        this.AddPagingRules();
        RuleFor(x => x.Status).MustBeOneOf("unread", "read", "all");
        RuleFor(x => x.Sort).MustBeOneOf("newest", "oldest");
        RuleFor(x => x.Q).MaximumLength(100);
    }
}

internal sealed class MessageHandlers(IAppDbContext db, TimeProvider clock, ICurrentUser currentUser) :
    IRequestHandler<SubmitContactCommand, ContactReceivedDto>,
    IRequestHandler<ListMessagesQuery, PagedResult<ContactMessageDto>>,
    IRequestHandler<GetMessageQuery, ContactMessageDto>,
    IRequestHandler<SetMessageReadCommand, ContactMessageDto>
{
    public async Task<ContactReceivedDto> Handle(SubmitContactCommand request, CancellationToken cancellationToken)
    {
        var now = clock.UtcNow();

        // Honeypot: bots fill the hidden "website" field. Pretend success and drop the message.
        if (!string.IsNullOrWhiteSpace(request.Website))
        {
            return new ContactReceivedDto(0, now);
        }

        var message = new ContactMessage(request.Name, request.Email, request.Phone, request.Organization, request.Subject, request.Message, currentUser.IpAddress, now);
        db.ContactMessages.Add(message);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new ContactReceivedDto(message.Id, now);
    }

    public async Task<PagedResult<ContactMessageDto>> Handle(ListMessagesQuery request, CancellationToken cancellationToken)
    {
        var query = db.ContactMessages.AsNoTracking();
        query = request.Status switch
        {
            "unread" => query.Where(m => !m.IsRead),
            "read" => query.Where(m => m.IsRead),
            _ => query,
        };

        if (!string.IsNullOrWhiteSpace(request.Q))
        {
            var pattern = QueryText.LikeContains(request.Q.Trim());
            query = query.Where(m =>
                EF.Functions.Like(m.Name, pattern, "\\") ||
                EF.Functions.Like(m.Email, pattern, "\\") ||
                EF.Functions.Like(m.Subject, pattern, "\\") ||
                (m.Organization != null && EF.Functions.Like(m.Organization, pattern, "\\")));
        }

        query = request.Sort == "oldest"
            ? query.OrderBy(m => m.CreatedAt).ThenBy(m => m.Id)
            : query.OrderByDescending(m => m.CreatedAt).ThenByDescending(m => m.Id);

        var page = await query.ToPagedAsync(request, cancellationToken).ConfigureAwait(false);
        return page.Map(ToDto);
    }

    public async Task<ContactMessageDto> Handle(GetMessageQuery request, CancellationToken cancellationToken)
    {
        var message = await db.ContactMessages.AsNoTracking().FirstOrDefaultAsync(m => m.Id == request.Id, cancellationToken).ConfigureAwait(false)
            ?? throw new NotFoundException("El mensaje no existe.");
        return ToDto(message);
    }

    public async Task<ContactMessageDto> Handle(SetMessageReadCommand request, CancellationToken cancellationToken)
    {
        var message = await db.ContactMessages.FirstOrDefaultAsync(m => m.Id == request.Id, cancellationToken).ConfigureAwait(false)
            ?? throw new NotFoundException("El mensaje no existe.");
        if (request.IsRead)
        {
            message.MarkAsRead(currentUser.Name ?? currentUser.Email ?? "—", clock.UtcNow());
        }
        else
        {
            message.MarkAsUnread();
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return ToDto(message);
    }

    private static ContactMessageDto ToDto(ContactMessage m) =>
        new(m.Id, m.Name, m.Email, m.Phone, m.Organization, m.Subject, m.Message, m.IsRead, m.ReadAt, m.ReadBy, m.CreatedAt);
}
