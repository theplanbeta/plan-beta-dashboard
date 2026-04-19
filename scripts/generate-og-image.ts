import sharp from "sharp"
import { writeFileSync } from "fs"
import { resolve } from "path"

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="paper" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FBF6E7"/>
      <stop offset="100%" stop-color="#EEE2B8"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#paper)"/>
  <rect x="40" y="40" width="1120" height="550" fill="none" stroke="#8C6618" stroke-width="2" stroke-dasharray="4 6"/>

  <!-- Red hero stamp -->
  <g transform="translate(950 110) rotate(-6)">
    <rect x="-120" y="-30" width="240" height="60" fill="none" stroke="#D93A1F" stroke-width="5"/>
    <text x="0" y="8" font-family="Georgia, serif" font-size="30" font-weight="700" fill="#D93A1F" text-anchor="middle" letter-spacing="3">DAY ZERO</text>
  </g>

  <!-- File number -->
  <text x="80" y="110" font-family="Courier, monospace" font-size="16" fill="#6B5134" letter-spacing="2">Nr. D0-2026</text>

  <!-- Main headline -->
  <text x="80" y="300" font-family="Georgia, serif" font-size="78" font-weight="700" fill="#141109">Day Zero with us,</text>
  <text x="80" y="390" font-family="Georgia, serif" font-size="78" font-weight="700" fill="#141109">Day One at work.</text>

  <!-- Subheadline -->
  <text x="80" y="460" font-family="Georgia, serif" font-size="28" fill="#3A2B1C">Find German jobs that match your CV — free to start.</text>

  <!-- Footer -->
  <text x="80" y="560" font-family="Courier, monospace" font-size="18" fill="#6B5134" letter-spacing="2">DAYZERO.XYZ · PLAN BETA</text>
</svg>`

const outPath = resolve(__dirname, "../public/og-day-zero.png")

sharp(Buffer.from(svg))
  .png()
  .resize(1200, 630)
  .toFile(outPath)
  .then(() => {
    console.log("Wrote", outPath)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
