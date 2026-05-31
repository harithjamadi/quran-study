"use client";

import { useState } from "react";

const CONFETTI_COLORS = [
  "var(--gold)",
  "var(--accent)",
  "var(--accent-strong)",
  "#EF4444",
  "#22C55E",
  "#3B82F6",
  "#F59E0B",
  "#A855F7",
];

interface Piece {
  cx: string;
  cy: string;
  cr: string;
  cd: string;
  cdel: string;
  color: string;
  i: number;
}

function generatePieces(count: number): Piece[] {
  return Array.from({ length: count }).map((_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
    const distance = 120 + Math.random() * 140;
    const cx = `${Math.cos(angle) * distance}px`;
    // Bias upward — feels more like a celebration than a sneeze.
    const cy = `${Math.sin(angle) * distance - 40}px`;
    const cr = `${Math.round((Math.random() - 0.5) * 720)}deg`;
    const cd = `${1100 + Math.round(Math.random() * 700)}ms`;
    const cdel = `${Math.round(Math.random() * 250)}ms`;
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    return { cx, cy, cr, cd, cdel, color, i };
  });
}

/**
 * A one-shot CSS-only confetti burst overlay. Each piece is positioned at the
 * parent's center and given a unique trajectory + spin + delay through CSS
 * custom properties — no JS animation loop, no runtime cost after mount.
 *
 * The parent must be `position: relative` and ideally `overflow: hidden`.
 * Re-mount via `key={...}` to retrigger.
 */
export function ConfettiBurst({ count = 36 }: { count?: number }) {
  // useState initializer runs once per mount — keeps trajectories stable across
  // re-renders without violating React's purity rules in render.
  const [pieces] = useState<Piece[]>(() => generatePieces(count));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.i}
          className="confetti-piece"
          style={
            {
              backgroundColor: p.color,
              "--cx": p.cx,
              "--cy": p.cy,
              "--cr": p.cr,
              "--cd": p.cd,
              "--cdel": p.cdel,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
