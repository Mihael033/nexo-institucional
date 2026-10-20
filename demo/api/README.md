# Nexo Institucional · API (.NET 10)

API REST de la demo. Contrato de integración: [`../CONTRATO-API.md`](../CONTRATO-API.md) (documento técnico en portugués). OpenAPI generado: `http://localhost:5080/openapi/v1.json` · Swagger UI: `http://localhost:5080/swagger`.

## Cómo ejecutarla

Requisito: SDK de .NET 10. Nada más (SQLite incluido).

```sh
# en la carpeta demo/
dotnet run --project api/src/Nexo.Api        # http://localhost:5080
```

- En la primera ejecución crea `api/demo.db` y carga los datos de prueba: 30 productos, 5 categorías, 3 noticias, 4 páginas, 5 mensajes e historial de auditoría.
- Usuarios: `admin@nexo.com.bo` / `Demo#2026` (administradora) y `editor@nexo.com.bo` / `Demo#2026` (editor, sin usuarios ni auditoría).
- **Reiniciar la demo** en Windows (borra lo creado en pruebas y vuelve a los datos iniciales), en la carpeta `demo/`:

  ```bat
  api\reset-demo.cmd            :: detiene la API del puerto 5080, borra demo.db y la vuelve a levantar
  api\reset-demo.cmd -DryRun    :: solo muestra lo que haría
  api\reset-demo.cmd -NoStart   :: detiene y borra, sin levantarla
  ```

  El script solo detiene el proceso del puerto 5080 si es la propia API Nexo; si no, aborta sin tocar nada. En otros sistemas basta con detener la API y borrar `api/demo.db`.
- Salud: `GET /health`.

Verificación (en `demo/api`):

```sh
dotnet build Nexo.slnx                         # los avisos son errores (analizadores de .NET = lint)
dotnet format Nexo.slnx --verify-no-changes --exclude src/Nexo.Infrastructure/Persistence/Migrations
dotnet test Nexo.slnx                          # xUnit: unitarias + integración (WebApplicationFactory)
```

## Arquitectura (Clean Architecture)

```
src/
  Nexo.Domain          entidades y reglas (Product, Category, User/Role, AuditEntry, ImportBatch…), sin dependencias
  Nexo.Application     casos de uso (CQRS ligero: IRequest/IRequestHandler + ISender con validación FluentValidation),
                       DTO, paginación y filtros, lector CSV, textos es-BO
  Nexo.Infrastructure  EF Core (SQLite/SQL Server), auditoría automática, datos iniciales, PBKDF2, JWT
  Nexo.Api             Minimal APIs en /api/v1, ProblemDetails, autenticación/RBAC, rate limit, CORS, cabeceras, OpenAPI, Serilog
tests/
  Nexo.UnitTests         dominio, validaciones, CSV, diff de auditoría, hash de contraseñas, tokens
  Nexo.IntegrationTests  API real + SQLite temporal: catálogo, contacto, autenticación, RBAC, CRUD, importación, auditoría
```

Las dependencias apuntan hacia dentro: Api → Infrastructure → Application → Domain.

## Decisiones

| Tema | Decisión |
|---|---|
| Base de datos | `Database:Provider`: `Sqlite` en Development (demo) y `SqlServer` por defecto en producción (`appsettings.json`). SQLite usa `EnsureCreated`; SQL Server, migraciones (`src/Nexo.Infrastructure/Persistence/Migrations`, script idempotente en `sql/initial-sqlserver.sql`). |
| Precio | `PriceBs` `decimal` (bolivianos, 2 decimales). SQL Server: `decimal(18,2)`. SQLite no ordena decimales, así que guarda céntimos en `INTEGER` mediante un conversor. |
| Búsqueda | Columna normalizada (minúsculas, sin tildes): la misma búsqueda en SQLite y SQL Server; también coincide con el slug de la categoría. Para grandes volúmenes: búsqueda de texto completo de SQL Server. |
| Atributos dinámicos | Tabla EAV `ProductAttributes (Key, Value)` + `AttributeDefinitions` (etiquetas). Filtro `attr=clave:valor` indexado. |
| Auditoría | Automática en `SaveChangesAsync`: instantánea antes/después del agregado completo (producto + imágenes + atributos), usuario, IP y user-agent, guardada en la misma transacción. Campos sensibles con `[AuditIgnore]`. Inicio de sesión, fallo de inicio de sesión, cierre de sesión e importación se registran explícitamente. Inmutable: el DbContext rechaza update/delete de `AuditEntry` y en SQL Server un trigger `INSTEAD OF UPDATE, DELETE` lo impide. |
| Autenticación | JWT HS256 de 15 min (claims `perm` por permiso) + refresh opaco de 7 días. En la base solo se guarda su hash SHA-256; rota en cada uso, y si reaparece un token ya usado se revoca toda la familia. Cookie `nexo_refresh` HttpOnly, SameSite=Strict, Path=/api/v1/auth, Secure fuera de Development. |
| Contraseñas | PBKDF2-HMAC-SHA512 con 210.000 iteraciones, sal por contraseña y comparación en tiempo constante. Bloqueo de 15 min tras 5 fallos seguidos. Un correo inexistente tarda lo mismo (hash ficticio). |
| RBAC | Permisos granulares (`products.write`, `audit.read`…) agrupados en roles; una policy por permiso en el backend. |
| Errores | ProblemDetails (RFC 9457) con `code` estable, `traceId` y `errors` por campo (camelCase). Mensajes en es-BO. |
| Seguridad HTTP | CORS solo para el front configurado, con credenciales. Rate limit (contacto 5/10 min, inicio de sesión 10/min por IP). CSP `default-src 'none'`, `nosniff`, `DENY`, y HSTS + HTTPS fuera de Development. Cuerpo máximo de 1 MB (3 MB solo en la subida de CSV). |
| Importación | CSV propio (RFC 4180, `;` o `,`, UTF-8 o Latin-1 de Excel). Validación fila a fila con el mismo validador del producto, lote guardado 30 min y confirmación transaccional solo de las filas válidas. Informe de errores en CSV con protección contra fórmulas. Las columnas ausentes no borran valores existentes. |

## Secretos y producción

- Ningún secreto en el código. En Development, sin `Jwt:SigningKey`, la API genera una clave efímera (los tokens de acceso caducan al reiniciar; el refresh sigue siendo válido). Fuera de Development la clave es **obligatoria** (`Jwt__SigningKey`, ≥ 32 bytes, por variable de entorno o almacén de secretos).
- Producción: `ConnectionStrings__SqlServer`, `Database__Provider=SqlServer`, `Jwt__SigningKey` y `Cors__AllowedOrigins__0=https://…`. Los usuarios de demo solo se crean si `Seed:DemoUserPassword` está configurado (únicamente en `appsettings.Development.json`).
- Detrás de un proxy inverso, configurar `ForwardedHeaders` para obtener la IP real (la auditoría y el rate limit usan `RemoteIpAddress`).

## Limitaciones conocidas (fuera del alcance de la demo)

CRUD de noticias, páginas y usuarios, subida de imágenes, XLSX, importación en segundo plano, recuperación de contraseña, exportación y pruebas contra SQL Server real (Testcontainers) quedan para una siguiente fase.
