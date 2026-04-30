/**
 * Anschreiben HTML template — renders an AnschreibenResult into an HTML
 * string ready for renderPdfFromHtml(). Pure function, DIN-5008 inspired
 * layout for German business correspondence.
 */

import type { AnschreibenResult } from "./jobs-ai"
import { escapeHtml } from "./pdf-from-html"

function normalizePhone(s: string): string {
  return s.replace(/[^\d+]/g, "")
}

export interface AnschreibenHtmlInput {
  content: AnschreibenResult
  email: string
  phone: string | null
  showWatermark: boolean
}

export function renderAnschreibenHtml(input: AnschreibenHtmlInput): string {
  const { content, email, phone, showWatermark } = input

  // Sender block: dedupe email/phone if Claude already included them.
  // Without this, the candidate's email shows up twice (once in
  // senderBlock, once appended by us below) which reads as a typo.
  const senderRaw = (content.senderBlock || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
  const senderHasEmail = senderRaw.some((l) => l.toLowerCase().includes(email.toLowerCase()))
  const senderHasPhone = phone
    ? senderRaw.some((l) => normalizePhone(l).includes(normalizePhone(phone)))
    : false
  const senderLines = senderRaw.map(escapeHtml)

  // Recipient: dedupe blank-equivalent and identical lines (Claude
  // sometimes emits "Personalabteilung" + "Personalabteilung" or repeats
  // the city when job.location and job.company location were both passed
  // in upstream). Single-source the rendered output here.
  const recipientLines = Array.from(
    new Set(
      (content.recipientBlock || "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
    )
  ).map(escapeHtml)

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
    margin-bottom: 6pt;
  }
  /* Visible blank space for the handwritten signature, then the typed name. */
  .signature-space {
    height: 56pt;
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
    ${senderHasEmail ? "" : `<div class="line">${escapeHtml(email)}</div>`}
    ${phone && !senderHasPhone ? `<div class="line">${escapeHtml(phone)}</div>` : ""}
  </div>

  <div class="recipient">
    ${recipientLines.map((l) => `<div class="line">${l}</div>`).join("")}
  </div>

  <div class="date">${escapeHtml(content.date || "")}</div>

  <div class="subject">${escapeHtml(content.subject || "")}</div>

  <div class="salutation">${escapeHtml(content.salutation || "")}</div>

  ${paragraphs.map((p) => `<p class="paragraph">${p}</p>`).join("")}

  <div class="closing">${escapeHtml(content.closing || "")}</div>

  <div class="signature-space"></div>

  <div class="signature">${escapeHtml(content.signature || "")}</div>

  <div class="watermark">${escapeHtml(watermark)}</div>
</body>
</html>`
}
