/**
 * One-off GSC snapshot — pulls last-N-day search performance for theplanbeta.com
 * and prints overview + top 20 queries + top 20 pages to stdout.
 *
 * Usage:
 *   npx tsx scripts/gsc-snapshot.ts            # default 28 days
 *   npx tsx scripts/gsc-snapshot.ts 90         # custom window
 *
 * Requires GSC_SITE_URL and GOOGLE_SERVICE_ACCOUNT_JSON_B64 in .env (or
 * .env.production for production-scoped data: vercel env pull --environment
 * production .env.production).
 */

import "dotenv/config"
import {
  getGSCOverview,
  getGSCTopQueries,
  getGSCTopPages,
  getGSCDevices,
} from "@/lib/analytics/gsc"

const days = Number(process.argv[2]) || 28

function pct(n: number) {
  return `${(n * 100).toFixed(2)}%`
}

function num(n: number) {
  return n.toLocaleString("en-IN")
}

function pad(s: string, w: number) {
  return s.length >= w ? s.slice(0, w - 1) + "…" : s + " ".repeat(w - s.length)
}

async function main() {
  if (!process.env.GSC_SITE_URL) {
    console.error("✗ GSC_SITE_URL not set. Run: vercel env pull --environment production .env.production && cp .env.production .env")
    process.exit(1)
  }

  console.log(`\nGSC snapshot for ${process.env.GSC_SITE_URL} — last ${days} days (3-day API delay)\n`)
  console.log("=".repeat(80))

  const [overview, queries, pages, devices] = await Promise.all([
    getGSCOverview(days),
    getGSCTopQueries(days, 20),
    getGSCTopPages(days, 20),
    getGSCDevices(days),
  ])

  if (!overview) {
    console.error("✗ GSC API returned null. Check service account permissions on the property.")
    process.exit(1)
  }

  console.log("\nOVERVIEW")
  console.log("-".repeat(80))
  console.log(`  Impressions:  ${num(overview.impressions)}`)
  console.log(`  Clicks:       ${num(overview.clicks)}`)
  console.log(`  CTR:          ${pct(overview.ctr)}`)
  console.log(`  Avg position: ${overview.position.toFixed(1)}`)

  if (devices && devices.length > 0) {
    console.log("\nBY DEVICE")
    console.log("-".repeat(80))
    console.log(`  ${pad("device", 12)} ${pad("impr", 10)} ${pad("clicks", 8)} ${pad("ctr", 8)} pos`)
    for (const d of devices) {
      console.log(`  ${pad(d.device, 12)} ${pad(num(d.impressions), 10)} ${pad(num(d.clicks), 8)} ${pad(pct(d.ctr), 8)} ${d.position.toFixed(1)}`)
    }
  }

  if (queries && queries.length > 0) {
    console.log(`\nTOP ${queries.length} QUERIES`)
    console.log("-".repeat(80))
    console.log(`  ${pad("query", 40)} ${pad("impr", 8)} ${pad("clicks", 7)} ${pad("ctr", 7)} pos`)
    for (const q of queries) {
      console.log(`  ${pad(q.query, 40)} ${pad(num(q.impressions), 8)} ${pad(num(q.clicks), 7)} ${pad(pct(q.ctr), 7)} ${q.position.toFixed(1)}`)
    }
  }

  if (pages && pages.length > 0) {
    console.log(`\nTOP ${pages.length} PAGES`)
    console.log("-".repeat(80))
    console.log(`  ${pad("page", 50)} ${pad("impr", 8)} ${pad("clicks", 7)} ${pad("ctr", 7)} pos`)
    for (const p of pages) {
      const path = p.page.replace(/^https?:\/\/[^/]+/, "")
      console.log(`  ${pad(path, 50)} ${pad(num(p.impressions), 8)} ${pad(num(p.clicks), 7)} ${pad(pct(p.ctr), 7)} ${p.position.toFixed(1)}`)
    }
  }

  console.log()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
