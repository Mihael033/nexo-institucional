import { API_MODE, problem, request } from "./http";
import type { ContactAccepted, ContactRequest } from "./types";

/** POST /contact — se llama desde el navegador (formulario de /contacto). */
export async function sendContact(body: ContactRequest): Promise<ContactAccepted> {
  if (API_MODE === "http") return request<ContactAccepted>("/contact", { method: "POST", body });

  // Mock: misma validación mínima del servidor; el mensaje aparece en /admin/mensajes
  // (memoria del navegador, mientras no se recargue la página).
  await new Promise((r) => setTimeout(r, 900));
  if (body.message.trim().length < 10) {
    throw problem(400, "validation_failed", "Datos inválidos", {
      detail: "Uno o más campos no son válidos.",
      errors: { message: ["El mensaje debe tener al menos 10 caracteres."] },
    });
  }
  const { appendMockContact } = await import("./mock/admin");
  return appendMockContact(body);
}
