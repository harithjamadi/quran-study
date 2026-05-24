const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export function toArabicDigits(n: number | string): string {
  return String(n)
    .split("")
    .map((c) => (c >= "0" && c <= "9" ? ARABIC_DIGITS[Number(c)] : c))
    .join("");
}

export function ayahRef(surah: number, ayah: number): string {
  return `${surah}:${ayah}`;
}

export function parseAyahRef(ref: string): { surah: number; ayah: number } | null {
  const m = /^(\d+):(\d+)$/.exec(ref.trim());
  if (!m) return null;
  return { surah: Number(m[1]), ayah: Number(m[2]) };
}

export function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
