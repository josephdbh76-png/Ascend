import { ImageResponse } from "next/og";
import { brandIcon } from "@/components/brand/brandImage";

export const dynamic = "force-static";

// Also used as the "maskable" icon: Android may crop it to a circle, so the
// mark stays inside the central safe zone.
export async function GET() {
  return new ImageResponse(brandIcon(192, 0.5), { width: 192, height: 192 });
}
