import { z } from "zod";
import { RESERVED_USERNAMES } from "./constants";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters.")
  .max(30, "Username must be at most 30 characters.")
  .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers and underscores.")
  .refine((v) => !RESERVED_USERNAMES.includes(v), "This username is reserved.");

export const signupAccountSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  username: usernameSchema,
});

export const signupProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(50),
  lastName: z.string().trim().min(1, "Last name is required.").max(50),
  country: z.string().trim().min(2, "Select your country."),
  category: z.string().trim().min(1, "Select your business category."),
  businessName: z.string().trim().min(1, "Business name is required.").max(80),
});

export const signupBioSchema = z.object({
  bio: z.string().trim().max(280, "Bio must be at most 280 characters.").optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
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
