import { describe, it, expect } from "vitest"
import { buildWhatsAppShareUrl, appendUtm } from "@/lib/share-links"

describe("buildWhatsAppShareUrl", () => {
  it("encodes text + url into wa.me", () => {
    const url = buildWhatsAppShareUrl({ text: "My match: 92/100", url: "https://dayzero.xyz/j/abc" })
    expect(url).toContain("https://wa.me/?text=")
    const payload = decodeURIComponent(url.split("?text=")[1])
    expect(payload).toBe("My match: 92/100\n\nhttps://dayzero.xyz/j/abc")
  })

  it("preserves emoji in text", () => {
    const url = buildWhatsAppShareUrl({ text: "🎯 92/100 match", url: "https://dayzero.xyz" })
    const payload = decodeURIComponent(url.split("?text=")[1])
    expect(payload.startsWith("🎯")).toBe(true)
  })
})

describe("appendUtm", () => {
  it("adds UTM params preserving existing query", () => {
    const out = appendUtm("https://dayzero.xyz/jobs/slug?preview=1", {
      source: "whatsapp",
      medium: "share",
      campaign: "match-score",
      code: "PRIYA-D0-A3F2",
    })
    const u = new URL(out)
    expect(u.searchParams.get("preview")).toBe("1")
    expect(u.searchParams.get("utm_source")).toBe("whatsapp")
    expect(u.searchParams.get("utm_medium")).toBe("share")
    expect(u.searchParams.get("utm_campaign")).toBe("match-score")
    expect(u.searchParams.get("ref")).toBe("PRIYA-D0-A3F2")
  })

  it("omits ref when no code provided", () => {
    const out = appendUtm("https://dayzero.xyz", { source: "whatsapp", medium: "share", campaign: "x" })
    const u = new URL(out)
    expect(u.searchParams.get("ref")).toBeNull()
  })
})
