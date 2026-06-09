"use client";

/**
 * SVG cross-section diagram of the oral cavity showing Makhraj (articulation) zones.
 * Lights up the relevant zone when a letter's makhraj code is passed.
 *
 * Zone codes (matching public/data/foundations.json):
 *   jawf          – Open space (ا و ي — long vowels/prolongation)
 *   throat-deep   – Deep throat/Ḥalq (ء ه)
 *   throat-mid    – Middle throat (ح ع)
 *   throat-front  – Front throat (خ غ)
 *   tongue-back   – Back of tongue (ق ك)
 *   tongue-mid    – Middle of tongue (ج ش ي)
 *   tongue-sides  – Sides of tongue (ض ل)
 *   tongue-tip-gum   – Tongue tip + gum ridge (ن ر ط د ت س ص)
 *   tongue-tip-teeth – Tongue tip + upper teeth (ث ذ ظ)
 *   lip-teeth     – Lower lip + upper teeth (ف)
 *   lips          – Both lips (ب م و)
 *   nasal         – Nasal passage (for Ghunna on نّ مّ)
 */

interface Props {
  /** The makhraj zone code to highlight, or null for no highlight. */
  activeZone?: string | null;
  size?: number;
}

type ZoneDef = {
  label: { en: string; ms: string };
  color: string;
  darkColor: string;
};

const ZONE_META: Record<string, ZoneDef> = {
  jawf: {
    label: { en: "Open Space (Jawf)", ms: "Ruang Terbuka (Jauf)" },
    color: "#93C5FD",
    darkColor: "#60A5FA",
  },
  "throat-deep": {
    label: { en: "Deep Throat", ms: "Tekak Dalam" },
    color: "#F87171",
    darkColor: "#FCA5A5",
  },
  "throat-mid": {
    label: { en: "Middle Throat", ms: "Tengah Tekak" },
    color: "#FB923C",
    darkColor: "#FDBA74",
  },
  "throat-front": {
    label: { en: "Front Throat", ms: "Hadapan Tekak" },
    color: "#FBBF24",
    darkColor: "#FDE68A",
  },
  "tongue-back": {
    label: { en: "Back of Tongue", ms: "Belakang Lidah" },
    color: "#34D399",
    darkColor: "#6EE7B7",
  },
  "tongue-mid": {
    label: { en: "Middle Tongue", ms: "Tengah Lidah" },
    color: "#2DD4BF",
    darkColor: "#5EEAD4",
  },
  "tongue-sides": {
    label: { en: "Tongue Sides", ms: "Tepi Lidah" },
    color: "#818CF8",
    darkColor: "#A5B4FC",
  },
  "tongue-tip-gum": {
    label: { en: "Tongue Tip + Gum", ms: "Hujung Lidah + Gusi" },
    color: "#A78BFA",
    darkColor: "#C4B5FD",
  },
  "tongue-tip-teeth": {
    label: { en: "Tongue Tip + Teeth", ms: "Hujung Lidah + Gigi" },
    color: "#F472B6",
    darkColor: "#F9A8D4",
  },
  "lip-teeth": {
    label: { en: "Lip + Upper Teeth", ms: "Bibir + Gigi Atas" },
    color: "#C084FC",
    darkColor: "#D8B4FE",
  },
  lips: {
    label: { en: "Both Lips", ms: "Kedua-dua Bibir" },
    color: "#E879F9",
    darkColor: "#F0ABFC",
  },
  nasal: {
    label: { en: "Nasal Passage", ms: "Rongga Hidung" },
    color: "#67E8F9",
    darkColor: "#A5F3FC",
  },
};

function zoneProps(zone: string, active: boolean) {
  const meta = ZONE_META[zone];
  if (!meta) return {};
  return {
    fill: active ? meta.color : "currentColor",
    fillOpacity: active ? 0.85 : 0.08,
    stroke: active ? meta.color : "currentColor",
    strokeOpacity: active ? 1 : 0.2,
  };
}

