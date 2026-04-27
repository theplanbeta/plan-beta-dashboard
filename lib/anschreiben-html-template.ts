/**
 * Anschreiben HTML template — renders an AnschreibenResult into an HTML
 * string ready for renderPdfFromHtml(). Pure function, DIN-5008 inspired
 * layout for German business correspondence.
 */

import type { AnschreibenResult } from "./jobs-ai"
import { escapeHtml } from "./pdf-from-html"

export interface AnschreibenHtmlInput {
  content: AnschreibenResult
  email: string
  phone: string | null
  showWatermark: boolean
}

export function renderAnschreibenHtml(input: AnschreibenHtmlInput): string {
  const { content, email, phone, showWatermark } = input

  const senderLines = (content.senderBlock || "")
    .split("\n")
    .filter((l) => l.trim())
    .map(escapeHtml)
  const recipientLines = (content.recipientBlock || "")
    .split("\n")
    .filter((l) => l.trim())
    .map(escapeHtml)
  const paragraphs = (content.paragraphs || []).map(escapeHtml)

  const watermark = showWatermark
    ? "Generated with Plan Beta Day Zero"
    : "Made with Day Zero · dayzero.xyz"

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Anschreiben — ${escapeHtml(content.subject || "")}</title>
<style>
  @page { size: A4; margin: 0; }
  body {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #1a1a1a;
    margin: 0;
    padding: 50pt 55pt 60pt;
  }
  .sender {
    text-align: right;
    margin-bottom: 30pt;
  }
  .sender .line {
    font-size: 10pt;
    color: #374151;
    line-height: 1.4;
  }
  .recipient {
    margin-bottom: 24pt;
  }
  .recipient .line {
    line-height: 1.4;
  }
  .date {
    text-align: right;
    margin-bottom: 24pt;
  }
  .subject {
    font-weight: bold;
    margin-bottom: 18pt;
  }
  .salutation {
    margin-bottom: 14pt;
  }
  .paragraph {
    margin-bottom: 12pt;
    text-align: justify;
  }
  .closing {
    margin-top: 18pt;
    margin-bottom: 28pt;
  }
  .signature {
    font-weight: 500;
  }
  .watermark {
    position: fixed;
    bottom: 12pt;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 7.5pt;
    color: #9ca3af;
  }
</style>
</head>
<body>
  <div class="sender">
    ${senderLines.map((l) => `<div class="line">${l}</div>`).join("")}
    <div class="line">${escapeHtml(email)}</div>
    ${phone ? `<div class="line">${escapeHtml(phone)}</div>` : ""}
  </div>

  <div class="recipient">
    ${recipientLines.map((l) => `<div class="line">${l}</div>`).join("")}
  </div>

  <div class="date">${escapeHtml(content.date || "")}</div>

  <div class="subject">${escapeHtml(content.subject || "")}</div>

  <div class="salutation">${escapeHtml(content.salutation || "")}</div>

  ${paragraphs.map((p) => `<p class="paragraph">${p}</p>`).join("")}

  <div class="closing">${escapeHtml(content.closing || "")}</div>

  <div class="signature">${escapeHtml(content.signature || "")}</div>

  <div class="watermark">${escapeHtml(watermark)}</div>
</body>
</html>`
}
