import { z } from "zod";

export const PASSWORD_RULES = [
  { id: "length",  label: "Almeno 8 caratteri",                   test: (v: string) => v.length >= 8 },
  { id: "upper",   label: "Almeno una maiuscola (A-Z)",           test: (v: string) => /[A-Z]/.test(v) },
  { id: "lower",   label: "Almeno una minuscola (a-z)",           test: (v: string) => /[a-z]/.test(v) },
  { id: "number",  label: "Almeno un numero (0-9)",               test: (v: string) => /[0-9]/.test(v) },
  { id: "special", label: "Almeno un carattere speciale (!@#$…)", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

export const passwordSchema = z
  .string()
  .min(8,                "Minimo 8 caratteri")
  .regex(/[A-Z]/,        "Almeno una lettera maiuscola (A-Z)")
  .regex(/[a-z]/,        "Almeno una lettera minuscola (a-z)")
  .regex(/[0-9]/,        "Almeno un numero (0-9)")
  .regex(/[^A-Za-z0-9]/, "Almeno un carattere speciale (!@#$…)");

export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
  passedRules: string[];
} {
  const passedRules = PASSWORD_RULES.filter((r) => r.test(password)).map((r) => r.id);
  const result = passwordSchema.safeParse(password);
  if (result.success) return { valid: true, errors: [], passedRules };
  return {
    valid: false,
    errors: result.error.issues.map((i) => i.message),
    passedRules,
  };
}

export const registrationSchema = z.object({
  email:    z.string().email("Inserisci un'email valida"),
  phone:    z.string().regex(
    /^\+?[1-9]\d{7,14}$/,
    "Inserisci un numero di telefono valido (formato internazionale)"
  ),
  password: passwordSchema,
  company:  z.string().min(2, "Nome azienda obbligatorio (min. 2 caratteri)"),
});

export const loginSchema = z.object({
  email:    z.string().email("Inserisci un'email valida"),
  password: z.string().min(1, "Password obbligatoria"),
});
