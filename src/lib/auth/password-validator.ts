import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "La password deve contenere almeno 8 caratteri")
  .regex(/[A-Z]/, "La password deve contenere almeno una lettera maiuscola")
  .regex(
    /[^A-Za-z0-9]/,
    "La password deve contenere almeno un carattere speciale"
  );

export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const result = passwordSchema.safeParse(password);
  if (result.success) return { valid: true, errors: [] };
  return {
    valid: false,
    errors: result.error.issues.map((i) => i.message),
  };
}

export const registrationSchema = z.object({
  email: z.string().email("Inserisci un'email valida"),
  phone: z
    .string()
    .regex(
      /^\+?[1-9]\d{7,14}$/,
      "Inserisci un numero di telefono valido (formato internazionale)"
    ),
  password: passwordSchema,
  company: z.string().min(1, "Nome azienda obbligatorio"),
});

export const loginSchema = z.object({
  email: z.string().email("Inserisci un'email valida"),
  password: z.string().min(1, "Password obbligatoria"),
});
