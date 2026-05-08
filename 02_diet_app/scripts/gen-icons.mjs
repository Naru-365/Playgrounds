import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const svg = await readFile(join(root, "public", "icon.svg"));

const targets = [
  { size: 192, name: "icon-192.png" },
  { size: 512, name: "icon-512.png" },
  { size: 180, name: "apple-touch-icon.png" },
  { size: 32, name: "favicon-32.png" },
  { size: 16, name: "favicon-16.png" },
  // maskable: padded 10% safe area
  { size: 512, name: "icon-512-maskable.png", padding: 0.1 },
];

for (const t of targets) {
  const inner = t.padding ? Math.round(t.size * (1 - t.padding * 2)) : t.size;
  let pipeline = sharp(svg).resize(inner, inner);
  if (t.padding) {
    pipeline = pipeline.extend({
      top: Math.round(t.size * t.padding),
      bottom: Math.round(t.size * t.padding),
      left: Math.round(t.size * t.padding),
      right: Math.round(t.size * t.padding),
      background: "#2EB872",
    });
  }
  const buf = await pipeline.png().toBuffer();
  await writeFile(join(root, "public", t.name), buf);
  console.log(`wrote public/${t.name} (${t.size}x${t.size})`);
}
