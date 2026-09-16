import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
            "radial-gradient(circle at 50% 0%, rgba(214,168,79,0.18) 0%, rgba(10,11,13,0) 55%)",
        }}
      >
        <svg width="88" height="88" viewBox="0 0 64 64" style={{ marginBottom: 28 }}>
          <path d="M32 14 L48 46 H39.5 L32 30.5 L24.5 46 H16 Z" fill="#d6a84f" />
        </svg>
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "#f4f1ea",
          }}
        >
          ASCEND
        </div>
        <div style={{ display: "flex", marginTop: 20, fontSize: 32, color: "#d6a84f" }}>
          Construis. Prouve. Progresse.
        </div>
      </div>
    ),
    { ...size },
  );
}
