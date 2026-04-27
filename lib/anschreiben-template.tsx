// lib/anschreiben-template.tsx
import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@joshuajaco/react-pdf-renderer-bundled"
import type { AnschreibenResult } from "./jobs-ai"

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 55,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.5,
    color: "#1a1a1a",
  },
  // Sender block: top-right
  senderWrap: {
    alignItems: "flex-end",
    marginBottom: 30,
  },
  senderLine: {
    fontSize: 10,
    color: "#374151",
    lineHeight: 1.4,
  },
  // Recipient block: left-aligned
  recipientWrap: {
    marginBottom: 24,
  },
  recipientLine: {
    fontSize: 11,
    color: "#1a1a1a",
    lineHeight: 1.4,
  },
  // Date: right-aligned below recipient
  dateWrap: {
    alignItems: "flex-end",
    marginBottom: 24,
  },
  dateLine: {
    fontSize: 11,
    color: "#1a1a1a",
  },
  // Subject: bold, slightly larger
  subject: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 20,
  },
  // Salutation
  salutation: {
    fontSize: 11,
    color: "#1a1a1a",
    marginBottom: 14,
  },
  // Paragraph
  paragraph: {
    fontSize: 11,
    lineHeight: 1.5,
    color: "#1a1a1a",
    marginBottom: 12,
    textAlign: "justify",
  },
  // Closing
  closing: {
    fontSize: 11,
    color: "#1a1a1a",
    marginTop: 14,
    marginBottom: 36, // space for handwritten signature
  },
  signature: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
  },
  // Watermark
  watermark: {
    position: "absolute",
    bottom: 20,
    right: 55,
    fontSize: 7,
    color: "#d1d5db",
  },
})

// ── Component ──────────────────────────────────────────────────────────

interface AnschreibenTemplateProps {
  content: AnschreibenResult
  email: string
  phone: string | null
  showWatermark: boolean
}

export function AnschreibenTemplate({
  content,
  email,
  phone,
  showWatermark,
}: AnschreibenTemplateProps): React.ReactElement {
  // Build sender lines: AI-provided senderBlock + contact info (email/phone)
  const senderLines = (content.senderBlock || "").split("\n").filter(Boolean)
  const recipientLines = (content.recipientBlock || "").split("\n").filter(Boolean)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Sender block — top-right */}
        <View style={styles.senderWrap}>
          {senderLines.map((line, i) => (
            <Text key={`s-${i}`} style={styles.senderLine}>
              {line}
            </Text>
          ))}
          <Text style={styles.senderLine}>{email}</Text>
          {phone && <Text style={styles.senderLine}>{phone}</Text>}
        </View>

        {/* Recipient block — left-aligned */}
        <View style={styles.recipientWrap}>
          {recipientLines.map((line, i) => (
            <Text key={`r-${i}`} style={styles.recipientLine}>
              {line}
            </Text>
          ))}
        </View>

        {/* Date — right-aligned */}
        <View style={styles.dateWrap}>
          <Text style={styles.dateLine}>{content.date}</Text>
        </View>

        {/* Subject */}
        <Text style={styles.subject}>{content.subject}</Text>

        {/* Salutation */}
        <Text style={styles.salutation}>{content.salutation}</Text>

        {/* Body paragraphs */}
        {content.paragraphs.map((para, i) => (
          <Text key={`p-${i}`} style={styles.paragraph}>
            {para}
          </Text>
        ))}

        {/* Closing */}
        <Text style={styles.closing}>{content.closing}</Text>

        {/* Signature */}
        <Text style={styles.signature}>{content.signature}</Text>

        {/* Tier-aware footer (free → credit, paid → subtle brand) */}
        {showWatermark ? (
          <Text style={styles.watermark}>Generated with Plan Beta Day Zero</Text>
        ) : (
          <Text style={styles.watermark}>Made with Day Zero · dayzero.xyz</Text>
        )}
      </Page>
    </Document>
  )
}
