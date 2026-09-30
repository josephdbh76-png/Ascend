import { z } from "zod";
import { BUSINESS_CATEGORIES, RESERVED_USERNAMES } from "./constants";

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
  city: z.string().trim().max(80).optional(),
});

export const businessSchema = z.object({
  name: z.string().trim().min(1, "Donne un nom à ton activité.").max(80, "Le nom fait 80 caractères au plus."),
  category: z
    .string()
    .trim()
    .refine((v) => BUSINESS_CATEGORIES.some((c) => c.value === v), "Choisis une catégorie dans la liste."),
  customCategory: z.string().trim().max(60, "La précision fait 60 caractères au plus.").optional(),
  description: z.string().trim().max(280, "La description fait 280 caractères au plus.").optional(),
  website: z.string().trim().max(180, "Cette adresse est trop longue.").optional(),
});

export type BusinessInput = z.input<typeof businessSchema>;

const euros = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s/g, "").replace(",", "."))
  .refine((v) => v === "" || /^\d{1,6}(\.\d{1,2})?$/.test(v), "Indique un prix en euros, par exemple 149 ou 149,90.");

export const trainingSchema = z
  .object({
    title: z.string().trim().min(3, "Le titre fait au moins 3 caractères.").max(120, "Le titre fait 120 caractères au plus."),
    summary: z
      .string()
      .trim()
      .min(10, "Résume ta formation en une phrase (10 caractères minimum).")
      .max(200, "Le résumé fait 200 caractères au plus."),
    description: z
      .string()
      .trim()
      .min(20, "Décris ta formation en au moins 20 caractères.")
      .max(2000, "La description fait 2000 caractères au plus."),
    theme: z.string().trim().min(1, "Choisis un thème."),
    format: z.enum(["online", "live", "coaching", "in_person"]),
    durationLabel: z.string().trim().max(40, "La durée fait 40 caractères au plus.").optional(),
    price: euros.refine((v) => v !== "", "Indique le prix public."),
    memberPrice: euros.optional(),
    promoCode: z
      .string()
      .trim()
      .max(40, "Le code fait 40 caractères au plus.")
      .regex(/^[A-Za-z0-9_-]*$/, "Le code ne contient que des lettres, chiffres, tirets ou underscores.")
      .optional(),
    eliteOnly: z.boolean().default(false),
    externalUrl: z.string().trim().url("Le lien doit être une adresse complète (https://...).").max(500),
    coverImageUrl: z.string().trim().url().nullable().optional(),
  })
  .refine((v) => /^https?:\/\//i.test(v.externalUrl), { message: "Le lien doit commencer par https://", path: ["externalUrl"] })
  .refine((v) => !v.memberPrice || Number(v.memberPrice) < Number(v.price), {
    message: "Le prix membres doit être inférieur au prix public.",
    path: ["memberPrice"],
  });

export type TrainingInput = z.input<typeof trainingSchema>;

export const opportunitySchema = z.object({
  type: z.enum(["cofounder", "developer", "partner", "growth", "freelance", "investor", "other"]),
  title: z.string().trim().min(3, "Le titre doit contenir au moins 3 caractères.").max(120),
  description: z.string().trim().min(20, "Décris l'opportunité en au moins 20 caractères.").max(3000),
  category: z.string().trim().max(40).optional(),
  compensationType: z.enum(["equity", "paid", "both", "unpaid"]),
  locationType: z.enum(["remote", "onsite", "hybrid"]),
  city: z.string().trim().max(80).optional(),
  country: z.string().trim().max(2).optional(),
  skills: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  targetStage: z.enum(["any", "pre_revenue", "early", "growth", "scale"]).default("any"),
});

export const opportunityApplicationSchema = z.object({
  message: z.string().trim().min(10, "Ton message doit contenir au moins 10 caractères.").max(2000),
});
