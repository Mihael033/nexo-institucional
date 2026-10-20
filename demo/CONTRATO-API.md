# Contrato da API — Nexo Institucional (DEMO)

Versão do contrato: **1.1** (2026-10-17). Organização fictícia na Bolívia: es-BO, bolivianos, `.com.bo`, +591.
O OpenAPI gerado pela API (`/openapi/v1.json`) é a fonte para o cliente tipado; este documento é o acordo humano. Se divergirem, vale o OpenAPI.

---

## 1. Convenções

| Item | Regra |
|---|---|
| Base URL | `http://localhost:5080/api/v1` (o front lê de `NEXT_PUBLIC_API_URL`; em Server Components pode usar `API_URL`) |
| Swagger UI | `http://localhost:5080/swagger` · OpenAPI JSON: `http://localhost:5080/openapi/v1.json` |
| Health | `GET http://localhost:5080/health` → `200 Healthy` |
| Formato | JSON, propriedades em **camelCase**, enums como **string** (valores em inglês, minúsculos) |
| Datas | ISO 8601 em UTC com `Z` (`2026-10-17T13:45:00Z`). Filtros de data aceitam `YYYY-MM-DD` ou ISO completo |
| IDs | inteiros (`int`) |
| Dinheiro | `priceBs`: número decimal em **bolivianos** com até 2 casas (`1250.00`). Formatação `Bs 1.250,00` (`Intl.NumberFormat('es-BO')`) é do front. O JSON pode vir sem casas (`261` = Bs 261,00) |
| Textos | mensagens de erro e labels vindos da API em **espanhol da Bolívia (es-BO, usted)**. Campos técnicos em inglês |
| CORS | só `http://localhost:3000`, com `credentials` (necessário para o cookie de refresh) |
| Rotas públicas | sem auth: `/site`, `/pages`, `/news`, `/categories`, `/products`, `/contact` |
| Rotas do painel | prefixo `/admin/**`, exigem `Authorization: Bearer <accessToken>` e permissão |

### 1.1 Paginação, ordem e filtros (todas as listagens)

Query: `page` (padrão `1`), `pageSize` (padrão `12`, máximo `100`), `sort` (valores por endpoint).

```json
{
  "items": [ ... ],
  "page": 1,
  "pageSize": 12,
  "totalItems": 30,
  "totalPages": 3
}
```
Tipo TS: `Paged<T> = { items: T[]; page: number; pageSize: number; totalItems: number; totalPages: number }`.
Página além do fim → `items: []` (não é erro). `pageSize` > 100 → `400`.

### 1.2 Erros (ProblemDetails, RFC 9457)

Sempre `Content-Type: application/problem+json`:
```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "Datos inválidos",
  "status": 400,
  "detail": "Uno o más campos no son válidos.",
  "instance": "/api/v1/contact",
  "code": "validation_failed",
  "traceId": "00-4bf9...-01",
  "errors": {
    "email": ["Ingrese un correo electrónico válido."],
    "message": ["El mensaje debe tener al menos 10 caracteres."]
  }
}
```
- `type` é um link informativo (RFC 9110); não usem para lógica.
- `errors` só existe em `400 validation_failed`; chaves em camelCase iguais aos campos do request.
- `code` é estável (use para lógica no front); `title`/`detail` são para mostrar.

| Status | `code` | Quando |
|---|---|---|
| 400 | `validation_failed` | Validação (FluentValidation) |
| 400 | `bad_request` | Parâmetro malformado, arquivo inválido |
| 401 | `unauthorized` | Sem token / token expirado → front tenta `POST /auth/refresh` uma vez |
| 401 | `auth.invalid_credentials` | Login com e-mail ou senha errados (mensagem genérica) |
| 401 | `auth.invalid_refresh` | Refresh ausente, expirado, revogado ou reutilizado → mandar para `/admin/login` |
| 403 | `forbidden` | Autenticado mas sem a permissão |
| 404 | `not_found` | Recurso não existe (ou está excluído, nas rotas públicas) |
| 409 | `conflict` | Ex.: `slug` duplicado (`detail` explica) |
| 410 | `import.expired` | Lote de importação expirou (30 min) ou já foi confirmado |
| 423 | `auth.locked_out` | Conta bloqueada (5 falhas seguidas → 15 min). Extensão `lockoutEnd` (ISO) |
| 429 | `rate_limited` | Rate limit. Header `Retry-After` (segundos) |
| 500 | `server_error` | Erro inesperado (sem stack trace) |

