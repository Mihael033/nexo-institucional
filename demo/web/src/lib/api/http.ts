import type { ProblemDetails } from "./types";

/**
 * Transporte HTTP base para la API .NET (sitio público y panel).
 * - Server Components pueden usar `API_URL` (red interna); el navegador usa `NEXT_PUBLIC_API_URL`.
 * - Cualquier respuesta no-2xx se convierte en `ApiError` con el ProblemDetails del contrato.
 * - Sin red / API caída → `ApiError` con code `network_error` (nunca se inventa un éxito).
 */

export type ApiMode = "mock" | "http";

export const API_MODE: ApiMode = process.env.NEXT_PUBLIC_API_MODE === "http" ? "http" : "mock";

export function apiBaseUrl(): string {
  const server = typeof window === "undefined" ? process.env.API_URL : undefined;
  return (server || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5080/api/v1").replace(/\/$/, "");
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly problem: ProblemDetails;

  constructor(problem: ProblemDetails) {
    super(problem.detail || problem.title);
    this.name = "ApiError";
    this.status = problem.status;
    this.code = problem.code;
    this.problem = problem;
  }

  /** Errores de validación por campo (`400 validation_failed`). */
  get fieldErrors(): Record<string, string[]> {
    return this.problem.errors ?? {};
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

export type QueryValue = string | number | boolean | null | undefined | readonly (string | number)[];
export type Query = URLSearchParams | Record<string, QueryValue>;

/** Arrays se repiten (`attr=a&attr=b`); para listas separadas por coma, unir antes con `join(",")`. */
export function toSearchParams(query?: Query): URLSearchParams {
  if (!query) return new URLSearchParams();
  if (query instanceof URLSearchParams) return query;
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) value.forEach((v) => sp.append(key, String(v)));
    else sp.set(key, String(value));
  }
  return sp;
}

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Query;
  /** Objeto → JSON. `FormData` se envía tal cual (multipart). */
  body?: unknown;
  /** Bearer token (panel). */
  token?: string | null;
  /** `include` para login/refresh/logout (cookie httpOnly `nexo_refresh`). */
  credentials?: RequestCredentials;
  signal?: AbortSignal;
  headers?: HeadersInit;
  /** Respuesta esperada. `blob` para CSV descargable. */
  responseType?: "json" | "blob" | "text";
  cache?: RequestCache;
};

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", query, body, token, credentials, signal, responseType = "json", cache } = opts;
  const qs = toSearchParams(query).toString();
  const url = `${apiBaseUrl()}${path}${qs ? `?${qs}` : ""}`;

  const headers = new Headers(opts.headers);
  headers.set("Accept", responseType === "json" ? "application/json, application/problem+json" : "*/*");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    payload = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: payload, credentials, signal, cache });
  } catch (cause) {
    if ((cause as Error)?.name === "AbortError") throw cause;
    throw new ApiError({
      title: "Sin conexión con el servidor",
      detail: "No pudimos conectar con la API. Verifique su conexión e intente nuevamente.",
      status: 0,
      code: "network_error",
    });
  }

  if (!res.ok) throw new ApiError(await readProblem(res));
  if (res.status === 204) return undefined as T;
  if (responseType === "blob") return (await res.blob()) as T;
  if (responseType === "text") return (await res.text()) as T;
  return (await res.json()) as T;
}

async function readProblem(res: Response): Promise<ProblemDetails> {
  const fallback: ProblemDetails = {
    title: res.status >= 500 ? "Error del servidor" : "No se pudo completar la solicitud",
    status: res.status,
    code: res.status >= 500 ? "server_error" : "bad_request",
  };
  try {
    const data = (await res.json()) as Partial<ProblemDetails>;
    return { ...fallback, ...data, status: data.status ?? res.status, code: data.code ?? fallback.code };
  } catch {
    return fallback;
  }
}

/** Crea un ApiError con forma de contrato (útil para mocks). */
export function problem(status: number, code: string, title: string, extra: Partial<ProblemDetails> = {}): ApiError {
  return new ApiError({ status, code, title, ...extra });
}
