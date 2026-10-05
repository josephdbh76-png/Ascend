import { getAppUrl } from "@/lib/utils";

// Shared look of every ASCEND email (campaigns and automatic ones alike),
// so a member's inbox reads as one sender. Client-safe: the admin previews
// a campaign live with the exact HTML that will be sent.
//
// Bodies are plain text with a light markup, escaped before it is applied
// (a member's message quoted in a notification can't inject HTML):
//   blank line          new paragraph
//   ## Title            section title
//   - item              bullet list (every line of the paragraph)
//   > ASCEND15          highlighted box (a code, a key figure, a quote)
//   [Label](/app/…)     alone in its paragraph: a button; inside a sentence: a link
//   **words**           bold
//   ---                 divider
//   {prénom}            the recipient's first name (campaigns)

const COLORS = {
  page: "#f2f0eb",
  card: "#ffffff",
  line: "#e6e1d7",
  ink: "#16181c",
  text: "#3b3e45",
  muted: "#8a857b",
  header: "#111316",
  headerText: "#f4f1ea",
  gold: "#d6a84f",
  goldInk: "#8a6420",
  goldTint: "#faf5ea",
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const DEFAULT_SIGNATURE = "L'équipe ASCEND";

export interface EmailRenderOptions {
  unsubscribeUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  /** null = no signature; omitted = "À très vite, L'équipe ASCEND". */
  signature?: string | null;
  /** The line inboxes show under the subject; defaults to the body's first real sentence. */
  preheader?: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** An ASCEND path or a web address; anything else (javascript:, mailto:…) is refused. */
function safeUrl(url: string): string | null {
  if (url.startsWith("/")) return `${getAppUrl()}${url}`;
  return /^https?:\/\//i.test(url) ? url : null;
}

/** Inline markup on already-escaped text. */
function inline(escaped: string): string {
  return escaped
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, url: string) => {
      const href = safeUrl(url.replace(/&amp;/g, "&"));
      return href
        ? `<a href="${escapeHtml(href)}" style="color:${COLORS.goldInk};text-decoration:underline;font-weight:600;">${label}</a>`
        : label;
    })
    .replace(/\*\*([^*]+)\*\*/g, `<strong style="color:${COLORS.ink};font-weight:600;">$1</strong>`);
}

/** "{prénom}" → the first name; without one, "Salut {prénom}," → "Salut," and "{prénom}, ton…" → "Ton…". */
export function personalize(text: string, firstName?: string | null): string {
  const name = firstName?.trim();
  if (name) return text.replace(/\{pr[ée]nom\}/gi, name);
  return text
    .replace(/^\{pr[ée]nom\}\s*,\s*(\p{L})/gimu, (_, first: string) => first.toUpperCase())
    .replace(/\s*\{pr[ée]nom\}/gi, "");
}

