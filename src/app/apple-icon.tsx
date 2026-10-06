import { ImageResponse } from "next/og";
import { brandIcon } from "@/components/brand/brandImage";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS rounds the corners itself: a full square, the mark well inside.
export default function AppleIcon() {
  return new ImageResponse(brandIcon(180, 0.56), { ...size });
}
