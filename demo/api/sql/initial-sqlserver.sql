IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE TABLE [AttributeDefinitions] (
        [Key] nvarchar(40) NOT NULL,
        [Label] nvarchar(80) NOT NULL,
        [SortOrder] int NOT NULL,
        CONSTRAINT [PK_AttributeDefinitions] PRIMARY KEY ([Key])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE TABLE [AuditEntries] (
        [Id] bigint NOT NULL IDENTITY,
        [OccurredAt] datetime2 NOT NULL,
        [Action] nvarchar(20) NOT NULL,
        [EntityType] nvarchar(40) NOT NULL,
        [EntityId] nvarchar(64) NULL,
        [Summary] nvarchar(500) NOT NULL,
        [UserId] int NULL,
        [UserName] nvarchar(100) NULL,
        [UserEmail] nvarchar(150) NULL,
        [IpAddress] nvarchar(45) NULL,
        [UserAgent] nvarchar(300) NULL,
        [BeforeJson] nvarchar(max) NULL,
        [AfterJson] nvarchar(max) NULL,
        CONSTRAINT [PK_AuditEntries] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE TABLE [Categories] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(80) NOT NULL,
        [Slug] nvarchar(100) NOT NULL,
        [Description] nvarchar(300) NULL,
        CONSTRAINT [PK_Categories] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE TABLE [ContactMessages] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(100) NOT NULL,
        [Email] nvarchar(150) NOT NULL,
        [Phone] nvarchar(30) NULL,
        [Organization] nvarchar(150) NULL,
        [Subject] nvarchar(150) NOT NULL,
        [Message] nvarchar(2000) NOT NULL,
        [IsRead] bit NOT NULL,
        [ReadAt] datetime2 NULL,
        [ReadBy] nvarchar(100) NULL,
        [IpAddress] nvarchar(45) NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ContactMessages] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE TABLE [ImportBatches] (
        [Id] nvarchar(32) NOT NULL,
        [UserId] int NOT NULL,
        [FileName] nvarchar(200) NOT NULL,
        [TotalRows] int NOT NULL,
        [ValidRows] int NOT NULL,
        [ValidRowsJson] nvarchar(max) NOT NULL,
        [ErrorsJson] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [ConfirmedAt] datetime2 NULL,
        CONSTRAINT [PK_ImportBatches] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE TABLE [News] (
        [Id] int NOT NULL IDENTITY,
        [Slug] nvarchar(160) NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [Excerpt] nvarchar(400) NOT NULL,
        [Html] nvarchar(max) NOT NULL,
        [CoverImageUrl] nvarchar(500) NOT NULL,
        [CoverImageAlt] nvarchar(200) NOT NULL,
        [Author] nvarchar(100) NOT NULL,
        [Tags] nvarchar(300) NOT NULL,
        [PublishedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_News] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE TABLE [Pages] (
        [Id] int NOT NULL IDENTITY,
        [Slug] nvarchar(100) NOT NULL,
        [Title] nvarchar(150) NOT NULL,
        [SeoTitle] nvarchar(150) NOT NULL,
        [SeoDescription] nvarchar(300) NOT NULL,
        [OgImageUrl] nvarchar(500) NULL,
        [BlocksJson] nvarchar(max) NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Pages] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE TABLE [Roles] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(50) NOT NULL,
        [Description] nvarchar(200) NOT NULL,
        CONSTRAINT [PK_Roles] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE TABLE [Products] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(150) NOT NULL,
        [Slug] nvarchar(160) NOT NULL,
        [CategoryId] int NOT NULL,
        [Brand] nvarchar(80) NOT NULL,
        [PriceBs] decimal(18,2) NOT NULL,
        [IsAvailable] bit NOT NULL,
        [Condition] int NOT NULL,
        [IsFeatured] bit NOT NULL,
        [Description] nvarchar(4000) NOT NULL,
        [SearchText] nvarchar(max) NOT NULL,
        [NormalizedName] nvarchar(150) NOT NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Products] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Products_Categories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [Categories] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE TABLE [RolePermission] (
        [RoleId] int NOT NULL,
        [Permission] nvarchar(50) NOT NULL,
        CONSTRAINT [PK_RolePermission] PRIMARY KEY ([RoleId], [Permission]),
        CONSTRAINT [FK_RolePermission_Roles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [Roles] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE TABLE [Users] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(100) NOT NULL,
        [Email] nvarchar(150) NOT NULL,
        [PasswordHash] nvarchar(300) NOT NULL,
        [RoleId] int NOT NULL,
        [IsActive] bit NOT NULL,
        [FailedLoginCount] int NOT NULL,
        [LockoutEnd] datetime2 NULL,
        [LastLoginAt] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Users] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Users_Roles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [Roles] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE TABLE [ProductAttributes] (
        [Id] int NOT NULL IDENTITY,
        [ProductId] int NOT NULL,
        [Key] nvarchar(40) NOT NULL,
        [Value] nvarchar(100) NOT NULL,
        CONSTRAINT [PK_ProductAttributes] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ProductAttributes_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [Products] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE TABLE [ProductImages] (
        [Id] int NOT NULL IDENTITY,
        [ProductId] int NOT NULL,
        [Url] nvarchar(500) NOT NULL,
        [Alt] nvarchar(200) NOT NULL,
        [SortOrder] int NOT NULL,
        CONSTRAINT [PK_ProductImages] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ProductImages_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [Products] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE TABLE [RefreshTokens] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [TokenHash] nvarchar(64) NOT NULL,
        [FamilyId] uniqueidentifier NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [RevokedAt] datetime2 NULL,
        [RevokedReason] nvarchar(30) NULL,
        [CreatedByIp] nvarchar(45) NULL,
        CONSTRAINT [PK_RefreshTokens] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_RefreshTokens_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AuditEntries_Action_OccurredAt] ON [AuditEntries] ([Action], [OccurredAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AuditEntries_EntityType_EntityId] ON [AuditEntries] ([EntityType], [EntityId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AuditEntries_OccurredAt] ON [AuditEntries] ([OccurredAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AuditEntries_UserId_OccurredAt] ON [AuditEntries] ([UserId], [OccurredAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Categories_Slug] ON [Categories] ([Slug]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ContactMessages_CreatedAt] ON [ContactMessages] ([CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ContactMessages_IsRead_CreatedAt] ON [ContactMessages] ([IsRead], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ImportBatches_UserId_CreatedAt] ON [ImportBatches] ([UserId], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_News_PublishedAt] ON [News] ([PublishedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_News_Slug] ON [News] ([Slug]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Pages_Slug] ON [Pages] ([Slug]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ProductAttributes_Key_Value] ON [ProductAttributes] ([Key], [Value]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ProductAttributes_ProductId_Key] ON [ProductAttributes] ([ProductId], [Key]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ProductImages_ProductId_SortOrder] ON [ProductImages] ([ProductId], [SortOrder]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Products_Brand] ON [Products] ([Brand]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Products_CategoryId] ON [Products] ([CategoryId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Products_IsDeleted_CategoryId_CreatedAt] ON [Products] ([IsDeleted], [CategoryId], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Products_IsDeleted_IsFeatured] ON [Products] ([IsDeleted], [IsFeatured]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Products_IsDeleted_NormalizedName] ON [Products] ([IsDeleted], [NormalizedName]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Products_IsDeleted_PriceBs] ON [Products] ([IsDeleted], [PriceBs]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Products_Slug] ON [Products] ([Slug]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_RefreshTokens_FamilyId] ON [RefreshTokens] ([FamilyId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_RefreshTokens_TokenHash] ON [RefreshTokens] ([TokenHash]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_RefreshTokens_UserId] ON [RefreshTokens] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Roles_Name] ON [Roles] ([Name]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Users_Email] ON [Users] ([Email]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Users_RoleId] ON [Users] ([RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    CREATE TRIGGER [dbo].[TR_AuditEntries_Immutable] ON [dbo].[AuditEntries]
    INSTEAD OF UPDATE, DELETE
    AS
    BEGIN
        SET NOCOUNT ON;
        THROW 51000, 'AuditEntries is append-only.', 1;
    END
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261017134538_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261017134538_InitialCreate', N'10.0.13');
END;

COMMIT;
GO

