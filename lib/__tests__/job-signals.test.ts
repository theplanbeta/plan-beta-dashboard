import { describe, it, expect, vi, beforeEach } from "vitest"
import { JobSignalsSchema, computeSignalsHash } from "@/lib/job-signals"

describe("JobSignalsSchema", () => {
  it("parses a fully populated signal payload", () => {
    const raw = {
      languageLevel: "B2",
      englishOk: false,
      anerkennungRequired: "REQUIRED",
      visaPathway: "BLUE_CARD",
      anerkennungSupport: true,
      visaSponsorship: true,
      relocationSupport: "Umzugskostenpauschale + 4 Wochen Übergangswohnung",
    }
    const parsed = JobSignalsSchema.parse(raw)
    expect(parsed.languageLevel).toBe("B2")
    expect(parsed.relocationSupport).toContain("Übergangswohnung")
  })

  it("accepts nulls for every field (model uncertain)", () => {
    const raw = {
      languageLevel: null,
      englishOk: null,
      anerkennungRequired: null,
      visaPathway: null,
      anerkennungSupport: null,
      visaSponsorship: null,
      relocationSupport: null,
    }
    const parsed = JobSignalsSchema.parse(raw)
    expect(parsed.languageLevel).toBeNull()
  })

  it("rejects an unknown enum value", () => {
    const raw = {
      languageLevel: "PERFECT",
      englishOk: false,
      anerkennungRequired: "REQUIRED",
      visaPathway: "BLUE_CARD",
      anerkennungSupport: false,
      visaSponsorship: false,
      relocationSupport: null,
    }
    expect(() => JobSignalsSchema.parse(raw)).toThrow()
  })

  it("clamps relocationSupport to 200 chars", () => {
    const long = "a".repeat(500)
    const raw = {
      languageLevel: null,
      englishOk: null,
      anerkennungRequired: null,
      visaPathway: null,
      anerkennungSupport: null,
      visaSponsorship: null,
      relocationSupport: long,
    }
    const parsed = JobSignalsSchema.parse(raw)
    expect(parsed.relocationSupport!.length).toBeLessThanOrEqual(200)
  })
})

describe("computeSignalsHash", () => {
  it("produces a stable 64-char hex hash for identical input", () => {
    const a = computeSignalsHash("Senior Pflegefachkraft", "Wir suchen ...", ["B2 Deutsch"])
    const b = computeSignalsHash("Senior Pflegefachkraft", "Wir suchen ...", ["B2 Deutsch"])
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  it("differs when title or description changes", () => {
    const a = computeSignalsHash("Pflegefachkraft", "X", [])
    const b = computeSignalsHash("Pflegefachkraft", "Y", [])
    expect(a).not.toBe(b)
  })

  it("treats null and empty description identically", () => {
    const a = computeSignalsHash("X", null, [])
    const b = computeSignalsHash("X", "", [])
    expect(a).toBe(b)
  })

  it("differs when requirements change", () => {
    const a = computeSignalsHash("Pflegefachkraft", "Same desc", ["B2 Deutsch"])
    const b = computeSignalsHash("Pflegefachkraft", "Same desc", ["C1 Deutsch", "Approbation"])
    expect(a).not.toBe(b)
  })
})

vi.mock("@/lib/gemini-client", () => ({
  generateContent: vi.fn(),
  isGeminiAvailable: vi.fn(() => true),
}))

describe("extractSignals", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("returns parsed signals when Gemini returns valid JSON", async () => {
    const { generateContent } = await import("@/lib/gemini-client")
    ;(generateContent as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      content: JSON.stringify({
        languageLevel: "B2",
        englishOk: false,
        anerkennungRequired: "REQUIRED",
        visaPathway: "PFLEGE_VISA",
        anerkennungSupport: true,
        visaSponsorship: true,
        relocationSupport: null,
      }),
    })
    const { extractSignals } = await import("@/lib/job-signals")
    const result = await extractSignals({
      title: "Pflegefachkraft (m/w/d)",
      description: "Wir bieten Anerkennungsunterstützung",
      requirements: ["B2 Deutsch"],
    })
    expect(result.signals?.languageLevel).toBe("B2")
    expect(result.error).toBeUndefined()
  })

  it("returns an error when Gemini response is not valid JSON", async () => {
    const { generateContent } = await import("@/lib/gemini-client")
    ;(generateContent as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      content: "not json",
    })
    const { extractSignals } = await import("@/lib/job-signals")
    const result = await extractSignals({
      title: "X",
      description: "Y",
      requirements: [],
    })
    expect(result.signals).toBeUndefined()
    expect(result.error).toMatch(/parse/i)
  })

  it("returns an error when Gemini API itself fails", async () => {
    const { generateContent } = await import("@/lib/gemini-client")
    ;(generateContent as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: "rate limit",
    })
    const { extractSignals } = await import("@/lib/job-signals")
    const result = await extractSignals({
      title: "X",
      description: "Y",
      requirements: [],
    })
    expect(result.signals).toBeUndefined()
    expect(result.error).toBe("rate limit")
  })
})
