// Build the hologram option-card images for the hand guest UI (住民の窓, `/guest?hand`) once, at dev time.
// For each source `Q02A.jpg`-style image it writes into src/ui/hand/assets/:
//   Q02-A.webp       the picture with the card's hologram look baked in (grayscale, contrast 1.35, brightness .9,
//                    then the teal 160° gradient in `color` blend mode), so the page needs no CSS filter or blend;
//   Q02-A-wire.webp  Sobel edges of the picture as a teal line drawing on transparency (the card's idle wireframe).
// The outputs are committed; the page never computes them. macOS tools: `sips` decodes and resizes, `cwebp` (Homebrew
// `webp`) encodes. Usage: node scripts/buildHandCards.mjs [source-dir]   (default: <repo>/.dream-loop/hand-ui-ref/ref-images)
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

const surveyDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = resolve(process.argv[2] ?? join(surveyDir, '../.dream-loop/hand-ui-ref/ref-images'));
const out = join(surveyDir, 'src/ui/hand/assets');
const PIC_W = 560, WIRE_W = 360;
mkdirSync(out, { recursive: true });
const work = mkdtempSync(join(tmpdir(), 'hand-cards-'));

/** Minimal PNG reader for sips output: 8-bit RGB/RGBA, not interlaced. */
function readPng(file) {
  const buf = readFileSync(file);
  let pos = 8, width = 0, height = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('latin1', pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4); colorType = data[9];
      if (data[8] !== 8 || data[12] !== 0 || (colorType !== 2 && colorType !== 6)) throw new Error(`${file}: unsupported PNG layout`);
    } else if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const bpp = colorType === 6 ? 4 : 3, stride = width * bpp, raw = inflateSync(Buffer.concat(idat));
  const px = new Uint8Array(width * height * 4);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), cur = new Uint8Array(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pred = filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : filter === 4 ? (pa <= pb && pa <= pc ? a : pb <= pc ? b : c) : 0;
      cur[i] = (line[i] + pred) & 255;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      px[o] = cur[x * bpp]; px[o + 1] = cur[x * bpp + 1]; px[o + 2] = cur[x * bpp + 2]; px[o + 3] = bpp === 4 ? cur[x * bpp + 3] : 255;
    }
    prev = cur;
  }
  return { width, height, px };
}

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = bytes => { let c = 0xffffffff; for (const b of bytes) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const head = Buffer.alloc(8); head.writeUInt32BE(data.length, 0); head.write(type, 4, 'latin1');
  const tail = Buffer.alloc(4); tail.writeUInt32BE(crc(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, tail]);
}
function writePng(file, { width, height, px }) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) Buffer.from(px.buffer, y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}

const resized = (file, width, name) => {
  const png = join(work, name);
  execFileSync('sips', ['-s', 'format', 'png', '--resampleWidth', String(width), file, '--out', png], { stdio: 'ignore' });
  return readPng(png);
};
const webp = (png, file, args) => execFileSync('cwebp', ['-quiet', ...args, png, '-o', file]);

// CSS `color` blend (Compositing Level 1): the gradient's hue and saturation with the picture's luminosity.
const lum = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b;
function setLum([r, g, b], l) {
  const d = l - lum(r, g, b);
  let c = [r + d, g + d, b + d];
  const L = lum(...c), n = Math.min(...c), x = Math.max(...c);
  if (n < 0) c = c.map(v => L + (v - L) * L / (L - n));
  if (x > 1) c = c.map(v => L + (v - L) * (1 - L) / (x - L));
  return c;
}
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const G0 = hex('#4fb8c8'), G1 = hex('#2b6f8a');

function hologram({ width, height, px }) {
  const o = new Uint8Array(px.length);
  const a = (160 - 90) * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a); // CSS 160deg: toward bottom, slightly left→right
  const half = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    let v = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
    v = Math.min(1, Math.max(0, (v - 0.5) * 1.35 + 0.5)) * 0.9;
    const t = Math.min(1, Math.max(0, (((x - width / 2) * dx + (y - height / 2) * dy) / half + 1) / 2));
    const c = setLum(G0.map((g, k) => g + (G1[k] - g) * t), v);
    o[i] = Math.round(c[0] * 255); o[i + 1] = Math.round(c[1] * 255); o[i + 2] = Math.round(c[2] * 255); o[i + 3] = 255;
  }
  return { width, height, px: o };
}

function wire({ width: w, height: h, px }) {
  const lumA = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lumA[i] = 0.3 * px[i * 4] + 0.59 * px[i * 4 + 1] + 0.11 * px[i * 4 + 2];
  const o = new Uint8Array(w * h * 4);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, L = lumA;
    const gx = -L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1] + L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1];
    const gy = -L[i - w - 1] - 2 * L[i - w] - L[i - w + 1] + L[i + w - 1] + 2 * L[i + w] + L[i + w + 1];
    const a = Math.max(0, Math.min(1, (Math.sqrt(gx * gx + gy * gy) - 60) / 160));
    o[i * 4] = 150; o[i * 4 + 1] = 225; o[i * 4 + 2] = 215; o[i * 4 + 3] = Math.round(a * 255);
  }
  return { width: w, height: h, px: o };
}

const files = readdirSync(source).filter(name => /^Q\d\d[A-C]\.(jpe?g|png|webp)$/i.test(name)).sort();
if (!files.length) throw new Error(`no Q00A-style images in ${source}`);
for (const name of files) {
  const key = `${name.slice(0, 3).toUpperCase()}-${name[3].toUpperCase()}`, file = join(source, name);
  writePng(join(work, `${key}.png`), hologram(resized(file, PIC_W, `${key}-src.png`)));
  webp(join(work, `${key}.png`), join(out, `${key}.webp`), ['-q', '82']);
  writePng(join(work, `${key}-wire.png`), wire(resized(file, WIRE_W, `${key}-wsrc.png`)));
  webp(join(work, `${key}-wire.png`), join(out, `${key}-wire.webp`), ['-q', '85', '-alpha_q', '90', '-exact']);
  console.log(`${key}: picture + wire`);
}
rmSync(work, { recursive: true, force: true });
