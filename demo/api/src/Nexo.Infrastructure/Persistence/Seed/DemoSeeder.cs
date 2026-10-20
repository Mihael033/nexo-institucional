using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Nexo.Application.Auditing;
using Nexo.Application.Common;
using Nexo.Domain.Auditing;
using Nexo.Domain.Catalog;
using Nexo.Domain.Content;
using Nexo.Domain.Identity;
using Nexo.Domain.Messaging;

namespace Nexo.Infrastructure.Persistence.Seed;

/// <summary>Demo data for "Nexo Institucional" (fictional Bolivian organization).</summary>
internal sealed partial class DemoSeeder(AppDbContext db, IPasswordHasher hasher, TimeProvider clock, ILogger<DemoSeeder> logger)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private static readonly Dictionary<string, string> CategoryDescriptions = new()
    {
        ["equipos-de-red"] = "Routers, switches y equipos de conectividad para redes institucionales.",
        ["mobiliario-de-oficina"] = "Escritorios, sillas ergonómicas y archivadores para oficinas públicas y privadas.",
        ["vehiculos"] = "Vehículos utilitarios y de transporte para flotas institucionales.",
        ["herramientas"] = "Herramientas eléctricas y manuales para mantenimiento de infraestructura.",
        ["electrodomesticos"] = "Equipamiento para comedores, salas de descanso y servicios generales.",
    };

    public async Task SeedAsync(string? demoPassword, CancellationToken cancellationToken)
    {
        if (await db.Roles.AnyAsync(cancellationToken).ConfigureAwait(false))
        {
            return;
        }

        db.SuppressAuditing = true;
        try
        {
            var now = clock.GetUtcNow().UtcDateTime;
            var (admin, editor) = SeedIdentity(demoPassword, now);
            db.AttributeDefinitions.AddRange(
                new AttributeDefinition("ubicacion", "Ubicación", 1),
                new AttributeDefinition("garantiaMeses", "Garantía (meses)", 2));
            var products = await SeedCatalog(cancellationToken).ConfigureAwait(false);
            SeedNews(now);
            SeedPages(now);
            var messages = SeedMessages(now);
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

            if (admin is not null && editor is not null)
            {
                SeedAuditHistory(admin, editor, products, messages, now);
                await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            }

            LogSeeded(logger, products.Count);
        }
        finally
        {
            db.SuppressAuditing = false;
        }
    }

    private (User? Admin, User? Editor) SeedIdentity(string? demoPassword, DateTime now)
    {
        var adminRole = new Role(Role.Admin, "Acceso total a la plataforma.", Permissions.All);
        var editorRole = new Role(Role.Editor, "Gestiona contenido, productos y mensajes. Sin acceso a usuarios ni auditoría.",
            Permissions.All.Except([Permissions.UsersRead, Permissions.AuditRead]));
        db.Roles.AddRange(adminRole, editorRole);

        if (string.IsNullOrWhiteSpace(demoPassword))
        {
            LogNoDemoUsers(logger);
            return (null, null);
        }

        var admin = new User("Ana Quispe", "admin@nexo.com.bo", hasher.Hash(demoPassword), adminRole, now.AddDays(-60));
        var editor = new User("Carlos Mamani", "editor@nexo.com.bo", hasher.Hash(demoPassword), editorRole, now.AddDays(-45));
        db.Users.AddRange(admin, editor);
        return (admin, editor);
    }

    private async Task<List<Product>> SeedCatalog(CancellationToken cancellationToken)
    {
        var assembly = typeof(DemoSeeder).Assembly;
        var resource = assembly.GetManifestResourceNames().Single(n => n.EndsWith("productos.json", StringComparison.Ordinal));
        var stream = assembly.GetManifestResourceStream(resource)!;
        await using (stream.ConfigureAwait(false))
        {
            var items = await JsonSerializer.DeserializeAsync<List<SeedProduct>>(stream, Json, cancellationToken).ConfigureAwait(false) ?? [];
            var categories = items
                .Select(i => i.Categoria)
                .DistinctBy(c => c.Slug)
                .ToDictionary(c => c.Slug, c => new Category(c.Nombre, c.Slug, CategoryDescriptions.GetValueOrDefault(c.Slug)));
            db.Categories.AddRange(categories.Values);
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

            var products = items.Select(i => new Product(
                new ProductData(
                    i.Nombre,
                    i.Slug,
                    categories[i.Categoria.Slug].Id,
                    i.Marca,
                    i.PrecioBs,
                    i.Disponible,
                    i.Estado == "Usado" ? ProductCondition.Used : ProductCondition.New,
                    i.Destacado,
                    i.Descripcion,
                    i.Imagenes,
                    i.Atributos.ToDictionary(a => a.Key, a => a.Value.ToString(), StringComparer.Ordinal)),
                i.CreadoEn.ToUniversalTime())).ToList();
            db.Products.AddRange(products);
            return products;
        }
    }

    private void SeedNews(DateTime now)
    {
        db.News.AddRange(
            new NewsArticle(
                "nuevo-centro-de-distribucion-en-el-alto",
                "Nexo Institucional inaugura su centro de distribución en El Alto",
                "Con 2.500 m² de almacenes, el nuevo centro reduce a 48 horas los tiempos de entrega para instituciones de La Paz y el altiplano.",
                """
                <p>Nexo Institucional puso en funcionamiento su nuevo <strong>centro de distribución en El Alto</strong>, una inversión que permitirá atender con mayor rapidez a las instituciones de La Paz, Oruro y el altiplano.</p>
                <h2>Entregas en 48 horas</h2>
                <p>El centro cuenta con 2.500 m² de almacenes, zona de control de calidad y una flota propia de vehículos utilitarios. Gracias a esta infraestructura, los pedidos de mobiliario y equipos de red se entregarán en un plazo máximo de <em>48 horas hábiles</em>.</p>
                <ul><li>Almacenamiento con control de inventario en tiempo real.</li><li>Armado e instalación en sitio.</li><li>Atención de lunes a sábado.</li></ul>
                <blockquote>Queremos que cada institución reciba lo que necesita, cuando lo necesita.</blockquote>
                """,
                "https://picsum.photos/seed/nexo-news-1/1200/630",
                "Almacén del nuevo centro de distribución en El Alto",
                "Equipo de Comunicación",
                ["Institucional", "Logística"],
                now.AddDays(-4)),
            new NewsArticle(
                "guia-renovacion-equipos-de-red",
                "Guía práctica para renovar los equipos de red de su institución",
                "Le compartimos cinco recomendaciones para planificar la actualización de routers, switches y puntos de acceso sin interrumpir la atención al público.",
                """
                <p>La conectividad es hoy un servicio crítico. Si su institución planifica renovar su infraestructura de red, estas recomendaciones le ayudarán a hacerlo de forma ordenada.</p>
                <h2>1. Inventario y diagnóstico</h2>
                <p>Antes de comprar, levante un inventario de los equipos actuales, su antigüedad y su nivel de uso.</p>
                <h2>2. Priorice la seguridad</h2>
                <p>Elija equipos con soporte de <strong>WPA3</strong> y actualizaciones de firmware garantizadas.</p>
                <h2>3. Planifique ventanas de mantenimiento</h2>
                <p>Programe los cambios fuera del horario de atención para no afectar a los usuarios.</p>
                <ol><li>Defina un responsable técnico.</li><li>Documente la configuración.</li><li>Pruebe antes de poner en producción.</li></ol>
                """,
                "https://picsum.photos/seed/nexo-news-2/1200/630",
                "Técnico configurando un rack de red",
                "Área Técnica",
                ["Tecnología", "Guías"],
                now.AddDays(-12)),
            new NewsArticle(
                "programa-de-mantenimiento-preventivo-2026",
                "Lanzamos el programa de mantenimiento preventivo 2026",
                "Las instituciones clientes de Cochabamba, Santa Cruz y Sucre ya pueden agendar visitas técnicas sin costo adicional durante el primer año.",
                """
                <p>Como parte de nuestro compromiso con el servicio posventa, lanzamos el <strong>programa de mantenimiento preventivo 2026</strong> para equipos adquiridos a través de Nexo Institucional.</p>
                <p>El programa incluye revisión técnica, limpieza y ajuste de equipos, además de un informe del estado de cada activo para su unidad administrativa.</p>
                <h3>¿Cómo agendar?</h3>
                <p>Escríbanos desde la página de <a href="/contacto">contacto</a> indicando su institución y la cantidad de equipos.</p>
                """,
                "https://picsum.photos/seed/nexo-news-3/1200/630",
                "Técnico realizando mantenimiento a un equipo",
                "Equipo de Comunicación",
                ["Servicios", "Posventa"],
                now.AddDays(-25)));
    }

    private void SeedPages(DateTime now)
    {
        static object Block(string id, string type, object data) => new { id, type, data };
        static object Cta(string label, string href) => new { label, href };
        static object Img(string url, string alt) => new { url, alt };

        object[] home =
        [
            Block("home-hero", "hero", new
            {
                eyebrow = "Proveedor institucional en Bolivia",
                title = "Conectamos instituciones con soluciones",
                subtitle = "Equipamiento, mobiliario, vehículos y tecnología para entidades públicas y privadas, con entrega en los nueve departamentos y soporte local.",
                primaryCta = Cta("Ver catálogo", "/catalogo"),
                secondaryCta = Cta("Solicitar cotización", "/contacto"),
                image = Img("https://picsum.photos/seed/nexo-hero/1600/900", "Equipo de Nexo Institucional en una oficina moderna"),
            }),
            Block("home-about", "richText", new
            {
                title = "Quiénes somos",
                html = "<p>Somos una organización boliviana que acompaña a instituciones en la <strong>adquisición, entrega y mantenimiento</strong> de bienes. Trabajamos con transparencia, plazos claros y atención personalizada.</p>",
            }),
            Block("home-services", "features", new
            {
                title = "Nuestros servicios",
                subtitle = "Todo lo que su institución necesita en un solo proveedor.",
                items = new object[]
                {
                    new { icon = "truck", title = "Logística nacional", text = "Entregas en La Paz, Santa Cruz, Cochabamba y todo el país.", href = "/servicios" },
                    new { icon = "shield-check", title = "Garantía y soporte", text = "Garantía local y soporte técnico con respuesta en 24 horas.", href = "/servicios" },
                    new { icon = "file-text", title = "Acompañamiento en contrataciones", text = "Documentación completa para procesos de contratación pública.", href = "/servicios" },
                    new { icon = "wrench", title = "Mantenimiento", text = "Planes preventivos y correctivos para sus equipos.", href = "/servicios" },
                },
            }),
            Block("home-stats", "stats", new
            {
                title = "Nexo en números",
                items = new object[]
                {
                    new { value = 12, prefix = (string?)null, suffix = " años", label = "de experiencia" },
                    new { value = 350, prefix = "+", suffix = (string?)null, label = "instituciones atendidas" },
                    new { value = 9, prefix = (string?)null, suffix = (string?)null, label = "departamentos con cobertura" },
                    new { value = 98, prefix = (string?)null, suffix = "%", label = "de clientes satisfechos" },
                },
            }),
            Block("home-cta", "cta", new
            {
                title = "¿Necesita una cotización?",
                text = "Cuéntenos qué necesita su institución y le responderemos en menos de 24 horas hábiles.",
                button = Cta("Contáctenos", "/contacto"),
            }),
        ];

        object[] about =
        [
            Block("about-hero", "hero", new
            {
                eyebrow = "Nosotros",
                title = "Más de una década al servicio de las instituciones bolivianas",
                subtitle = "Nacimos en La Paz con una idea simple: que comprar para una institución sea claro, ágil y confiable.",
                primaryCta = (object?)null,
                secondaryCta = (object?)null,
                image = Img("https://picsum.photos/seed/nexo-about/1600/900", "Oficinas de Nexo Institucional en La Paz"),
            }),
            Block("about-story", "richText", new
            {
                title = "Nuestra historia",
                html = "<p>Nexo Institucional comenzó en 2014 como un pequeño proveedor de mobiliario de oficina. Hoy atendemos a colegios, clínicas, cooperativas, fundaciones y entidades públicas en todo el país.</p><p>Nuestro diferencial es el <strong>acompañamiento completo</strong>: desde la cotización hasta la instalación y el mantenimiento.</p>",
            }),
            Block("about-timeline", "timeline", new
            {
                title = "Nuestro recorrido",
                items = new object[]
                {
                    new { year = "2014", title = "Fundación en La Paz", text = "Iniciamos con mobiliario de oficina para instituciones educativas." },
                    new { year = "2017", title = "Sucursal en Santa Cruz de la Sierra", text = "Ampliamos la cobertura al oriente del país." },
                    new { year = "2020", title = "Llegada a Cochabamba", text = "Sumamos equipos de red y servicio técnico especializado." },
                    new { year = "2023", title = "Centro de distribución en El Alto", text = "Entregas en 48 horas para el altiplano." },
                    new { year = "2026", title = "Plataforma digital", text = "Catálogo en línea y atención integral para nuestros clientes." },
                },
            }),
            Block("about-values", "features", new
            {
                title = "Nuestros valores",
                subtitle = (string?)null,
                items = new object[]
                {
                    new { icon = "eye", title = "Transparencia", text = "Precios claros y procesos documentados.", href = (string?)null },
                    new { icon = "handshake", title = "Compromiso", text = "Cumplimos los plazos que acordamos.", href = (string?)null },
                    new { icon = "lightbulb", title = "Innovación", text = "Buscamos siempre la mejor solución tecnológica.", href = (string?)null },
                    new { icon = "map-pin", title = "Cercanía", text = "Equipos locales en las principales ciudades.", href = (string?)null },
                },
            }),
            Block("about-gallery", "gallery", new
            {
                title = "Nuestro equipo en acción",
                images = new object[]
                {
                    Img("https://picsum.photos/seed/nexo-team-1/800/600", "Equipo de logística preparando un pedido"),
                    Img("https://picsum.photos/seed/nexo-team-2/800/600", "Instalación de mobiliario en una oficina"),
                    Img("https://picsum.photos/seed/nexo-team-3/800/600", "Técnico configurando equipos de red"),
                    Img("https://picsum.photos/seed/nexo-team-4/800/600", "Reunión con un cliente institucional"),
                },
            }),
            Block("about-cta", "cta", new { title = "Trabajemos juntos", text = "Conozca cómo podemos apoyar a su institución.", button = Cta("Ver servicios", "/servicios") }),
        ];

        object[] services =
        [
            Block("services-hero", "hero", new
            {
                eyebrow = "Servicios",
                title = "Soluciones completas para su institución",
                subtitle = "Le acompañamos en todo el ciclo: asesoría, provisión, entrega, instalación y mantenimiento.",
                primaryCta = Cta("Solicitar cotización", "/contacto"),
                secondaryCta = Cta("Ver catálogo", "/catalogo"),
                image = Img("https://picsum.photos/seed/nexo-services/1600/900", "Equipo técnico de Nexo Institucional"),
            }),
            Block("services-list", "features", new
            {
                title = "Lo que hacemos",
                subtitle = "Servicios pensados para las necesidades de entidades públicas y privadas.",
                items = new object[]
                {
                    new { icon = "clipboard-list", title = "Asesoría de compras", text = "Le ayudamos a definir especificaciones técnicas y presupuestos.", href = (string?)null },
                    new { icon = "package", title = "Provisión de bienes", text = "Mobiliario, equipos de red, herramientas, electrodomésticos y vehículos.", href = "/catalogo" },
                    new { icon = "truck", title = "Logística y entrega", text = "Cobertura nacional con flota propia y seguimiento del pedido.", href = (string?)null },
                    new { icon = "hammer", title = "Instalación", text = "Armado de mobiliario y puesta en marcha de equipos en sitio.", href = (string?)null },
                    new { icon = "wrench", title = "Mantenimiento", text = "Planes preventivos y correctivos con informes técnicos.", href = (string?)null },
                    new { icon = "headset", title = "Soporte posventa", text = "Mesa de ayuda con respuesta en menos de 24 horas.", href = (string?)null },
                },
            }),
            Block("services-process", "richText", new
            {
                title = "¿Cómo trabajamos?",
                html = "<ol><li><strong>Solicitud:</strong> usted nos cuenta su necesidad.</li><li><strong>Propuesta:</strong> enviamos una cotización detallada.</li><li><strong>Entrega:</strong> coordinamos fecha, lugar e instalación.</li><li><strong>Seguimiento:</strong> le acompañamos con soporte y mantenimiento.</li></ol>",
            }),
            Block("services-cta", "cta", new { title = "¿Listo para empezar?", text = "Solicite una cotización sin compromiso.", button = Cta("Contáctenos", "/contacto") }),
        ];

        object[] contact =
        [
            Block("contact-hero", "hero", new
            {
                eyebrow = "Contacto",
                title = "Hablemos de su próximo proyecto",
                subtitle = "Complete el formulario y un asesor se comunicará con usted en menos de 24 horas hábiles.",
                primaryCta = (object?)null,
                secondaryCta = (object?)null,
                image = (object?)null,
            }),
            Block("contact-info", "contactInfo", new
            {
                title = "Nuestras oficinas",
                text = "Atendemos en La Paz, Santa Cruz de la Sierra y Cochabamba. También puede escribirnos por WhatsApp.",
            }),
        ];

        db.Pages.AddRange(
            new Page("inicio", "Inicio", "Nexo Institucional | Conectamos instituciones con soluciones", "Productos y bienes para instituciones públicas y privadas de Bolivia: mobiliario, equipos de red, vehículos y más.", "https://picsum.photos/seed/nexo-hero/1200/630", Serialize(home), now),
            new Page("nosotros", "Nosotros", "Nosotros | Nexo Institucional", "Conozca la historia, los valores y el equipo de Nexo Institucional.", "https://picsum.photos/seed/nexo-about/1200/630", Serialize(about), now),
            new Page("servicios", "Servicios", "Servicios | Nexo Institucional", "Asesoría, provisión, logística, instalación y mantenimiento para instituciones.", "https://picsum.photos/seed/nexo-services/1200/630", Serialize(services), now),
            new Page("contacto", "Contacto", "Contacto | Nexo Institucional", "Solicite una cotización o escríbanos. Respondemos en menos de 24 horas hábiles.", null, Serialize(contact), now));
    }

    private List<ContactMessage> SeedMessages(DateTime now)
    {
        var messages = new List<ContactMessage>
        {
            new("María Fernanda Rojas", "mrojas@nuevohorizonte.edu.bo", "+591 71234567", "Unidad Educativa Nuevo Horizonte", "Cotización de mobiliario escolar", "Buenos días. Necesitamos cotizar 40 escritorios y 40 sillas para nuestras nuevas aulas en Santa Cruz. ¿Podrían enviarnos una propuesta?", "190.129.10.21", now.AddHours(-5)),
            new("Luis Alberto Choque", "lchoque@clinicaandina.com.bo", "+591 72345678", "Clínica Integral Andina", "Renovación de equipos de red", "Estamos evaluando renovar los switches y access points de la clínica en La Paz. Quisiéramos agendar una visita técnica.", "200.87.45.3", now.AddDays(-1).AddHours(-2)),
            new("Carla Vargas", "cvargas@elprogreso.coop.bo", null, "Cooperativa Integral El Progreso", "Consulta sobre garantía", "Adquirimos un refrigerador industrial el año pasado. ¿Cómo hacemos efectiva la garantía en Cochabamba?", "181.115.9.77", now.AddDays(-2)),
            new("Jorge Mendoza", "jmendoza@raicesdelvalle.org.bo", "+591 4 6641234", "Fundación Raíces del Valle", "Vehículo utilitario", "Nos interesa una camioneta utilitaria para trabajo de campo en Tarija. ¿Tienen disponibilidad y planes de mantenimiento?", "166.114.20.8", now.AddDays(-4)),
            new("Patricia Flores", "pflores@distoriente.com.bo", "+591 3 3345678", "Distribuidora Oriente S.R.L.", "Herramientas para mantenimiento", "Solicito catálogo y precios de herramientas eléctricas para nuestro equipo de mantenimiento en Santa Cruz de la Sierra.", "190.181.4.66", now.AddDays(-6)),
        };
        messages[2].MarkAsRead("Ana Quispe", now.AddDays(-2).AddHours(3));
        messages[4].MarkAsRead("Carlos Mamani", now.AddDays(-5));
        db.ContactMessages.AddRange(messages);
        return messages;
    }

    private void SeedAuditHistory(User admin, User editor, List<Product> products, List<ContactMessage> messages, DateTime now)
    {
        var adminActor = new AuditActor(admin.Id, admin.Name, admin.Email, "190.129.33.10", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
        var editorActor = new AuditActor(editor.Id, editor.Name, editor.Email, "200.87.12.45", "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)");
        var router = products.First(p => p.Slug == "router-wi-fi-7");
        var featured = products.First(p => p.IsFeatured && p.Id != router.Id);
        var readMessage = messages[2];

        void Add(DateTime at, AuditActor actor, AuditAction action, string entityType, string? entityId, string label, object? before, object? after, string? summary = null) =>
            db.AuditEntries.Add(new AuditEntry(
                at,
                action,
                entityType,
                entityId,
                summary ?? AuditText.Summarize(action, entityType, label),
                actor,
                before is null ? null : JsonSerializer.Serialize(before, Json),
                after is null ? null : JsonSerializer.Serialize(after, Json)));

        string Id(int id) => id.ToString(CultureInfo.InvariantCulture);

        Add(now.AddDays(-6).AddHours(-1), editorActor, AuditAction.Login, AuditText.User, Id(editor.Id), editor.Email, null, null, $"Inició sesión: {editor.Email}");
        Add(now.AddDays(-5), editorActor, AuditAction.MarkRead, AuditText.ContactMessage, Id(messages[4].Id), messages[4].Name, new { isRead = false, readBy = (string?)null }, new { isRead = true, readBy = editor.Name });
        Add(now.AddDays(-3).AddHours(-2), adminActor, AuditAction.LoginFailed, AuditText.User, Id(admin.Id), admin.Email, null, new { email = admin.Email, reason = "contraseña incorrecta" }, $"Intento de inicio de sesión fallido para «{admin.Email}» (contraseña incorrecta)");
        Add(now.AddDays(-3).AddHours(-2).AddMinutes(1), adminActor, AuditAction.Login, AuditText.User, Id(admin.Id), admin.Email, null, null, $"Inició sesión: {admin.Email}");
        Add(now.AddDays(-3).AddHours(-1), adminActor, AuditAction.Update, AuditText.Product, Id(router.Id), router.Name, new { priceBs = router.PriceBs + 24m, isFeatured = false }, new { priceBs = router.PriceBs, isFeatured = true });
        Add(now.AddDays(-2).AddHours(3), adminActor, AuditAction.MarkRead, AuditText.ContactMessage, Id(readMessage.Id), readMessage.Name, new { isRead = false, readBy = (string?)null }, new { isRead = true, readBy = admin.Name });
        Add(now.AddDays(-1).AddHours(-4), editorActor, AuditAction.Login, AuditText.User, Id(editor.Id), editor.Email, null, null, $"Inició sesión: {editor.Email}");
        Add(now.AddDays(-1).AddHours(-3), editorActor, AuditAction.Update, AuditText.Product, Id(featured.Id), featured.Name, new { isAvailable = !featured.IsAvailable, description = "Descripción anterior del producto." }, new { isAvailable = featured.IsAvailable, description = featured.Description });
    }

    private static string Serialize(object[] blocks) => JsonSerializer.Serialize(blocks, Json);

    [LoggerMessage(Level = LogLevel.Information, Message = "Demo data seeded ({ProductCount} products).")]
    private static partial void LogSeeded(ILogger logger, int productCount);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Seed:DemoUserPassword is not configured; demo users were not created.")]
    private static partial void LogNoDemoUsers(ILogger logger);

    private sealed record SeedCategory(string Nombre, string Slug);

    private sealed record SeedProduct(
        string Slug,
        string Nombre,
        SeedCategory Categoria,
        string Marca,
        decimal PrecioBs,
        bool Disponible,
        string Estado,
        bool Destacado,
        string Descripcion,
        List<string> Imagenes,
        Dictionary<string, JsonElement> Atributos,
        [property: JsonPropertyName("creadoEn")] DateTime CreadoEn);
}