---

## 2. Autenticação e RBAC

### 2.1 Fluxo
- **Access token**: JWT HS256, validade **15 min**. Front guarda **só em memória**.
- **Refresh token**: opaco, validade **7 dias**, em cookie `nexo_refresh` — `HttpOnly`, `SameSite=Strict`, `Path=/api/v1/auth`, `Secure` em produção. **Rotativo**: cada refresh emite outro e invalida o anterior; reuso de token já usado revoga a família inteira (logout forçado).
- Chamadas que mexem no cookie (`login`, `refresh`, `logout`) devem usar `fetch(..., { credentials: 'include' })`.
- Ao recarregar a página do painel: chamar `POST /auth/refresh`; se `200`, sessão restaurada; se `401`, ir para `/admin/login`.

### 2.2 Endpoints

**`POST /auth/login`** (rate limit: 10/min por IP)
```json
// request
{ "email": "admin@nexo.com.bo", "password": "Demo#2026" }
// 200 + Set-Cookie: nexo_refresh=...
{
  "accessToken": "eyJhbGciOi...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": 1,
    "name": "Ana Quispe",
    "email": "admin@nexo.com.bo",
    "role": "Admin",
    "permissions": ["dashboard.read", "products.read", "products.write", "products.import", "categories.write", "messages.read", "messages.write", "users.read", "audit.read"]
  }
}
```
Erros: `400 validation_failed`, `401 auth.invalid_credentials`, `423 auth.locked_out`, `429 rate_limited`.

**`POST /auth/refresh`** (sem body; usa o cookie) → `200` igual ao login (novo cookie) · `401 auth.invalid_refresh`.

**`POST /auth/logout`** (cookie; Bearer opcional) → `204`, revoga o refresh e apaga o cookie. Sempre `204`, mesmo sem cookie.

**`GET /auth/me`** (Bearer) → `200 AuthUser` (o objeto `user` acima).

### 2.3 Permissões e papéis

| Permissão | Libera | Admin | Editor |
|---|---|:-:|:-:|
| `dashboard.read` | `GET /admin/dashboard` | ✔ | ✔ |
| `products.read` | listar/ver produtos no painel | ✔ | ✔ |
| `products.write` | criar, editar, excluir, restaurar produto | ✔ | ✔ |
| `products.import` | importação CSV | ✔ | ✔ |
| `categories.write` | CRUD de categorias | ✔ | ✔ |
| `messages.read` | listar/ver mensagens | ✔ | ✔ |
| `messages.write` | marcar lida/não lida | ✔ | ✔ |
| `users.read` | `/admin/users`, `/admin/roles` | ✔ | ✘ |
| `audit.read` | `/admin/audit` | ✔ | ✘ |

O front esconde menus pela lista `user.permissions`; o backend sempre checa (policies). Usuários de demo: `admin@nexo.com.bo` e `editor@nexo.com.bo`, senha `Demo#2026`.

---

## 3. Site público

### `GET /site` — dados globais (header/footer/SEO)
```json
{
  "name": "Nexo Institucional",
  "slogan": "Conectamos instituciones con soluciones",
  "description": "Proveemos productos y bienes para instituciones públicas y privadas de Bolivia.",
  "contact": {
    "address": "Av. 16 de Julio (El Prado) 1490, La Paz, Bolivia",
    "phone": "+591 2 2000000",
    "whatsapp": "+591 70000000",
    "email": "contacto@nexo.com.bo",
    "hours": "Lunes a viernes, 08:00 a 17:00"
  },
  "social": [ { "network": "facebook", "url": "https://facebook.com/" }, { "network": "instagram", "url": "https://instagram.com/" }, { "network": "linkedin", "url": "https://linkedin.com/" } ],
  "nav": [ { "label": "Inicio", "href": "/" }, { "label": "Nosotros", "href": "/nosotros" }, { "label": "Servicios", "href": "/servicios" }, { "label": "Catálogo", "href": "/catalogo" }, { "label": "Noticias", "href": "/noticias" }, { "label": "Contacto", "href": "/contacto" } ]
}
```

