import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Cap lengths so a maliciously long query string can't blow up the
 * rendered layout — this is a public, unauthenticated endpoint. */
function clamp(value: string | null, max: number, fallback: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return fallback;
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = clamp(searchParams.get("title"), 60, "Nouvel accomplissement");
  const name = clamp(searchParams.get("name"), 40, "Un fondateur ASCEND");
  const rank = clamp(searchParams.get("rank"), 30, "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0b0d",
          backgroundImage:
            "radial-gradient(circle at 50% 0%, rgba(214,168,79,0.22) 0%, rgba(10,11,13,0) 55%)",
        }}
      >
        <svg width="64" height="64" viewBox="0 0 64 64" style={{ marginBottom: 24 }}>
          <path d="M32 14 L48 46 H39.5 L32 30.5 L24.5 46 H16 Z" fill="#d6a84f" />
        </svg>
        <div style={{ display: "flex", fontSize: 22, letterSpacing: "0.2em", color: "#d6a84f", marginBottom: 20 }}>
          ACCOMPLISSEMENT DÉBLOQUÉ
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "#f4f1ea",
            textAlign: "center",
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 28, color: "#a8a29e" }}>
          {name}
          {rank ? ` · ${rank}` : ""}
        </div>
        <div style={{ display: "flex", marginTop: 44, fontSize: 22, color: "#d6a84f" }}>ASCEND</div>
      </div>
    ),
    { ...size },
  );
}
