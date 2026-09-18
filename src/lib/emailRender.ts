import "server-only";

/**
 * Shared visual wrapper for every ASCEND email — campaigns and
 * transactional alike — so a member's inbox reads as one consistent
 * sender rather than two different-looking systems. `unsubscribeUrl` is
 * optional: transactional emails (a direct result of the member's own
 * activity) don't require an unsubscribe link the way marketing
 * campaigns legally do, only a footer note when one applies.
 */
export function renderEmailHtml(body: string, options?: { unsubscribeUrl?: string; ctaLabel?: string; ctaUrl?: string }): string {
  const paragraphs = body
    .split("\n\n")
    .map((p) => `<p style="margin:0 0 16px;color:#1a1a1a;font-size:15px;line-height:1.6;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  const cta = options?.ctaLabel && options?.ctaUrl
    ? `<p style="margin:24px 0;"><a href="${options.ctaUrl}" style="display:inline-block;background:#d6a84f;color:#0a0a0a;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:6px;">${options.ctaLabel}</a></p>`
    : "";

  const footer = options?.unsubscribeUrl
    ? `<p style="font-size:12px;color:#888;margin:0;">
        Tu reçois cet email car tu as accepté de recevoir des actualités d'ASCEND.
        <a href="${options.unsubscribeUrl}" style="color:#888;">Se désinscrire</a>
      </p>`
    : `<p style="font-size:12px;color:#888;margin:0;">Tu reçois cet email suite à une action sur ton compte ASCEND.</p>`;

  return `
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
      <p style="font-size:13px;letter-spacing:0.1em;text-transform:uppercase;color:#d6a84f;margin:0 0 24px;font-weight:600;">ASCEND</p>
      ${paragraphs}
      ${cta}
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0 16px;" />
      ${footer}
    </div>
  `;
}
