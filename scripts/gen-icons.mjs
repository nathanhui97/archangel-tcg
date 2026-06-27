// Generate the app icon, Android adaptive foreground, and splash from the brand
// kit (brand/) into assets/images/, which app.json references.
//
//   node scripts/gen-icons.mjs   (run from the repo root)
import sharp from 'sharp'
import { copyFileSync } from 'fs'

const CANVAS = 1024

/** Place `src` centered, scaled to `scale` of the canvas, on a transparent 1024² PNG. */
async function padded(src, scale, out) {
  const size = Math.round(CANVAS * scale)
  const fg = await sharp(src)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()
  await sharp({ create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: fg, gravity: 'center' }])
    .png()
    .toFile(out)
  console.log('wrote', out)
}

// App icon (iOS + base) — the full branded icon (dark bg + radar) as-is.
copyFileSync('brand/bindar-icon-1024.png', 'assets/images/icon.png')
console.log('wrote assets/images/icon.png')

// Android adaptive foreground — mark at ~60% so it survives the safe-zone mask
// (background color is set in app.json).
await padded('brand/bindar-mark-512.png', 0.6, 'assets/images/adaptive-icon.png')

// Splash — mark at ~42%, shown via resizeMode:contain on the dark background.
await padded('brand/bindar-mark-512.png', 0.42, 'assets/images/splash.png')

// Web favicon.
copyFileSync('brand/favicon-32.png', 'assets/images/favicon.png')
console.log('wrote assets/images/favicon.png')
