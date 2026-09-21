import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0b0d",
        }}
      >
        <svg width="320" height="320" viewBox="0 0 64 64">
          <path d="M32 14 L48 46 H39.5 L32 30.5 L24.5 46 H16 Z" fill="#d6a84f" />
        </svg>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
