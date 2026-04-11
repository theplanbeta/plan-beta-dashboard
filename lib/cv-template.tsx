// lib/cv-template.tsx
import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer"
import type { CVContentResult } from "./jobs-ai"

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 45,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.5,
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
    paddingBottom: 12,
  },
  name: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: "row",
    gap: 12,
    fontSize: 9,
    color: "#6b7280",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 3,
  },
  summary: {
    fontSize: 10,
    lineHeight: 1.6,
    color: "#374151",
    marginBottom: 4,
  },
  competenciesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  competencyTag: {
    backgroundColor: "#eff6ff",
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 9,
    color: "#1d4ed8",
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  jobTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  jobCompany: {
    fontSize: 10,
    color: "#6b7280",
  },
  jobDates: {
    fontSize: 9,
    color: "#9ca3af",
  },
  bullet: {
    flexDirection: "row",
    marginBottom: 2,
    paddingLeft: 8,
  },
  bulletDot: {
    width: 12,
    fontSize: 10,
    color: "#6b7280",
  },
  bulletText: {
    flex: 1,
    fontSize: 9.5,
    lineHeight: 1.5,
    color: "#374151",
  },
  eduRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 2,
  },
  skillTag: {
    fontSize: 9,
    color: "#374151",
  },
  watermark: {
    position: "absolute",
    bottom: 15,
    right: 45,
    fontSize: 7,
    color: "#d1d5db",
  },
})

// ── Component ──────────────────────────────────────────────────────────

interface CVTemplateProps {
  content: CVContentResult
  name: string
  email: string
  phone: string | null
  germanLevel: string | null
  visaStatus: string | null
  language: "en" | "de"
  showWatermark: boolean // true for free tier
}

export function CVTemplate({
  content,
  name,
  email,
  phone,
  germanLevel,
  visaStatus,
  language,
  showWatermark,
}: CVTemplateProps) {
  const headerLabel = language === "de" ? "Lebenslauf" : "Curriculum Vitae"
  const summaryLabel = language === "de" ? "PROFIL" : "PROFESSIONAL SUMMARY"
  const competenciesLabel = language === "de" ? "KERNKOMPETENZEN" : "CORE COMPETENCIES"
  const experienceLabel = language === "de" ? "BERUFSERFAHRUNG" : "WORK EXPERIENCE"
  const educationLabel = language === "de" ? "AUSBILDUNG" : "EDUCATION"
  const skillsLabel = language === "de" ? "FÄHIGKEITEN" : "SKILLS"
  const certLabel = language === "de" ? "ZERTIFIKATE" : "CERTIFICATIONS"

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{name}</Text>
          <View style={styles.contactRow}>
            <Text>{email}</Text>
            {phone && <Text>{phone}</Text>}
            {germanLevel && <Text>German: {germanLevel}</Text>}
            {visaStatus && <Text>{visaStatus}</Text>}
          </View>
        </View>

        {/* Professional Summary */}
        <Text style={styles.sectionTitle}>{summaryLabel}</Text>
        <Text style={styles.summary}>{content.professionalSummary}</Text>

        {/* Core Competencies */}
        <Text style={styles.sectionTitle}>{competenciesLabel}</Text>
        <View style={styles.competenciesRow}>
          {content.coreCompetencies.map((comp, i) => (
            <Text key={i} style={styles.competencyTag}>
              {comp}
            </Text>
          ))}
        </View>

        {/* Work Experience */}
        {content.workExperience.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{experienceLabel}</Text>
            {content.workExperience.map((exp, i) => (
              <View key={i} style={{ marginBottom: 8 }}>
                <View style={styles.jobHeader}>
                  <View>
                    <Text style={styles.jobTitle}>{exp.title}</Text>
                    <Text style={styles.jobCompany}>{exp.company}</Text>
                  </View>
                  <Text style={styles.jobDates}>
                    {exp.startDate} – {exp.endDate}
                  </Text>
                </View>
                {exp.bullets.map((bullet, j) => (
                  <View key={j} style={styles.bullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

        {/* Education */}
        {content.education.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{educationLabel}</Text>
            {content.education.map((edu, i) => (
              <View key={i} style={styles.eduRow}>
                <Text>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>
                    {edu.degree}
                  </Text>
                  {" — "}
                  {edu.institution}
                </Text>
                <Text style={styles.jobDates}>{edu.year}</Text>
              </View>
            ))}
          </>
        )}

        {/* Skills */}
        <Text style={styles.sectionTitle}>{skillsLabel}</Text>
        {content.skills.technical.length > 0 && (
          <View style={styles.skillsRow}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9 }}>
              Technical:{" "}
            </Text>
            <Text style={styles.skillTag}>
              {content.skills.technical.join(" • ")}
            </Text>
          </View>
        )}
        {content.skills.languages.length > 0 && (
          <View style={styles.skillsRow}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9 }}>
              Languages:{" "}
            </Text>
            <Text style={styles.skillTag}>
              {content.skills.languages.join(" • ")}
            </Text>
          </View>
        )}

        {/* Certifications */}
        {content.certifications.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{certLabel}</Text>
            {content.certifications.map((cert, i) => (
              <View key={i} style={styles.eduRow}>
                <Text>{cert.name}</Text>
                <Text style={styles.jobDates}>{cert.year}</Text>
              </View>
            ))}
          </>
        )}

        {/* Watermark for free tier */}
        {showWatermark && (
          <Text style={styles.watermark}>Generated with Plan Beta Day Zero</Text>
        )}
      </Page>
    </Document>
  )
}
