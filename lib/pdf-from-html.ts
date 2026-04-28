/**
 * pdf-from-html — render an HTML string to a PDF buffer using a headless
 * Chromium instance.
 *
 * In production (Vercel serverless) we use @sparticuz/chromium which ships a
 * trimmed Chromium binary that fits inside the function size limit. Locally
 * (and on any non-Vercel host) we fall back to the developer's installed
 * Chrome / Chromium so the same code path can be exercised end-to-end on a
 * laptop without the 100MB serverless artifact.
 *
 * Why HTML→PDF instead of @react-pdf/renderer:
 *   The upstream @react-pdf/renderer 4.x line silently throws inside the
 *   Next 15 App Router serverless bundle (the bundler strips React.Component
 *   internals it relies on) and the bundled fork ships a yoga-layout WASM
 *   that crashes Vercel's webpack at build time. HTML→Chromium has no such
 *   compatibility issues — it's the standard pattern Vercel themselves
 *   recommend, and it's what Santiago's career-ops uses.
 */

import puppeteer, { type Browser, type LaunchOptions, type PaperFormat } from "puppeteer-core"

export interface RenderPdfOptions {
  /** A4 by default; pass "Letter" for US-style CVs. */
  format?: PaperFormat
  /** Margin in CSS units (e.g. "12mm"). Same value applied to all sides. */
  margin?: string
}

/**
 * Render an HTML document into a PDF buffer.
 *
 * The HTML must be a complete document (with <!doctype html>, <head>,
 * <body>) and inline its own CSS — no external network fetches happen
 * during rendering.
 */
export async function renderPdfFromHtml(
  html: string,
  opts: RenderPdfOptions = {}
): Promise<Buffer> {
  const { format = "a4", margin = "12mm" } = opts

  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 15_000 })
    const pdf = await page.pdf({
      format,
      printBackground: true,
      margin: { top: margin, right: margin, bottom: margin, left: margin },
    })
    return Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}

async function launchBrowser(): Promise<Browser> {
  // Vercel sets VERCEL="1" in every runtime environment (production,
  // preview, and dev — VERCEL_ENV distinguishes between them). Older
  // detection that keyed on AWS_LAMBDA_FUNCTION_NAME is unreliable on
  // current Vercel runtimes and was returning false in production,
  // sending the function down the local-Chrome path which obviously
  // doesn't exist on the serverless machine.
  const isServerless =
    process.env.VERCEL === "1" || !!process.env.AWS_LAMBDA_FUNCTION_NAME

  if (isServerless) {
    // Lazy-require so the binary download does not happen at import time
    // during local dev — only when actually launching on Vercel.
    const chromium = (await import("@sparticuz/chromium")).default
    const launchOptions: LaunchOptions = {
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    }
    return puppeteer.launch(launchOptions)
  }

  // Local dev — try common Chrome install paths.
  const localPaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter((p): p is string => Boolean(p))

  for (const executablePath of localPaths) {
    try {
      return await puppeteer.launch({ executablePath, headless: true })
    } catch {
      // try next
    }
  }
  throw new Error(
    "Could not find a local Chrome binary. Install Google Chrome or set PUPPETEER_EXECUTABLE_PATH."
  )
}

/**
 * Strip ATS-hostile characters (em-dashes, smart quotes, zero-width spaces)
 * from a string. Borrowed from Santiago's career-ops normalize step. Run
 * over user-facing text BEFORE inserting into the HTML template so the PDF
 * text layer is parser-friendly.
 */
export function normalizeForAts(text: string): string {
  return text
    .replace(/[‘’]/g, "'") // smart single quotes → '
    .replace(/[“”]/g, '"') // smart double quotes → "
    .replace(/[–—]/g, "-") // en/em dash → -
    .replace(/[…]/g, "...")     // horizontal ellipsis → ...
    .replace(/[ ]/g, " ")       // non-breaking space → space
    .replace(/[​-‍﻿]/g, "") // zero-width chars → strip
}

/**
 * HTML-escape a value for safe insertion into a template string. Use this
 * for ANY user-supplied or AI-generated text in the templates — without it
 * a stray '<' would break the layout (or worse, allow injection if the
 * template is ever rendered in a browser).
 */
export function escapeHtml(value: string): string {
  return normalizeForAts(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