export function MakhrajVisualizer({ activeZone, size = 280 }: Props) {
  const meta = activeZone ? ZONE_META[activeZone] : null;

  // Scale factor: all coordinates designed for 280×200
  const w = size;
  const h = Math.round(size * (200 / 280));
  const scale = size / 280;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox="0 0 280 200"
        width={w}
        height={h}
        className="text-[color:var(--foreground)] select-none"
        aria-label="Oral cavity cross-section showing articulation zone"
        role="img"
      >
        {/* ── Background: skull outline ── */}
        <ellipse cx="140" cy="100" rx="132" ry="92" fill="none" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />

        {/* ── Nasal cavity (top) ── */}
        <path
          d="M 55 20 Q 140 10 220 20 L 225 55 Q 140 48 55 55 Z"
          strokeWidth="1.5"
          rx="4"
          {...zoneProps("nasal", activeZone === "nasal")}
        />
        <text x="140" y="40" textAnchor="middle" fontSize={9 * scale} fill="currentColor" fillOpacity="0.5">
          Nasal
        </text>

        {/* ── Upper palate (roof of mouth) ── */}
        <path
          d="M 55 55 Q 120 50 220 58"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.4"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* ── Jawf / open mouth cavity ── */}
        <path
          d="M 80 62 Q 150 58 215 65 L 215 100 Q 150 96 80 100 Z"
          strokeWidth="1.5"
          {...zoneProps("jawf", activeZone === "jawf")}
        />
        <text x="147" y="85" textAnchor="middle" fontSize={8 * scale} fill="currentColor" fillOpacity="0.45">
          Jawf
        </text>

        {/* ── Throat zones (left side, back to front) ── */}

        {/* Deep throat */}
        <path
          d="M 18 65 Q 35 60 55 62 L 55 145 Q 35 148 18 145 Z"
          strokeWidth="1.5"
          {...zoneProps("throat-deep", activeZone === "throat-deep")}
        />
        <text x="36" y="108" textAnchor="middle" fontSize={6.5 * scale} fill="currentColor" fillOpacity="0.5" transform={`rotate(-90, 36, 108)`}>
          Deep
        </text>

        {/* Middle throat */}
        <path
          d="M 55 62 Q 72 58 88 62 L 88 142 Q 72 146 55 145 Z"
          strokeWidth="1.5"
          {...zoneProps("throat-mid", activeZone === "throat-mid")}
        />

        {/* Front throat */}
        <path
          d="M 88 62 Q 100 58 115 64 L 115 138 Q 100 142 88 142 Z"
          strokeWidth="1.5"
          {...zoneProps("throat-front", activeZone === "throat-front")}
        />

        {/* ── Tongue body ── */}
        {/* The tongue sits in the lower-middle area */}
        <path
          d="M 55 130 Q 80 105 120 108 Q 170 110 210 120 L 215 150 Q 170 148 120 146 Q 80 144 55 150 Z"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />

        {/* Tongue back zone (ق ك) */}
        <path
          d="M 115 108 Q 135 105 155 108 L 155 138 Q 135 141 115 138 Z"
          strokeWidth="1.5"
          {...zoneProps("tongue-back", activeZone === "tongue-back")}
        />

        {/* Tongue mid zone (ج ش ي) */}
        <path
          d="M 155 108 Q 175 106 192 110 L 192 135 Q 175 138 155 138 Z"
          strokeWidth="1.5"
          {...zoneProps("tongue-mid", activeZone === "tongue-mid")}
        />

        {/* Tongue sides zone (ض ل) — shown as curved bands on each side */}
        <path
          d="M 85 116 Q 95 110 115 108 L 115 138 Q 95 140 85 146 Z"
          strokeWidth="1.5"
          {...zoneProps("tongue-sides", activeZone === "tongue-sides")}
        />

        {/* Tongue tip + gum (ن ر ط د ت س ص) */}
        <path
          d="M 192 110 Q 205 108 215 113 L 215 130 Q 205 132 192 135 Z"
          strokeWidth="1.5"
          {...zoneProps("tongue-tip-gum", activeZone === "tongue-tip-gum")}
        />

        {/* Tongue tip + teeth (ث ذ ظ) */}
        <path
          d="M 215 113 Q 225 110 232 115 L 232 128 Q 225 130 215 130 Z"
          strokeWidth="1.5"
          {...zoneProps("tongue-tip-teeth", activeZone === "tongue-tip-teeth")}
        />

        {/* ── Lip zones (right side) ── */}

        {/* Upper teeth line */}
        <path
          d="M 228 88 L 248 88"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.5"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Lower teeth line */}
        <path
          d="M 228 110 L 248 110"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.5"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Lip + upper teeth zone (ف) */}
        <ellipse
          cx="238"
          cy="96"
          rx="14"
          ry="8"
          strokeWidth="1.5"
          {...zoneProps("lip-teeth", activeZone === "lip-teeth")}
        />

        {/* Both lips zone (ب م و) */}
        <path
          d="M 245 85 Q 268 90 268 100 Q 268 112 245 118 L 245 110 Q 258 103 258 100 Q 258 97 245 92 Z"
          strokeWidth="1.5"
          {...zoneProps("lips", activeZone === "lips")}
        />

        {/* ── Lower jaw outline ── */}
        <path
          d="M 20 150 Q 60 165 120 165 Q 180 165 220 155 L 248 120 L 248 115"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* ── Labels for active zone ── */}
        {/* Zone label appears at bottom center */}
      </svg>

      {/* Zone label below the diagram */}
      <div className="text-center min-h-[2rem]">
        {meta ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: meta.color + "22", color: meta.color }}
          >
            <span
              className="h-2 w-2 rounded-full inline-block"
              style={{ background: meta.color }}
            />
            {meta.label.en}
          </span>
        ) : (
          <span className="text-xs text-[color:var(--muted)]">
            Select a letter to see its articulation point
          </span>
        )}
      </div>
    </div>
  );
}
