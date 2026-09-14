import { z } from "zod";
import { RESERVED_USERNAMES } from "./constants";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères.")
  .max(30, "Le nom d'utilisateur doit contenir au plus 30 caractères.")
  .regex(/^[a-z0-9_]+$/, "Uniquement des lettres minuscules, chiffres et underscores.")
  .refine((v) => !RESERVED_USERNAMES.includes(v), "Ce nom d'utilisateur est réservé.");

export const signupAccountSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
  username: usernameSchema,
});

export const signupProfileSchema = z.object({
  firstName: z.string().trim().min(1, "Le prénom est requis.").max(50),
  lastName: z.string().trim().min(1, "Le nom est requis.").max(50),
  country: z.string().trim().min(2, "Sélectionne ton pays."),
  category: z.string().trim().min(1, "Sélectionne ta catégorie d'activité."),
  businessName: z.string().trim().min(1, "Le nom de l'activité est requis.").max(80),
});

export const signupBioSchema = z.object({
  bio: z.string().trim().max(280, "La bio doit contenir au plus 280 caractères.").optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide."),
  password: z.string().min(1, "Le mot de passe est requis."),
});

export const privacySettingsSchema = z.object({
  revenueVisibility: z.enum(["exact", "range", "private"]),
  showCountry: z.boolean(),
});

export const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  bio: z.string().trim().max(280).optional(),
  country: z.string().trim().min(2),
});
