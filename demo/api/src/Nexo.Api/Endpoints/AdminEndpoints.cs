using System.Text;
using Microsoft.AspNetCore.Mvc;
using Nexo.Application.Auditing;
using Nexo.Application.Categories;
using Nexo.Application.Common;
using Nexo.Application.Dashboard;
using Nexo.Application.Imports;
using Nexo.Application.Messages;
using Nexo.Application.Products;
using Nexo.Application.Users;
using Nexo.Domain.Identity;

namespace Nexo.Api.Endpoints;

internal static class AdminEndpoints
{
    public const long ImportRequestLimit = 3 * 1024 * 1024;

    public static RouteGroupBuilder MapAdminEndpoints(this RouteGroupBuilder api)
    {
        var admin = api.MapGroup("/admin")
            .RequireAuthorization()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden);

        admin.MapGet("/dashboard", async (ISender sender, CancellationToken ct) => TypedResults.Ok(await sender.Send(new GetDashboardQuery(), ct)))
            .WithTags("Panel").WithName("GetDashboard").RequireAuthorization(Permissions.DashboardRead);

        MapProducts(admin.MapGroup("/products").WithTags("Panel: productos"));
        MapImports(admin.MapGroup("/products/import").WithTags("Panel: importación CSV"));
        MapCategories(admin.MapGroup("/categories").WithTags("Panel: categorías"));
        MapMessages(admin.MapGroup("/messages").WithTags("Panel: mensajes"));
        MapUsers(admin);
        MapAudit(admin.MapGroup("/audit").WithTags("Panel: auditoría").RequireAuthorization(Permissions.AuditRead));
        return api;
    }

    private static void MapProducts(RouteGroupBuilder products)
    {
        products.MapGet("/", async ([AsParameters] ProductQueryParameters query, [FromQuery(Name = "status")] string? status, ISender sender, CancellationToken ct) =>
                TypedResults.Ok(await sender.Send(query.ToAdminQuery(status), ct)))
            .WithName("AdminListProducts").RequireAuthorization(Permissions.ProductsRead)
            .ProducesProblem(StatusCodes.Status400BadRequest);

        products.MapGet("/{id:int}", async (int id, ISender sender, CancellationToken ct) => TypedResults.Ok(await sender.Send(new AdminGetProductQuery(id), ct)))
            .WithName("AdminGetProduct").RequireAuthorization(Permissions.ProductsRead)
            .ProducesProblem(StatusCodes.Status404NotFound);

        products.MapPost("/", async (ProductUpsertRequest body, ISender sender, CancellationToken ct) =>
            {
                var created = await sender.Send(new CreateProductCommand(body), ct);
                return TypedResults.Created($"/api/v1/admin/products/{created.Id}", created);
            })
            .WithName("CreateProduct").RequireAuthorization(Permissions.ProductsWrite)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict);

        products.MapPut("/{id:int}", async (int id, ProductUpsertRequest body, ISender sender, CancellationToken ct) =>
                TypedResults.Ok(await sender.Send(new UpdateProductCommand(id, body), ct)))
            .WithName("UpdateProduct").RequireAuthorization(Permissions.ProductsWrite)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        products.MapDelete("/{id:int}", async (int id, ISender sender, CancellationToken ct) =>
            {
                await sender.Send(new DeleteProductCommand(id), ct);
                return TypedResults.NoContent();
            })
            .WithName("DeleteProduct").WithSummary("Eliminación lógica (soft delete).").RequireAuthorization(Permissions.ProductsWrite)
            .ProducesProblem(StatusCodes.Status404NotFound);

        products.MapPost("/{id:int}/restore", async (int id, ISender sender, CancellationToken ct) =>
                TypedResults.Ok(await sender.Send(new RestoreProductCommand(id), ct)))
            .WithName("RestoreProduct").RequireAuthorization(Permissions.ProductsWrite)
            .ProducesProblem(StatusCodes.Status404NotFound);
    }

    private static void MapImports(RouteGroupBuilder import)
    {
        import.RequireAuthorization(Permissions.ProductsImport);

        import.MapGet("/template", async (ISender sender, CancellationToken ct) => Csv(await sender.Send(new GetImportTemplateQuery(), ct)))
            .WithName("GetImportTemplate").Produces(StatusCodes.Status200OK, contentType: "text/csv");

        // Bearer-token API (no auth cookies on this route), so antiforgery tokens are not needed for the upload.
        import.MapPost("/validate", async (IFormFile file, ISender sender, CancellationToken ct) =>
            {
                if (file.Length > Application.Imports.ValidateImportCommandValidator.MaxBytes)
                {
                    throw new BadRequestException("El archivo supera el tamaño máximo de 2 MB.");
                }

                using var buffer = new MemoryStream();
                await file.CopyToAsync(buffer, ct);
                return TypedResults.Ok(await sender.Send(new ValidateImportCommand(file.FileName, buffer.ToArray()), ct));
            })
            .WithName("ValidateImport").WithSummary("Valida el CSV y devuelve la vista previa línea por línea (no graba productos).")
            .DisableAntiforgery()
            .WithMetadata(new RequestSizeLimitAttribute(ImportRequestLimit))
            .ProducesProblem(StatusCodes.Status400BadRequest);

        import.MapGet("/{importId}/errors", async (string importId, ISender sender, CancellationToken ct) => Csv(await sender.Send(new GetImportErrorsQuery(importId), ct)))
            .WithName("GetImportErrors").Produces(StatusCodes.Status200OK, contentType: "text/csv")
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status410Gone);

        import.MapPost("/{importId}/confirm", async (string importId, ISender sender, CancellationToken ct) =>
                TypedResults.Ok(await sender.Send(new ConfirmImportCommand(importId), ct)))
            .WithName("ConfirmImport").WithSummary("Graba las filas válidas del lote en una transacción.")
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status410Gone);
    }

    private static void MapCategories(RouteGroupBuilder categories)
    {
        categories.RequireAuthorization(Permissions.CategoriesWrite);

        categories.MapPost("/", async (CategoryUpsertRequest body, ISender sender, CancellationToken ct) =>
            {
                var created = await sender.Send(new CreateCategoryCommand(body), ct);
                return TypedResults.Created($"/api/v1/categories/{created.Slug}", created);
            })
            .WithName("CreateCategory")
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict);

        categories.MapPut("/{id:int}", async (int id, CategoryUpsertRequest body, ISender sender, CancellationToken ct) =>
                TypedResults.Ok(await sender.Send(new UpdateCategoryCommand(id, body), ct)))
            .WithName("UpdateCategory")
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        categories.MapDelete("/{id:int}", async (int id, ISender sender, CancellationToken ct) =>
            {
                await sender.Send(new DeleteCategoryCommand(id), ct);
                return TypedResults.NoContent();
            })
            .WithName("DeleteCategory")
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);
    }

    private static void MapMessages(RouteGroupBuilder messages)
    {
        messages.MapGet("/", async (string? status, string? q, string? sort, int? page, int? pageSize, ISender sender, CancellationToken ct) =>
                TypedResults.Ok(await sender.Send(new ListMessagesQuery(status, q, sort, page, pageSize), ct)))
            .WithName("ListMessages").RequireAuthorization(Permissions.MessagesRead)
            .ProducesProblem(StatusCodes.Status400BadRequest);

        messages.MapGet("/{id:int}", async (int id, ISender sender, CancellationToken ct) => TypedResults.Ok(await sender.Send(new GetMessageQuery(id), ct)))
            .WithName("GetMessage").RequireAuthorization(Permissions.MessagesRead)
            .ProducesProblem(StatusCodes.Status404NotFound);

        messages.MapPatch("/{id:int}", async (int id, SetMessageReadRequest body, ISender sender, CancellationToken ct) =>
                TypedResults.Ok(await sender.Send(new SetMessageReadCommand(id, body.IsRead), ct)))
            .WithName("SetMessageRead").RequireAuthorization(Permissions.MessagesWrite)
            .ProducesProblem(StatusCodes.Status404NotFound);
    }

    private static void MapUsers(RouteGroupBuilder admin)
    {
        var users = admin.MapGroup(string.Empty).WithTags("Panel: usuarios").RequireAuthorization(Permissions.UsersRead);

        users.MapGet("/users", async (string? q, string? role, int? page, int? pageSize, ISender sender, CancellationToken ct) =>
                TypedResults.Ok(await sender.Send(new ListUsersQuery(q, role, page, pageSize), ct)))
            .WithName("ListUsers").ProducesProblem(StatusCodes.Status400BadRequest);

        users.MapGet("/roles", async (ISender sender, CancellationToken ct) => TypedResults.Ok(await sender.Send(new ListRolesQuery(), ct)))
            .WithName("ListRoles");
    }

    private static void MapAudit(RouteGroupBuilder audit)
    {
        audit.MapGet("/", async (
                int? userId,
                string? action,
                string? entityType,
                string? entityId,
                string? from,
                string? to,
                string? q,
                string? sort,
                int? page,
                int? pageSize,
                ISender sender,
                CancellationToken ct) =>
                TypedResults.Ok(await sender.Send(new ListAuditQuery(userId, action, entityType, entityId, from, to, q, sort, page, pageSize), ct)))
            .WithName("ListAudit").ProducesProblem(StatusCodes.Status400BadRequest);

        audit.MapGet("/meta", async (ISender sender, CancellationToken ct) => TypedResults.Ok(await sender.Send(new GetAuditMetaQuery(), ct)))
            .WithName("GetAuditMeta");

        audit.MapGet("/{id:long}", async (long id, ISender sender, CancellationToken ct) => TypedResults.Ok(await sender.Send(new GetAuditEntryQuery(id), ct)))
            .WithName("GetAuditEntry").ProducesProblem(StatusCodes.Status404NotFound);
    }

    private static IResult Csv(CsvFile file) =>
        TypedResults.File(Encoding.UTF8.GetBytes(file.Content), "text/csv; charset=utf-8", file.FileName);
}