### `GET /pages` → `PageSummary[]` (sem paginação)
`PageSummary = { slug, title, updatedAt }`. Seed: `inicio`, `nosotros`, `servicios`, `contacto`.

### `GET /pages/{slug}` → `Page` · `404 not_found`
```ts
type Page = {
  slug: string; title: string;
  seo: { title: string; description: string; ogImageUrl: string | null };
  blocks: Block[];          // em ordem de exibição
  updatedAt: string;
}
type Block = { id: string; type: BlockType; data: /* conforme type */ };
type Cta = { label: string; href: string };
type Img = { url: string; alt: string };
```
| `type` | `data` |
|---|---|
| `hero` | `{ eyebrow: string \| null, title: string, subtitle: string, primaryCta: Cta \| null, secondaryCta: Cta \| null, image: Img \| null }` |
| `richText` | `{ title: string \| null, html: string }` (HTML restrito: `p h2 h3 ul ol li strong em a blockquote`; renderizar com sanitizer) |
| `features` | `{ title: string \| null, subtitle: string \| null, items: { icon: string, title: string, text: string, href: string \| null }[] }` — `icon` é nome Lucide em kebab-case (`truck`, `shield-check`…) |
| `stats` | `{ title: string \| null, items: { value: number, prefix: string \| null, suffix: string \| null, label: string }[] }` (contadores animados) |
| `timeline` | `{ title: string \| null, items: { year: string, title: string, text: string }[] }` |
| `image` | `{ image: Img, caption: string \| null }` |
| `gallery` | `{ title: string \| null, images: Img[] }` |
| `cta` | `{ title: string, text: string, button: Cta }` |
| `contactInfo` | `{ title: string \| null, text: string \| null }` (o front completa com `GET /site`.contact) |

Blocos de tipo desconhecido devem ser ignorados pelo front (não quebrar).

### `GET /news?page&pageSize&sort` → `Paged<NewsSummary>`
`sort`: `newest` (padrão) · `oldest`.
```ts
type NewsSummary = { id: number; slug: string; title: string; excerpt: string; coverImage: Img; author: string; tags: string[]; publishedAt: string };
```
### `GET /news/{slug}` → `NewsDetail = NewsSummary & { html: string; seo: {...igual Page.seo}; related: NewsSummary[] }` · `404`

### `GET /categories` → `Category[]` (sem paginação, ordem alfabética)
```ts
type Category = { id: number; slug: string; name: string; description: string | null; productCount: number }; // productCount = não excluídos
```

### `GET /products` → `Paged<ProductSummary>`
| Query | Exemplo | Regra |
|---|---|---|
| `q` | `router` | busca em nome, marca, descrição; ignora maiúsculas **e acentos** (`vehiculo` acha "Vehículos") |
| `category` | `equipos-de-red,herramientas` | slugs separados por vírgula (OU) |
| `brand` | `Illimani,Andes` | vírgula (OU), exato, sem diferenciar maiúsculas |
| `condition` | `new` / `used` | |
| `available` | `true` / `false` | |
| `featured` | `true` | |
| `minPrice`, `maxPrice` | `250.50` | inclusivos, em Bs (decimal com ponto) |
| `attr` | `ubicacion:La Paz` | **repetível**; mesma chave = OU, chaves diferentes = E. Chaves vêm de `/products/facets` |
| `sort` | `newest` (padrão) · `oldest` · `price_asc` · `price_desc` · `name_asc` · `name_desc` · `relevance` (só faz sentido com `q`; sem `q` vira `newest`) |
| `page`, `pageSize` | | padrão 1 / 12 |

```ts
type ProductCondition = 'new' | 'used';   // labels: Nuevo / Usado
type ProductSummary = {
  id: number; slug: string; name: string; brand: string;
  category: { id: number; slug: string; name: string };
  priceBs: number; isAvailable: boolean; condition: ProductCondition; isFeatured: boolean;
  thumbnail: Img;            // primeira imagem
  createdAt: string;
};
```

