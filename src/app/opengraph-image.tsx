import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { brandLogotype, brandMark } from "@/components/brand/brandImage";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "ASCEND, le réseau des entrepreneurs aux revenus vérifiés";

const IVORY = "#f4f1ea";
const GOLD = "#d6a84f";
const MUTED = "#a8a9ad";

// The link preview of the whole site (WhatsApp, X, LinkedIn, iMessage…).
export default async function OpengraphImage() {
  const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));
  const [medium, semibold] = await Promise.all([font("Inter-Medium.ttf"), font("Inter-SemiBold.ttf")]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#0a0b0d",
          backgroundImage:
            "radial-gradient(circle at 82% 46%, rgba(214,168,79,0.22) 0%, rgba(214,168,79,0.06) 32%, rgba(10,11,13,0) 58%)",
          fontFamily: "Inter",
          color: IVORY,
        }}
      >
        {/* A thin frame, inset like a printed card */}
        <div style={{ position: "absolute", top: 24, left: 24, right: 24, bottom: 24, border: "1px solid rgba(214,168,79,0.18)", borderRadius: 28, display: "flex" }} />

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "76px 0 72px 84px", width: 700 }}>
          {brandLogotype(30, IVORY)}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", flexDirection: "column", fontSize: 58, fontWeight: 600, lineHeight: 1.12, letterSpacing: -1.5 }}>
              <span>Le réseau des</span>
              <span>entrepreneurs aux</span>
              <div style={{ display: "flex" }}>
                <span>revenus&nbsp;</span>
                <span style={{ color: GOLD }}>vérifiés.</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 26, fontSize: 25, fontWeight: 500, color: MUTED, lineHeight: 1.4 }}>
              <span>Prouve tes chiffres. Grimpe le classement.</span>
              <span>Trouve tes associés.</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {["Revenus vérifiés", "Ligues de Bronze à Diamant", "Réseau de fondateurs"].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                  padding: "9px 16px",
                  borderRadius: 999,
                  border: "1px solid rgba(244,241,234,0.16)",
                  fontSize: 16,
                  fontWeight: 500,
                  color: "#d8d5ce",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", paddingRight: 40 }}>
          {brandMark(330)}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: medium, weight: 500, style: "normal" },
        { name: "Inter", data: semibold, weight: 600, style: "normal" },
      ],
    },
  );
}
