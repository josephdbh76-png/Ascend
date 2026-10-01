import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// The server calls addresses typed by members (a WooCommerce store): only
// public https sites, never our own infrastructure or a private network.

function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    return v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:127.") || v === "::";
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

export async function assertPublicHttpsUrl(input: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Adresse invalide. Exemple : https://maboutique.fr");
  }
  if (url.protocol !== "https:") throw new Error("L'adresse doit commencer par https://");
  if (url.username || url.password) throw new Error("Adresse invalide.");
  const host = url.hostname;
  if (!host.includes(".") || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Adresse invalide.");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new Error("Ce site est introuvable. Vérifie l'adresse.");
  if (addresses.some((a) => isPrivateAddress(a.address))) throw new Error("Adresse non autorisée.");
  return url;
}