### `GET /products/facets` → dados para montar os filtros
Sem parâmetros. Na demo as contagens são sobre o catálogo inteiro (produtos não excluídos), para montar os filtros uma vez.
```json
{
  "categories": [ { "slug": "equipos-de-red", "name": "Equipos de red", "count": 6 } ],
  "brands": [ { "value": "Illimani", "count": 5 } ],
  "conditions": [ { "value": "new", "label": "Nuevo", "count": 20 }, { "value": "used", "label": "Usado", "count": 10 } ],
  "availability": { "available": 24, "unavailable": 6 },
  "price": { "min": 120.00, "max": 98000.00 },
  "attributes": [
    { "key": "ubicacion", "label": "Ubicación", "values": [ { "value": "La Paz", "count": 6 } ] },
    { "key": "garantiaMeses", "label": "Garantía (meses)", "values": [ { "value": "12", "count": 11 } ] }
  ]
}
```

### `GET /products/{slug}` → `ProductDetail` · `404` (inclusive se excluído)
```ts
type ProductDetail = ProductSummary & {
  description: string;
  images: Img[];                                   // galeria, em ordem
  attributes: { key: string; label: string; value: string }[];
  related: ProductSummary[];                       // até 4, mesma categoria, disponíveis primeiro
  updatedAt: string;
};
```

### `POST /contact` (rate limit: **5 por 10 min por IP**)
```json
// request
{ "name": "Juan Mamani", "email": "juan@ejemplo.com.bo", "phone": "+591 71234567", "organization": "Gobierno Autónomo Municipal de El Alto", "subject": "Cotización de mobiliario", "message": "Necesitamos 20 escritorios...", "website": "" }
// 202
{ "id": 6, "receivedAt": "2026-10-17T14:00:00Z" }
```
Regras: `name` 2–100 · `email` válido, ≤150 · `phone` opcional ≤30 · `organization` opcional ≤150 · `subject` 3–150 · `message` 10–2000 · `website` é **honeypot** (campo escondido; se vier preenchido a API responde `202` mas não salva). Erros: `400 validation_failed`, `429 rate_limited`.

---

## 4. Painel (`/admin/**`, Bearer obrigatório)

### `GET /admin/dashboard` (`dashboard.read`)
```json
{
  "totals": { "products": 30, "productsAvailable": 24, "productsFeatured": 6, "categories": 5, "news": 3, "messages": 5, "messagesUnread": 3, "users": 2 },
  "productsByCategory": [ { "slug": "equipos-de-red", "name": "Equipos de red", "count": 6 } ],
  "messagesLast7Days": [ { "date": "2026-10-11", "count": 1 } ],
  "recentActivity": [ /* AuditEntrySummary, até 8 */ ]
}
```
`messagesLast7Days` sempre tem 7 itens (dias sem mensagem com `count: 0`). `recentActivity` é `null` se o usuário não tem `audit.read` (Editor).

### Produtos
| Método e rota | Permissão | Resposta |
|---|---|---|
| `GET /admin/products` | `products.read` | `Paged<AdminProduct>` — mesmos filtros de `/products` + `status=active\|deleted\|all` (padrão `active`) + `sort` também aceita `updated_desc` |
| `GET /admin/products/{id}` | `products.read` | `AdminProductDetail` (inclui excluídos) |
| `POST /admin/products` | `products.write` | `201` + `Location` + `AdminProductDetail` |
| `PUT /admin/products/{id}` | `products.write` | `200 AdminProductDetail` |
| `DELETE /admin/products/{id}` | `products.write` | `204` (soft delete; some do site) |
| `POST /admin/products/{id}/restore` | `products.write` | `200 AdminProductDetail` |

