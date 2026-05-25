import { ImageResponse } from "next/og";

export const runtime = "edge";

// Generates the Mubin brand icon as PNG at the requested size (192 or 512).
// Chrome Android requires PNG icons in the manifest to satisfy installability
// criteria — SVG-only manifests never trigger beforeinstallprompt on mobile.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ size: string }> }
) {
  const { size: sizeParam } = await ctx.params;
  const size = sizeParam === "512" ? 512 : 192;
  const s = size / 256;

  return new ImageResponse(
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        position: "relative",
        background:
          "radial-gradient(ellipse 130% 80% at 50% 40%, #e7efd9 0%, #5a7a4c 100%)",
        borderRadius: Math.round(56 * s),
      }}
    >
      {/* Outline circle — offset right, suggests depth */}
      <div
        style={{
          position: "absolute",
          width: Math.round(124 * s),
          height: Math.round(124 * s),
          borderRadius: "50%",
          border: `${Math.max(1, Math.round(6 * s))}px solid rgba(251,250,245,0.7)`,
          left: Math.round(86 * s),
          top: Math.round(66 * s),
        }}
      />
      {/* Main circle — olive fill, center-left */}
      <div
        style={{
          position: "absolute",
          width: Math.round(124 * s),
          height: Math.round(124 * s),
          borderRadius: "50%",
          background: "#5a7a4c",
          left: Math.round(66 * s),
          top: Math.round(66 * s),
        }}
      />
      {/* Gold accent dot — mirrors the star in the SVG */}
      <div
        style={{
          position: "absolute",
          width: Math.round(24 * s),
          height: Math.round(24 * s),
          borderRadius: "50%",
          background: "#b08a3e",
          left: Math.round(133 * s),
          top: Math.round(65 * s),
        }}
      />
    </div>,
    { width: size, height: size }
  );
}
