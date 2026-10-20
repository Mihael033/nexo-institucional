using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Nexo.Application.Common;
using Nexo.Infrastructure.Persistence;
using Nexo.Infrastructure.Persistence.Seed;
using Nexo.Infrastructure.Security;

namespace Nexo.Infrastructure;

public sealed class DatabaseOptions
{
    public const string SectionName = "Database";

    /// <summary>"Sqlite" (demo) or "SqlServer" (production).</summary>
    public string Provider { get; set; } = "Sqlite";

    /// <summary>Create/migrate the schema and seed demo data on startup.</summary>
    public bool InitializeOnStartup { get; set; } = true;

    /// <summary>Drop and recreate the SQLite demo database on startup.</summary>
    public bool ResetOnStartup { get; set; }

    public bool IsSqlServer => string.Equals(Provider, "SqlServer", StringComparison.OrdinalIgnoreCase);
}

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        ArgumentNullException.ThrowIfNull(configuration);
        ArgumentNullException.ThrowIfNull(environment);

        services.Configure<DatabaseOptions>(configuration.GetSection(DatabaseOptions.SectionName));
        services.Configure<SecurityOptions>(configuration.GetSection(SecurityOptions.SectionName));
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.TryAddTimeProvider();

        var database = configuration.GetSection(DatabaseOptions.SectionName).Get<DatabaseOptions>() ?? new DatabaseOptions();
        services.AddDbContext<AppDbContext>(options =>
        {
            if (database.IsSqlServer)
            {
                var connectionString = configuration.GetConnectionString("SqlServer")
                    ?? throw new InvalidOperationException("ConnectionStrings:SqlServer is required when Database:Provider is SqlServer.");
                options.UseSqlServer(connectionString, sql => sql.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery));
            }
            else
            {
                options.UseSqlite(ResolveSqlitePath(configuration.GetConnectionString("Sqlite") ?? "Data Source=demo.db", environment.ContentRootPath),
                    sqlite => sqlite.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery));
            }
        });
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddScoped<DemoSeeder>();

        services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();
        services.AddSingleton(sp => JwtSigningKey.Create(
            sp.GetRequiredService<IOptions<JwtOptions>>().Value,
            allowEphemeral: environment.IsDevelopment() || environment.IsEnvironment("Testing")));
        services.AddSingleton<ITokenService, JwtTokenService>();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<JwtOptions>, JwtSigningKey>((bearer, jwt, key) =>
            {
                bearer.MapInboundClaims = false;
                bearer.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidIssuer = jwt.Value.Issuer,
                    ValidAudience = jwt.Value.Audience,
                    IssuerSigningKey = key.Key,
                    ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
                    ClockSkew = TimeSpan.FromSeconds(30),
                    NameClaimType = "name",
                    RoleClaimType = "role",
                };
            });

        return services;
    }

    /// <summary>Creates/migrates the schema and seeds demo data (SQLite: EnsureCreated, SQL Server: migrations).</summary>
    public static async Task InitializeDatabaseAsync(this IServiceProvider services, IConfiguration configuration, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(configuration);
        var scope = services.CreateAsyncScope();
        await using (scope.ConfigureAwait(false))
        {
            var options = scope.ServiceProvider.GetRequiredService<IOptions<DatabaseOptions>>().Value;
            if (!options.InitializeOnStartup)
            {
                return;
            }

            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            if (options.IsSqlServer)
            {
                await db.Database.MigrateAsync(cancellationToken).ConfigureAwait(false);
            }
            else
            {
                if (options.ResetOnStartup)
                {
                    await db.Database.EnsureDeletedAsync(cancellationToken).ConfigureAwait(false);
                }

                await db.Database.EnsureCreatedAsync(cancellationToken).ConfigureAwait(false);
            }

            var seeder = scope.ServiceProvider.GetRequiredService<DemoSeeder>();
            await seeder.SeedAsync(configuration["Seed:DemoUserPassword"], cancellationToken).ConfigureAwait(false);
        }
    }

    private static void TryAddTimeProvider(this IServiceCollection services)
    {
        if (services.All(d => d.ServiceType != typeof(TimeProvider)))
        {
            services.AddSingleton(TimeProvider.System);
        }
    }

    private static string ResolveSqlitePath(string connectionString, string contentRoot)
    {
        var builder = new SqliteConnectionStringBuilder(connectionString);
        if (!string.IsNullOrEmpty(builder.DataSource) && builder.DataSource != ":memory:" && !Path.IsPathRooted(builder.DataSource) && builder.Mode != SqliteOpenMode.Memory)
        {
            builder.DataSource = Path.GetFullPath(Path.Combine(contentRoot, builder.DataSource));
        }

        return builder.ToString();
    }
}

/// <summary>Used by "dotnet ef" to generate SQL Server migrations (production schema).</summary>
internal sealed class SqlServerDesignTimeFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer("Server=(local);Database=NexoInstitucional;Trusted_Connection=True;TrustServerCertificate=True")
            .Options;
        return new AppDbContext(options);
    }
}
