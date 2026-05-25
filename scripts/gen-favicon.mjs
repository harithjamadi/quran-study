// One-shot: rasterize public/icon.svg into a multi-size src/app/favicon.ico
// so /favicon.ico (which Vercel and legacy browsers hit directly) matches
// the Mubin brand instead of the default Next.js placeholder.
import sharp from "sharp";
import { promises as fs } from "fs";

const svg = await fs.readFile("public/icon.svg");

const sizes = [16, 32, 48];
const pngs = await Promise.all(
  sizes.map((s) =>
    sharp(svg).resize(s, s, { fit: "contain" }).png().toBuffer(),
  ),
);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);

const dirSize = 16 * sizes.length;
let offset = 6 + dirSize;
const entries = [];
for (let i = 0; i < sizes.length; i++) {
  const s = sizes[i];
  const png = pngs[i];
  const entry = Buffer.alloc(16);
  entry.writeUInt8(s === 256 ? 0 : s, 0);
  entry.writeUInt8(s === 256 ? 0 : s, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(offset, 12);
  entries.push(entry);
  offset += png.length;
}

const ico = Buffer.concat([header, ...entries, ...pngs]);
await fs.writeFile("src/app/favicon.ico", ico);
console.log(`Wrote src/app/favicon.ico (${ico.length} bytes, sizes: ${sizes.join(",")})`);
