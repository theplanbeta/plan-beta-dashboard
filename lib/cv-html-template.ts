/**
 * CV HTML template — renders a CVContentResult into an HTML string ready
 * for renderPdfFromHtml(). Pure function, no React, no PDF library.
 */

import type { CVContentResult } from "./jobs-ai"
import { escapeHtml } from "./pdf-from-html"

export interface CVHtmlInput {
  content: CVContentResult
  name: string
  email: string
  phone: string | null
  germanLevel: string | null
  visaStatus: string | null
  language: "en" | "de"
  showWatermark: boolean
}

const LABELS = {
  en: {
    summary: "Professional Summary",
    competencies: "Core Competencies",
    experience: "Work Experience",
    education: "Education",
    skills: "Skills",
    certifications: "Certifications",
    technical: "Technical",
    languages: "Languages",
    german: "German",
  },
  de: {
    summary: "Profil",
    competencies: "Kernkompetenzen",
    experience: "Berufserfahrung",
    education: "Ausbildung",
    skills: "Fähigkeiten",
    certifications: "Zertifikate",
    technical: "Technische Kenntnisse",
    languages: "Sprachen",
    german: "Deutsch",
  },
} as const

export function renderCvHtml(input: CVHtmlInput): string {
  const { content, name, email, phone, germanLevel, visaStatus, language, showWatermark } = input
  const L = LABELS[language]

  const contactParts = [
    escapeHtml(email),
    phone ? escapeHtml(phone) : null,
    germanLevel ? `${L.german}: ${escapeHtml(germanLevel)}` : null,
    visaStatus ? escapeHtml(visaStatus) : null,
  ].filter(Boolean)

  const competencies = (content.coreCompetencies || [])
    .map((c) => `<li>${escapeHtml(c)}</li>`)
    .join("")

  const experience = (content.workExperience || [])
    .map(
      (exp) => `
        <article class="job">
          <header class="job-header">
            <div>
              <div class="job-title">${escapeHtml(exp.title)}</div>
              <div class="job-company">${escapeHtml(exp.company)}</div>
            </div>
            <div class="job-dates">${escapeHtml(exp.startDate)} – ${escapeHtml(exp.endDate)}</div>
          </header>
          <ul class="bullets">
            ${(exp.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join("")}
          </ul>
        </article>
      `
    )
    .join("")

  const education = (content.education || [])
    .map(
      (edu) => `
        <div class="edu-row">
          <div><strong>${escapeHtml(edu.degree)}</strong> — ${escapeHtml(edu.institution)}</div>
          <div class="edu-year">${escapeHtml(edu.year)}</div>
        </div>
      `
    )
    .join("")

  const skillsTechnical =
    (content.skills?.technical || []).length > 0
      ? `<div class="skills-row"><strong>${L.technical}:</strong> ${(content.skills.technical || [])
          .map(escapeHtml)
          .join(" • ")}</div>`
      : ""
  const skillsLanguages =
    (content.skills?.languages || []).length > 0
      ? `<div class="skills-row"><strong>${L.languages}:</strong> ${(content.skills.languages || [])
          .map(escapeHtml)
          .join(" • ")}</div>`
      : ""

  const certifications =
    (content.certifications || []).length > 0
      ? `<section class="section">
          <h2>${L.certifications}</h2>
          ${content.certifications
            .map(
              (cert) => `
                <div class="edu-row">
                  <div>${escapeHtml(cert.name)}</div>
                  <div class="edu-year">${escapeHtml(cert.year)}</div>
                </div>
              `
            )
            .join("")}
        </section>`
      : ""

  const watermark = showWatermark
    ? "Generated with Plan Beta Day Zero"
    : "Made with Day Zero · dayzero.xyz"

  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(name)} — CV</title>
<style>
  /* Print-targeted styles. Match the previous react-pdf design closely
     so the visual identity stays the same. */
  @page { size: A4; margin: 0; }
  body {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.5;
    color: #1a1a1a;
    margin: 0;
    padding: 40pt 45pt;
  }
  header.masthead {
    border-bottom: 2pt solid #2563eb;
    padding-bottom: 12pt;
    margin-bottom: 16pt;
  }
  .name {
    font-size: 22pt;
    font-weight: bold;
    margin: 0 0 6pt;
  }
  .contact {
    font-size: 9.5pt;
    color: #555;
  }
  .contact span + span::before {
    content: "  ·  ";
    color: #aaa;
  }
  h2 {
    font-size: 11pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #2563eb;
    margin: 16pt 0 6pt;
    border-bottom: 0.5pt solid #d4d4d8;
    padding-bottom: 3pt;
  }
  .summary { margin-bottom: 4pt; }
  .competencies {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6pt 8pt;
  }
  .competencies li {
    background: #eff6ff;
    border: 0.5pt solid #bfdbfe;
    color: #1e3a8a;
    padding: 2pt 8pt;
    border-radius: 3pt;
    font-size: 9pt;
  }
  .job { margin-bottom: 10pt; page-break-inside: avoid; }
  .job-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12pt;
  }
  .job-title { font-weight: bold; }
  .job-company { color: #555; font-size: 9.5pt; }
  .job-dates {
    font-size: 9pt;
    color: #6b7280;
    white-space: nowrap;
  }
  .bullets {
    list-style: disc;
    padding-left: 14pt;
    margin: 4pt 0 0;
  }
  .bullets li { margin-bottom: 2pt; }
  .edu-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12pt;
    margin-bottom: 4pt;
  }
  .edu-year {
    font-size: 9pt;
    color: #6b7280;
    white-space: nowrap;
  }
  .skills-row { margin-bottom: 3pt; font-size: 9.5pt; }
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
  <header class="masthead">
    <h1 class="name">${escapeHtml(name)}</h1>
    <div class="contact">
      ${contactParts.map((p) => `<span>${p}</span>`).join("")}
    </div>
  </header>

  <section class="section">
    <h2>${L.summary}</h2>
    <p class="summary">${escapeHtml(content.professionalSummary || "")}</p>
  </section>

  ${
    competencies
      ? `<section class="section">
          <h2>${L.competencies}</h2>
          <ul class="competencies">${competencies}</ul>
        </section>`
      : ""
  }

  ${
    experience
      ? `<section class="section">
          <h2>${L.experience}</h2>
          ${experience}
        </section>`
      : ""
  }

  ${
    education
      ? `<section class="section">
          <h2>${L.education}</h2>
          ${education}
        </section>`
      : ""
  }

  ${
    skillsTechnical || skillsLanguages
      ? `<section class="section">
          <h2>${L.skills}</h2>
          ${skillsTechnical}
          ${skillsLanguages}
        </section>`
      : ""
  }

  ${certifications}

  <div class="watermark">${escapeHtml(watermark)}</div>
</body>
</html>`
}
