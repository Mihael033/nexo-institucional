"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, m } from "framer-motion";
import { Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, fieldA11y, Input, Textarea } from "@/components/ui/field";
import { sendContact } from "@/lib/api/contact";
import { isApiError } from "@/lib/api/http";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { MotionScope } from "@/components/motion/motion-scope";

/** Mismas reglas que la API (contrato §3, POST /contact). */
const schema = z.object({
  name: z.string().trim().min(2, "Ingrese su nombre (mínimo 2 caracteres).").max(100, "Máximo 100 caracteres."),
  email: z.string().trim().max(150, "Máximo 150 caracteres.").email("Ingrese un correo electrónico válido."),
  phone: z
    .string()
    .trim()
    .max(30, "Máximo 30 caracteres.")
    .regex(/^[+\d\s()-]*$/, "Use solo números, espacios y el signo +.")
    .optional()
    .or(z.literal("")),
  organization: z.string().trim().max(150, "Máximo 150 caracteres.").optional().or(z.literal("")),
  subject: z.string().trim().min(3, "Indique el asunto (mínimo 3 caracteres).").max(150, "Máximo 150 caracteres."),
  message: z
    .string()
    .trim()
    .min(10, "El mensaje debe tener al menos 10 caracteres.")
    .max(2000, "Máximo 2000 caracteres."),
  website: z.string().optional(),
});

type Values = z.infer<typeof schema>;
const FIELDS = ["name", "email", "phone", "organization", "subject", "message"] as const;

function humanize(slug: string) {
  return slug.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function ContactFormInner() {
  const [sent, setSent] = useState<{ id: number } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    setValue,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      organization: "",
      subject: "",
      message: "",
      website: "",
    },
  });

  // "Solicitar cotización" desde un producto (/contacto?producto=slug) completa el asunto.
  // Se lee tras montar (no con useSearchParams): así el formulario va completo en el HTML
  // estático en lugar de esperar al JS.
  useEffect(() => {
    const product = new URLSearchParams(window.location.search).get("producto");
    if (product && !getValues("subject")) setValue("subject", `Cotización: ${humanize(product.slice(0, 120))}`);
  }, [getValues, setValue]);

  const messageLength = useWatch({ control, name: "message" })?.length ?? 0;

  const onSubmit = async (values: Values) => {
    setServerError(null);
    try {
      const res = await sendContact({
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        organization: values.organization || undefined,
        subject: values.subject,
        message: values.message,
        website: values.website ?? "",
      });
      setSent({ id: res.id });
      reset();
    } catch (e) {
      if (isApiError(e) && e.code === "validation_failed") {
        let first: (typeof FIELDS)[number] | null = null;
        for (const [key, msgs] of Object.entries(e.fieldErrors)) {
          const field = FIELDS.find((f) => f === key);
          if (field) {
            setError(field, { message: msgs[0] });
            first ??= field;
          }
        }
        if (first) setFocus(first);
        setServerError(e.problem.detail ?? "Revise los campos marcados.");
      } else if (isApiError(e) && e.code === "rate_limited") {
        setServerError("Recibimos varios mensajes seguidos desde su conexión. Espere unos minutos e intente nuevamente.");
      } else {
        setServerError(isApiError(e) ? (e.problem.detail ?? e.message) : "No pudimos enviar el mensaje. Intente nuevamente.");
      }
    }
  };

  const err = (k: (typeof FIELDS)[number]) => errors[k]?.message;

  return (
    <div className="relative">
      <AnimatePresence mode="wait" initial={false}>
        {sent ? (
          <m.div
            key="ok"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
            role="status"
            className="flex min-h-[32rem] flex-col items-center justify-center gap-6 rounded-2xl border border-line bg-surface p-10 text-center shadow-card"
          >
            <svg viewBox="0 0 96 96" className="size-28" aria-hidden="true">
              <m.circle
                cx="48"
                cy="48"
                r="44"
                fill="none"
                stroke="var(--color-lime)"
                strokeWidth="6"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
              />
              <m.circle
                cx="48"
                cy="48"
                r="34"
                fill="var(--color-lime)"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.35 }}
                style={{ transformOrigin: "48px 48px" }}
              />
              <m.path
                d="M32 49 L43 60 L65 37"
                fill="none"
                stroke="var(--color-ink)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.6, ease: EASE_OUT_EXPO }}
              />
            </svg>
            <div className="grid gap-2">
              <h2 className="font-display text-3xl font-bold tracking-tight">¡Mensaje enviado!</h2>
              <p className="max-w-sm text-muted">
                Gracias por escribirnos. Un asesor le responderá en menos de un día hábil. Número de referencia:{" "}
                <strong className="font-mono text-fg">#{sent.id}</strong>
              </p>
            </div>
            <Button variant="outline" onClick={() => setSent(null)}>
              Enviar otro mensaje
            </Button>
          </m.div>
        ) : (
          <m.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            aria-describedby="form-hint"
            className="grid gap-5 rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-10"
          >
            <p id="form-hint" className="text-sm text-muted">
              Los campos con <span className="text-danger">*</span> son obligatorios.
            </p>

            {serverError && (
              <Alert variant="danger" role="alert" title="No se pudo enviar">
                {serverError}
              </Alert>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="name" label="Nombre completo" required error={err("name")}>
                <Input autoComplete="name" {...fieldA11y("name", { error: err("name") })} {...register("name")} />
              </Field>
              <Field id="email" label="Correo electrónico" required error={err("email")}>
                <Input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  {...fieldA11y("email", { error: err("email") })}
                  {...register("email")}
                />
              </Field>
              <Field id="phone" label="Teléfono" hint="Opcional. Ej.: +591 70000000" error={err("phone")}>
                <Input
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  {...fieldA11y("phone", { error: err("phone"), hint: true })}
                  {...register("phone")}
                />
              </Field>
              <Field id="organization" label="Institución u organización" hint="Opcional" error={err("organization")}>
                <Input
                  autoComplete="organization"
                  {...fieldA11y("organization", { error: err("organization"), hint: true })}
                  {...register("organization")}
                />
              </Field>
            </div>
            <Field id="subject" label="Asunto" required error={err("subject")}>
              <Input {...fieldA11y("subject", { error: err("subject") })} {...register("subject")} />
            </Field>
            <Field
              id="message"
              label="Mensaje"
              required
              error={err("message")}
              hint={`${messageLength}/2000 caracteres`}
            >
              <Textarea
                rows={6}
                maxLength={2000}
                {...fieldA11y("message", { error: err("message"), hint: true })}
                {...register("message")}
              />
            </Field>

            {/* Honeypot anti-spam: invisible para personas, los bots lo completan. */}
            <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
              <label htmlFor="website">No completar este campo</label>
              <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
            </div>

            <div className="flex flex-col-reverse items-start justify-between gap-4 pt-2 sm:flex-row sm:items-center">
              <p className="max-w-sm text-xs text-muted">
                Usamos sus datos solo para responder esta consulta.
              </p>
              <Button type="submit" size="lg" loading={isSubmitting} className="w-full sm:w-auto">
                Enviar mensaje
                <Send aria-hidden="true" />
              </Button>
            </div>
          </m.form>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Con su propio contexto de framer-motion (el resto del sitio anima con CSS). */
export function ContactForm() {
  return (
    <MotionScope>
      <ContactFormInner />
    </MotionScope>
  );
}