```ts
type AdminProduct = ProductSummary & { isDeleted: boolean; deletedAt: string | null; updatedAt: string };
type AdminProductDetail = AdminProduct & { description: string; images: Img[]; attributes: { key: string; label: string; value: string }[] };

// POST e PUT (PUT é substituição completa)
type ProductUpsertRequest = {
  name: string;               // 3–150
  slug: string | null;        // opcional; se vazio é gerado do nome. a-z0-9 e hífen, ≤160, único → 409 se repetido
  categoryId: number;         // precisa existir
  brand: string;              // 1–80
  priceBs: number;           // 0–100.000.000, até 2 casas decimais
  isAvailable: boolean;
  condition: 'new' | 'used';
  isFeatured: boolean;
  description: string;        // 10–4000
  images: string[];           // 1–10 URLs http(s)
  attributes: Record<string, string>; // chaves [a-zA-Z0-9]{1,40}, valores ≤100. Ex.: { "garantiaMeses": "12", "ubicacion": "Cochabamba" }
};
```

### Categorias (`categories.write` para escrever)
`POST /admin/categories` · `PUT /admin/categories/{id}` → `{ name (2–80), slug (opcional), description (opcional, ≤300) }` → `Category`.
`DELETE /admin/categories/{id}` → `204`; `409 conflict` se tiver qualquer produto ligado (inclusive excluídos).

### Importação CSV (`products.import`)
Fluxo: **baixar modelo → validar (pré-visualização) → confirmar**.

**`GET /admin/products/import/template`** → `text/csv` (UTF-8 com BOM, separador `;`, para abrir certo no Excel).
Colunas (cabeçalho em espanhol, ordem livre, obrigatórias com `*`):
`nombre*; slug; categoria*; marca*; precio_bs*; disponible*; estado*; destacado; descripcion*; imagenes*; garantia_meses; ubicacion`
- `categoria`: slug existente (ex.: `herramientas`) · `disponible`/`destacado`: `si`/`no` (aceita também `true/false/1/0`) · `estado`: `Nuevo`/`Usado` · `imagenes`: URLs separadas por `|` · `precio_bs`: decimal em bolivianos (aceita `1250.50`, `1.250,50` e `1250,50`).
- Separador `;` ou `,` (detectado). Se o `slug` (ou o gerado do nome) já existe → a linha **atualiza** o produto; senão **cria**.

**`POST /admin/products/import/validate`** — `multipart/form-data`, campo `file` (`.csv`, até **2 MB**, até **1.000 linhas**)
```json
// 200
{
  "importId": "8f0c2c1e5b9a4d7e9c1a2b3c4d5e6f70",
  "fileName": "productos.csv",
  "expiresAt": "2026-10-17T14:30:00Z",
  "totalRows": 3, "validRows": 2, "invalidRows": 1,
  "toCreate": 1, "toUpdate": 1,
  "rows": [
    { "rowNumber": 2, "status": "valid", "action": "create", "data": { "name": "Taladro", "slug": "taladro", "categorySlug": "herramientas", "brand": "Andes", "priceBs": 350.00, "isAvailable": true, "condition": "new", "isFeatured": false }, "errors": [] },
    { "rowNumber": 3, "status": "invalid", "action": null, "data": { "name": "", "slug": null, "categorySlug": "xyz", "brand": "Andes", "priceBs": null, "isAvailable": null, "condition": null, "isFeatured": false },
      "errors": [ { "column": "nombre", "message": "El nombre es obligatorio." }, { "column": "categoria", "message": "La categoría 'xyz' no existe." } ] }
  ]
}
```
`rowNumber` = linha do arquivo (o cabeçalho é a linha 1). Arquivo sem cabeçalho obrigatório → `400 bad_request` com `detail` dizendo quais colunas faltam.

**`GET /admin/products/import/{importId}/errors`** → `text/csv` com `fila;columna;error` (relatório baixável).

**`POST /admin/products/import/{importId}/confirm`** → grava **só as linhas válidas**, numa transação, e audita.
```json
{ "importId": "8f0c...", "created": 1, "updated": 1, "skipped": 1 }
```
`410 import.expired` se expirou/já confirmado · `403` se o lote é de outro usuário.

