import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        <svg width="112" height="112" viewBox="0 0 64 64">
          <path d="M32 14 L48 46 H39.5 L32 30.5 L24.5 46 H16 Z" fill="#d6a84f" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
