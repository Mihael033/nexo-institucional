/**
 * Tipos compartidos de la API — espejo de demo/CONTRATO-API.md (v1.0).
 * Cuando la API publique /openapi/v1.json se puede generar `schema.d.ts`
 * con openapi-typescript y estos tipos pasan a ser alias de ese esquema.
 * Los tipos exclusivos del panel viven en `admin-types.ts`.
 */

export type Paged<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type ProblemCode =
  | "validation_failed"
  | "bad_request"
  | "unauthorized"
  | "auth.invalid_credentials"
  | "auth.invalid_refresh"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "import.expired"
  | "auth.locked_out"
  | "rate_limited"
  | "server_error"
  | "network_error";

export type ProblemDetails = {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code: ProblemCode | (string & {});
  traceId?: string;
  errors?: Record<string, string[]>;
  lockoutEnd?: string;
};

export type Img = { url: string; alt: string };
export type Cta = { label: string; href: string };
export type Seo = { title: string; description: string; ogImageUrl: string | null };

/* ---------------------------------------------------------------- Sitio */

export type SocialNetwork = "facebook" | "instagram" | "linkedin" | "x" | "youtube" | "whatsapp";

export type SiteInfo = {
  name: string;
  slogan: string;
  description: string;
  contact: {
    address: string;
    phone: string;
    whatsapp: string;
    email: string;
    hours: string;
  };
  social: { network: SocialNetwork | (string & {}); url: string }[];
  nav: { label: string; href: string }[];
};

/* --------------------------------------------------------------- Páginas */

export type PageSummary = { slug: string; title: string; updatedAt: string };

export type BlockDataMap = {
  hero: {
    eyebrow: string | null;
    title: string;
    subtitle: string;
    primaryCta: Cta | null;
    secondaryCta: Cta | null;
    image: Img | null;
  };
  richText: { title: string | null; html: string };
  features: {
    title: string | null;
    subtitle: string | null;
    items: { icon: string; title: string; text: string; href: string | null }[];
  };
  stats: {
    title: string | null;
    items: { value: number; prefix: string | null; suffix: string | null; label: string }[];
  };
  timeline: { title: string | null; items: { year: string; title: string; text: string }[] };
  image: { image: Img; caption: string | null };
  gallery: { title: string | null; images: Img[] };
  cta: { title: string; text: string; button: Cta };
  contactInfo: { title: string | null; text: string | null };
};

export type BlockType = keyof BlockDataMap;

/** Unión discriminada: `block.type` estrecha `block.data`. */
export type Block = {
  [K in BlockType]: { id: string; type: K; data: BlockDataMap[K] };
}[BlockType];

export type Page = {
  slug: string;
  title: string;
  seo: Seo;
  blocks: Block[];
  updatedAt: string;
};

/* -------------------------------------------------------------- Noticias */

export type NewsSort = "newest" | "oldest";

export type NewsSummary = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: Img;
  author: string;
  tags: string[];
  publishedAt: string;
};

export type NewsDetail = NewsSummary & { html: string; seo: Seo; related: NewsSummary[] };

/* ------------------------------------------------------ Catálogo/productos */

export type Category = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  productCount: number;
};

export type ProductCondition = "new" | "used";

export type ProductSort =
  | "newest"
  | "oldest"
  | "price_asc"
  | "price_desc"
  | "name_asc"
  | "name_desc"
  | "relevance";

export type ProductSummary = {
  id: number;
  slug: string;
  name: string;
  brand: string;
  category: { id: number; slug: string; name: string };
  priceBs: number;
  isAvailable: boolean;
  condition: ProductCondition;
  isFeatured: boolean;
  thumbnail: Img;
  createdAt: string;
};

export type ProductAttribute = { key: string; label: string; value: string };

export type ProductDetail = ProductSummary & {
  description: string;
  images: Img[];
  attributes: ProductAttribute[];
  related: ProductSummary[];
  updatedAt: string;
};

/** Parámetros de GET /products (y base de GET /admin/products). */
export type ProductQuery = {
  q?: string;
  category?: string[];
  brand?: string[];
  condition?: ProductCondition;
  available?: boolean;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  /** `clave:valor`, repetible. Misma clave = OR, claves distintas = AND. */
  attr?: string[];
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
};

export type ProductFacets = {
  categories: { slug: string; name: string; count: number }[];
  brands: { value: string; count: number }[];
  conditions: { value: ProductCondition; label: string; count: number }[];
  availability: { available: number; unavailable: number };
  price: { min: number; max: number };
  attributes: { key: string; label: string; values: { value: string; count: number }[] }[];
};

/* -------------------------------------------------------------- Contacto */

export type ContactRequest = {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  subject: string;
  message: string;
  /** Honeypot: siempre vacío para humanos. */
  website: string;
};

export type ContactAccepted = { id: number; receivedAt: string };