### Mensagens de contato
| Método e rota | Permissão | Resposta |
|---|---|---|
| `GET /admin/messages?status=unread\|read\|all&q&page&pageSize&sort` | `messages.read` | `Paged<ContactMessage>`; `sort`: `newest` (padrão) · `oldest`; `q` busca em nome, e-mail, assunto, organização |
| `GET /admin/messages/{id}` | `messages.read` | `ContactMessage` |
| `PATCH /admin/messages/{id}` | `messages.write` | body `{ "isRead": true }` → `200 ContactMessage` |

```ts
type ContactMessage = { id: number; name: string; email: string; phone: string | null; organization: string | null; subject: string; message: string; isRead: boolean; readAt: string | null; readBy: string | null; createdAt: string };
```

### Usuários e papéis (`users.read`) — só leitura na demo
`GET /admin/users?q&role&page&pageSize` → `Paged<AdminUser>`
```ts
type AdminUser = { id: number; name: string; email: string; role: 'Admin' | 'Editor'; isActive: boolean; isLockedOut: boolean; lastLoginAt: string | null; createdAt: string };
```
`GET /admin/roles` → `{ name: string; description: string; permissions: string[]; userCount: number }[]`

### Auditoria (`audit.read`) — só leitura, registros imutáveis
`GET /admin/audit` → `Paged<AuditEntrySummary>`
| Query | Regra |
|---|---|
| `userId` | id do usuário |
| `action` | `create` · `update` · `delete` · `restore` · `import` · `login` · `login_failed` · `logout` · `mark_read` · `mark_unread` (vírgula = OU) |
| `entityType` | `Product` · `Category` · `ContactMessage` · `User` · `ImportBatch` (vírgula = OU) |
| `entityId` | string |
| `from`, `to` | datas inclusivas (`to=2026-10-17` inclui o dia todo) |
| `q` | busca no resumo |
| `sort` | `newest` (padrão) · `oldest` |

```ts
type AuditAction = 'create'|'update'|'delete'|'restore'|'import'|'login'|'login_failed'|'logout'|'mark_read'|'mark_unread';
type AuditEntrySummary = {
  id: number; occurredAt: string;
  userId: number | null; userName: string | null; userEmail: string | null;   // null = anônimo/sistema
  action: AuditAction; entityType: string; entityId: string | null;
  summary: string;              // es-BO, ex.: "Actualizó el producto «Router Wi-Fi 7»"
  ipAddress: string | null;
};
type AuditEntryDetail = AuditEntrySummary & {
  before: Record<string, unknown> | null;   // null em create/login
  after: Record<string, unknown> | null;    // null em delete físico (não existe na demo)
  changes: { field: string; before: unknown; after: unknown }[];  // diff pronto para a tabela antes/depois
  userAgent: string | null;
};
```
`GET /admin/audit/{id}` → `AuditEntryDetail`. Campos sensíveis (hash de senha, tokens) nunca aparecem.
Ações e filtros disponíveis: `GET /admin/audit/meta` → `{ actions: {value,label}[], entityTypes: {value,label}[], users: {id,name}[] }` (labels em es-BO).

---

## 5. Notas para o front
- **Mocks**: usem exatamente estes formatos atrás de `lib/api`; quando a API subir, só troca a base URL.
- **Cliente tipado**: `npx openapi-typescript http://localhost:5080/openapi/v1.json -o lib/api/schema.d.ts` (disponível quando a API rodar).
- **401 no painel**: interceptor faz um `POST /auth/refresh` (com `credentials: 'include'`), repete a chamada uma vez; se falhar, limpa o estado e vai para `/admin/login`. Evitem refresh em paralelo (uma promise compartilhada).
- **Seed boliviano**: fonte única `demo/web/src/data/productos.json` (marcas e cidades bolivianas); a API copia esse arquivo para o seu seed.
- **Datas** exibidas no fuso `America/La_Paz` (UTC−4); filtros só-data da auditoria são interpretados nesse fuso.
- **Imagens** do seed vêm de `picsum.photos` → liberar em `next.config` `images.remotePatterns` (`picsum.photos`, `fastly.picsum.photos`).
- Fora do escopo da demo (fase 2): CRUD de notícias/páginas/usuários no painel, upload de imagens, XLSX, recuperação de senha, exportação.
