/**
 * Supabase Auth / Postgres errors arrive in English and are often too
 * technical to show directly (section 45: errors must be human and French).
 * This maps the handful of predictable cases and falls back to a generic,
 * friendly French message rather than leaking raw driver text.
 */
const KNOWN_PATTERNS: [RegExp, string][] = [
  [/user already registered/i, "Un compte existe déjà avec cette adresse e-mail."],
  [/invalid login credentials/i, "E-mail ou mot de passe incorrect."],
  [/email not confirmed/i, "Confirme ton adresse e-mail avant de te connecter."],
  [/password should be at least/i, "Le mot de passe doit contenir au moins 8 caractères."],
  [/rate limit/i, "Trop de tentatives. Réessaie dans quelques instants."],
  [/network/i, "Problème de connexion réseau. Réessaie."],
  [/duplicate key value/i, "Cette valeur est déjà utilisée."],
];

export function toFriendlyAuthError(message: string | undefined | null): string {
  if (!message) return "Une erreur est survenue. Réessaie.";
  const match = KNOWN_PATTERNS.find(([pattern]) => pattern.test(message));
  return match ? match[1] : "Une erreur est survenue. Réessaie dans quelques instants.";
}