/** The words of a body without its markup: the inbox preview line. */
function plainText(block: string): string {
  return block
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^(#{2,3}|[-•>])\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;"><tr><td style="border-radius:10px;background:${COLORS.gold};"><a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:15px;font-weight:700;line-height:1;color:#0a0a0a;text-decoration:none;border-radius:10px;">${label}&nbsp;&rarr;</a></td></tr></table>`;
}

type RunKind = "title" | "item" | "box" | "text";

const runKind = (line: string): RunKind =>
  /^#{2,3}\s/.test(line) ? "title" : /^[-•]\s+/.test(line) ? "item" : /^>\s?/.test(line) ? "box" : "text";

/** A paragraph written as "## Title" then "- items", without blank lines between: one block per kind of line. */
function splitRuns(block: string): string[] {
  const runs: { kind: RunKind; lines: string[] }[] = [];
  for (const line of block.split("\n")) {
    const kind = runKind(line);
    const last = runs.at(-1);
    if (last && kind !== "title" && last.kind === kind) last.lines.push(line);
    else runs.push({ kind, lines: [line] });
  }
  return runs.map((r) => r.lines.join("\n"));
}

function renderBlock(block: string): string {
  const lines = block.split("\n");
  const text = `font-family:${FONT};font-size:16px;line-height:1.65;color:${COLORS.text};`;

  if (/^#{2,3}\s/.test(block)) {
    return `<h2 style="margin:30px 0 12px;font-family:${FONT};font-size:19px;line-height:1.35;font-weight:700;letter-spacing:-0.01em;color:${COLORS.ink};">${inline(escapeHtml(block.replace(/^#{2,3}\s+/, "").replace(/\n/g, " ")))}</h2>`;
  }
  if (block.trim() === "---") {
    return `<div style="height:1px;line-height:1px;font-size:0;background:${COLORS.line};margin:28px 0;">&nbsp;</div>`;
  }
  if (lines.every((l) => /^[-•]\s+/.test(l))) {
    const rows = lines
      .map(
        (l) =>
          `<tr><td width="22" valign="top" style="padding:0 0 10px;"><div style="width:7px;height:7px;border-radius:7px;background:${COLORS.gold};margin-top:10px;font-size:0;line-height:0;">&nbsp;</div></td><td valign="top" style="padding:0 0 10px;${text}">${inline(escapeHtml(l.replace(/^[-•]\s+/, "")))}</td></tr>`,
      )
      .join("");
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 10px;">${rows}</table>`;
  }
  if (lines.every((l) => /^>\s?/.test(l))) {
    const content = lines.map((l) => l.replace(/^>\s?/, ""));
    // One short line reads as a code or a key figure; anything longer as a quote.
    const isCode = content.length === 1 && content[0].length <= 28;
    const style = isCode
      ? `text-align:center;font-size:22px;font-weight:700;letter-spacing:0.08em;color:${COLORS.ink};`
      : `font-size:15px;line-height:1.6;color:${COLORS.ink};`;
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:6px 0 22px;"><tr><td style="background:${COLORS.goldTint};border:1px dashed ${COLORS.gold};border-radius:12px;padding:18px 20px;font-family:${FONT};${style}">${content.map((l) => inline(escapeHtml(l))).join("<br/>")}</td></tr></table>`;
  }
  const cta = block.trim().match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
  if (cta) {
    const href = safeUrl(cta[2]);
    if (href) return button(escapeHtml(cta[1]), href);
  }
  return `<p style="margin:0 0 16px;${text}">${inline(escapeHtml(block)).replace(/\n/g, "<br/>")}</p>`;
}

export function renderEmailHtml(body: string, options: EmailRenderOptions = {}): string {
  const appUrl = getAppUrl();
  const blocks = body
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .flatMap(splitRuns);

  const content = blocks.map(renderBlock).join("");
  const ctaHref = options.ctaLabel && options.ctaUrl ? safeUrl(options.ctaUrl) : null;
  const cta = ctaHref ? button(escapeHtml(options.ctaLabel!), ctaHref) : "";

  const signatureText = options.signature === null ? null : (options.signature ?? DEFAULT_SIGNATURE);
  const signature = signatureText
    ? `<p style="margin:30px 0 0;font-family:${FONT};font-size:15px;line-height:1.6;color:${COLORS.text};">À très vite,<br/><strong style="color:${COLORS.ink};font-weight:600;">${escapeHtml(signatureText).replace(/\n/g, "<br/>")}</strong></p>`
    : "";

  const firstSentence = blocks.find((b) => !/^(salut|bonjour|hello|coucou|hey)\b/i.test(b) && !/^(#{2,3}\s|[-•>]|\[)/.test(b));
  const preheader = plainText(options.preheader ?? firstSentence ?? "").slice(0, 140);

  const reason = options.unsubscribeUrl
    ? `Tu reçois cet e-mail car tu as accepté les actualités d'ASCEND. <a href="${escapeHtml(options.unsubscribeUrl)}" style="color:${COLORS.muted};text-decoration:underline;">Se désinscrire</a>`
    : "Tu reçois cet e-mail suite à une activité sur ton compte ASCEND.";
  const host = appUrl.replace(/^https?:\/\//, "");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>ASCEND</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.page};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader)}${"&#8199;&#847;".repeat(60)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.page};">
<tr><td align="center" style="padding:32px 12px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">
<tr><td style="background:${COLORS.header};border-radius:16px 16px 0 0;padding:20px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle"><img src="${appUrl}/email-logo.png" width="30" height="30" alt="" style="display:block;border:0;border-radius:8px;"></td>
<td valign="middle" style="padding-left:12px;font-family:${FONT};font-size:13px;font-weight:700;letter-spacing:0.3em;color:${COLORS.headerText};">ASCEND</td>
</tr></table>
</td></tr>
<tr><td style="height:3px;line-height:3px;font-size:0;background:${COLORS.gold};">&nbsp;</td></tr>
<tr><td style="background:${COLORS.card};border:1px solid ${COLORS.line};border-top:0;border-radius:0 0 16px 16px;padding:36px 32px 34px;">
${content}${cta}${signature}
</td></tr>
<tr><td align="center" style="padding:22px 16px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${COLORS.muted};">
<strong style="color:${COLORS.text};font-weight:600;">ASCEND</strong> · Le réseau des entrepreneurs aux revenus vérifiés<br/>
${reason}<br/>
<a href="${appUrl}" style="color:${COLORS.muted};text-decoration:underline;">${escapeHtml(host)}</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
