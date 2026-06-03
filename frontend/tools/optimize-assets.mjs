/**
 * optimize-assets.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Batch-optimizes SVG files and generates WebP thumbnails for chat patterns.
 *
 * Usage (from frontend/):
 *   node tools/optimize-assets.mjs          — optimize SVGs + generate thumbs
 *   node tools/optimize-assets.mjs --svgo   — SVG optimization only
 *   node tools/optimize-assets.mjs --thumbs — Thumbnail generation only
 *
 * Requirements:
 *   svgo  (already in devDependencies)
 *   sharp (install once: npm i -D sharp)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { optimize } from "svgo";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");

// ── Directories containing SVGs to optimize ──────────────────────────────────
const SVG_DIRS = [
  path.join(PUBLIC, "illustrations"),
  path.join(PUBLIC, "resources", "chat", "patterns", "light"),
  path.join(PUBLIC, "resources", "chat", "patterns", "dark"),
];

// ── Thumbnail output directory ────────────────────────────────────────────────
const THUMB_INPUT_DIR = path.join(PUBLIC, "resources", "chat", "patterns", "light");
const THUMB_OUTPUT_DIR = path.join(PUBLIC, "resources", "chat", "patterns", "thumbs");
const THUMB_SIZE = 120; // px — fits a 4/3 card @ 2× retina

// ── SVGO configuration (safe preset, preserves viewBox + accessible attrs) ───
const SVGO_CONFIG = {
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          // Never remove viewBox — required for correct scaling
          removeViewBox: false,
          // Keep all IDs — patterns/filters often reference them
          cleanupIds: false,
          // Keep title/desc for accessibility
          removeTitle: false,
          removeDesc: false,
          // Keep filters intact (drop-shadow, etc.)
          removeHiddenElems: false,
          // Preserve stroke presentational attributes
          convertShapeToPath: false,
          // Don't mangle clip-path and mask IDs
          collapseGroups: false,
        },
      },
    },
    // Explicitly allow namespace removal (safe)
    "removeDimensions",
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getFiles(dir, ext = ".svg") {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(ext))
    .map((e) => path.join(dir, e.name));
}

function formatBytes(bytes) {
  return bytes < 1024 ? `${bytes}B` : `${(bytes / 1024).toFixed(1)}kB`;
}

// ── SVGO pass ─────────────────────────────────────────────────────────────────
async function optimizeSvgs() {
  console.log("\n🔧  Optimizing SVGs…");
  let totalBefore = 0;
  let totalAfter = 0;
  let count = 0;

  for (const dir of SVG_DIRS) {
    const files = await getFiles(dir);
    for (const file of files) {
      const original = await readFile(file, "utf8");
      let result;
      try {
        result = optimize(original, { path: file, ...SVGO_CONFIG });
      } catch (err) {
        console.warn(`  ⚠  Skipped ${path.basename(file)}: ${err.message}`);
        continue;
      }
      const beforeSize = Buffer.byteLength(original);
      const afterSize = Buffer.byteLength(result.data);
      totalBefore += beforeSize;
      totalAfter += afterSize;
      if (afterSize < beforeSize) {
        await writeFile(file, result.data, "utf8");
        const saved = beforeSize - afterSize;
        const pct = ((saved / beforeSize) * 100).toFixed(1);
        console.log(
          `  ✓  ${path.relative(ROOT, file).padEnd(62)} ${formatBytes(beforeSize)} → ${formatBytes(afterSize)} (−${pct}%)`
        );
      }
      count++;
    }
  }

  const totalSaved = totalBefore - totalAfter;
  const totalPct = totalBefore > 0 ? ((totalSaved / totalBefore) * 100).toFixed(1) : 0;
  console.log(
    `\n✅  SVG pass done. ${count} files checked, saved ${formatBytes(totalSaved)} total (−${totalPct}%)\n`
  );
}

// ── Thumbnail generation ──────────────────────────────────────────────────────
async function generateThumbs() {
  console.log("\n🖼   Generating WebP thumbnails…");

  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error(
      '\n❌  "sharp" is not installed. Run:\n    npm install -D sharp\nthen re-run this script.\n'
    );
    process.exit(1);
  }

  await mkdir(THUMB_OUTPUT_DIR, { recursive: true });
  const files = await getFiles(THUMB_INPUT_DIR);

  for (const file of files) {
    const name = path.basename(file, ".svg");
    const outFile = path.join(THUMB_OUTPUT_DIR, `${name}.webp`);

    // Skip if already newer than source
    if (existsSync(outFile)) {
      const [srcStat, dstStat] = await Promise.all([stat(file), stat(outFile)]);
      if (dstStat.mtimeMs >= srcStat.mtimeMs) {
        process.stdout.write(".");
        continue;
      }
    }

    try {
      const svgBuffer = await readFile(file);
      await sharp(svgBuffer)
        .resize(THUMB_SIZE, Math.round((THUMB_SIZE * 3) / 4), { fit: "cover" })
        .webp({ quality: 72, effort: 4 })
        .toFile(outFile);
      process.stdout.write("✓");
    } catch (err) {
      process.stdout.write("!");
      console.warn(`\n  ⚠  ${path.basename(file)}: ${err.message}`);
    }
  }

  console.log(`\n✅  Thumb pass done. Output: ${path.relative(ROOT, THUMB_OUTPUT_DIR)}\n`);
}

// ── Raster generation (SVG → AVIF + WebP + PNG via sharp) ────────────────────
const RASTER_INPUT_DIR = path.join(PUBLIC, "illustrations");
const RASTER_OUTPUT_DIR = path.join(PUBLIC, "illustrations", "raster");
// Whitelist: only convert these SVGs to raster (hero LCP images)
const RASTER_WHITELIST = ["robot_wave_hello.svg"];
const RASTER_SIZE = 768; // px — 2× the 384px CSS render target

async function generateRasters() {
  console.log("\n🖼   Generating raster variants (AVIF + WebP + PNG)…");

  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error(
      '\n❌  "sharp" is not installed. Run:\n    npm install -D sharp\nthen re-run this script.\n'
    );
    process.exit(1);
  }

  await mkdir(RASTER_OUTPUT_DIR, { recursive: true });

  for (const svgName of RASTER_WHITELIST) {
    const srcFile = path.join(RASTER_INPUT_DIR, svgName);
    if (!existsSync(srcFile)) {
      console.warn(`  ⚠  Source not found: ${svgName} — skipped`);
      continue;
    }

    const baseName = path.basename(svgName, ".svg");
    const outAvif = path.join(RASTER_OUTPUT_DIR, `${baseName}.avif`);
    const outWebp = path.join(RASTER_OUTPUT_DIR, `${baseName}.webp`);
    const outPng = path.join(RASTER_OUTPUT_DIR, `${baseName}.png`);

    // Skip all outputs if already newer than source
    const srcMtime = (await stat(srcFile)).mtimeMs;
    const allExist = existsSync(outAvif) && existsSync(outWebp) && existsSync(outPng);
    if (allExist) {
      const oldestOut = Math.min(
        (await stat(outAvif)).mtimeMs,
        (await stat(outWebp)).mtimeMs,
        (await stat(outPng)).mtimeMs
      );
      if (oldestOut >= srcMtime) {
        console.log(`  ✓  ${svgName} → rasters already up-to-date, skipped`);
        continue;
      }
    }

    try {
      const svgBuffer = await readFile(srcFile);

      // Base PNG (used for AVIF/WebP source and as final fallback)
      const pngBuffer = await sharp(svgBuffer, { density: 144 })
        .resize(RASTER_SIZE, RASTER_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9 })
        .toBuffer();

      // AVIF (target ≤ 30 KB)
      await sharp(pngBuffer)
        .avif({ quality: 50, effort: 6 })
        .toFile(outAvif);

      // WebP (target ≤ 60 KB)
      await sharp(pngBuffer)
        .webp({ quality: 75, effort: 5 })
        .toFile(outWebp);

      // PNG fallback
      await sharp(pngBuffer).png({ compressionLevel: 9 }).toFile(outPng);

      const avifSize = (await stat(outAvif)).size;
      const webpSize = (await stat(outWebp)).size;
      const pngSize = (await stat(outPng)).size;
      console.log(
        `  ✓  ${svgName} → avif:${formatBytes(avifSize)}  webp:${formatBytes(webpSize)}  png:${formatBytes(pngSize)}`
      );
    } catch (err) {
      console.error(`  ❌  ${svgName}: ${err.message}`);
    }
  }

  console.log(`\n✅  Raster pass done. Output: ${path.relative(ROOT, RASTER_OUTPUT_DIR)}\n`);
}

// ── Entry point ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const doSvgo = args.length === 0 || args.includes("--svgo");
const doThumbs = args.length === 0 || args.includes("--thumbs");
const doRaster = args.length === 0 || args.includes("--raster");

if (doSvgo) await optimizeSvgs();
if (doThumbs) await generateThumbs();
if (doRaster) await generateRasters();
