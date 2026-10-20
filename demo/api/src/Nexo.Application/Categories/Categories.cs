using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Nexo.Application.Common;
using Nexo.Domain.Catalog;
using Nexo.Domain.Common;

namespace Nexo.Application.Categories;

public sealed record CategoryDto(int Id, string Slug, string Name, string? Description, int ProductCount);

public sealed record CategoryUpsertRequest(string Name, string? Slug, string? Description);

public sealed record ListCategoriesQuery : IRequest<IReadOnlyList<CategoryDto>>;

public sealed record CreateCategoryCommand(CategoryUpsertRequest Body) : IRequest<CategoryDto>;

public sealed record UpdateCategoryCommand(int Id, CategoryUpsertRequest Body) : IRequest<CategoryDto>;

public sealed record DeleteCategoryCommand(int Id) : IRequest<Unit>;

public sealed class CategoryUpsertRequestValidator : AbstractValidator<CategoryUpsertRequest>
{
    public CategoryUpsertRequestValidator()
    {
        RuleFor(x => x.Name).Must(v => !string.IsNullOrWhiteSpace(v)).WithMessage("El nombre es obligatorio.")
            .Length(2, 80).WithMessage("El nombre debe tener entre 2 y 80 caracteres.")
            .Must((request, name) => !string.IsNullOrWhiteSpace(request.Slug) || TextNormalizer.Slugify(name, 100).Length > 0)
            .WithMessage("El nombre debe contener letras o números (se usa para generar el slug).");
        RuleFor(x => x.Slug)
            .Must(slug => string.IsNullOrWhiteSpace(slug) || (slug.Length <= 100 && TextNormalizer.IsValidSlug(slug.Trim())))
            .WithMessage("El slug solo admite letras minúsculas, números y guiones.");
        RuleFor(x => x.Description).MaximumLength(300).WithMessage("La descripción admite como máximo 300 caracteres.");
    }
}

public sealed class CreateCategoryCommandValidator : AbstractValidator<CreateCategoryCommand>
{
    public CreateCategoryCommandValidator() => RuleFor(x => x.Body).NotNull().SetValidator(new CategoryUpsertRequestValidator());
}

public sealed class UpdateCategoryCommandValidator : AbstractValidator<UpdateCategoryCommand>
{
    public UpdateCategoryCommandValidator() => RuleFor(x => x.Body).NotNull().SetValidator(new CategoryUpsertRequestValidator());
}

internal sealed class CategoryHandlers(IAppDbContext db) :
    IRequestHandler<ListCategoriesQuery, IReadOnlyList<CategoryDto>>,
    IRequestHandler<CreateCategoryCommand, CategoryDto>,
    IRequestHandler<UpdateCategoryCommand, CategoryDto>,
    IRequestHandler<DeleteCategoryCommand, Unit>
{
    public async Task<IReadOnlyList<CategoryDto>> Handle(ListCategoriesQuery request, CancellationToken cancellationToken) =>
        await db.Categories.AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new CategoryDto(c.Id, c.Slug, c.Name, c.Description, db.Products.Count(p => p.CategoryId == c.Id && !p.IsDeleted)))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

    public async Task<CategoryDto> Handle(CreateCategoryCommand request, CancellationToken cancellationToken)
    {
        var slug = ResolveSlug(request.Body);
        await EnsureSlugIsFree(slug, null, cancellationToken).ConfigureAwait(false);
        var category = new Category(request.Body.Name, slug, request.Body.Description);
        db.Categories.Add(category);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return await Get(category.Id, cancellationToken).ConfigureAwait(false);
    }

    public async Task<CategoryDto> Handle(UpdateCategoryCommand request, CancellationToken cancellationToken)
    {
        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken).ConfigureAwait(false)
            ?? throw new NotFoundException("La categoría no existe.");
        var slug = ResolveSlug(request.Body);
        await EnsureSlugIsFree(slug, category.Id, cancellationToken).ConfigureAwait(false);
        category.Update(request.Body.Name, slug, request.Body.Description);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return await Get(category.Id, cancellationToken).ConfigureAwait(false);
    }

    public async Task<Unit> Handle(DeleteCategoryCommand request, CancellationToken cancellationToken)
    {
        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken).ConfigureAwait(false)
            ?? throw new NotFoundException("La categoría no existe.");
        if (await db.Products.AnyAsync(p => p.CategoryId == category.Id, cancellationToken).ConfigureAwait(false))
        {
            throw new ConflictException("No se puede eliminar una categoría que tiene productos asociados.");
        }

        db.Categories.Remove(category);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return Unit.Value;
    }

    private static string ResolveSlug(CategoryUpsertRequest body) =>
        string.IsNullOrWhiteSpace(body.Slug) ? TextNormalizer.Slugify(body.Name, 100) : body.Slug.Trim();

    private async Task EnsureSlugIsFree(string slug, int? exceptId, CancellationToken cancellationToken)
    {
        if (await db.Categories.AnyAsync(c => c.Slug == slug && c.Id != exceptId, cancellationToken).ConfigureAwait(false))
        {
            throw new ConflictException($"Ya existe una categoría con el slug «{slug}».");
        }
    }

    private async Task<CategoryDto> Get(int id, CancellationToken cancellationToken) =>
        await db.Categories.AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new CategoryDto(c.Id, c.Slug, c.Name, c.Description, db.Products.Count(p => p.CategoryId == c.Id && !p.IsDeleted)))
            .FirstAsync(cancellationToken)
            .ConfigureAwait(false);
}
