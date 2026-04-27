import { describe, it, expect } from "vitest"
import {
  ARBEITSAGENTUR_KEYWORDS,
  KEYWORD_CHUNK_SIZE,
  nextChunk,
} from "@/lib/job-source-config"

describe("ARBEITSAGENTUR_KEYWORDS", () => {
  it("contains at least 25 keywords spanning the planned profession set", () => {
    expect(ARBEITSAGENTUR_KEYWORDS.length).toBeGreaterThanOrEqual(25)
    expect(ARBEITSAGENTUR_KEYWORDS).toContain("Krankenpfleger")
    expect(ARBEITSAGENTUR_KEYWORDS).toContain("Assistenzarzt")
    expect(ARBEITSAGENTUR_KEYWORDS).toContain("Elektriker")
  })
})

describe("nextChunk", () => {
  it("returns the first KEYWORD_CHUNK_SIZE keywords when cursor is 0", () => {
    const { keywords, nextCursor } = nextChunk(0)
    expect(keywords).toHaveLength(KEYWORD_CHUNK_SIZE)
    expect(keywords[0]).toBe(ARBEITSAGENTUR_KEYWORDS[0])
    expect(nextCursor).toBe(KEYWORD_CHUNK_SIZE)
  })

  it("wraps around when cursor exceeds the list length", () => {
    const { keywords, nextCursor } = nextChunk(ARBEITSAGENTUR_KEYWORDS.length)
    expect(keywords).toHaveLength(KEYWORD_CHUNK_SIZE)
    expect(keywords[0]).toBe(ARBEITSAGENTUR_KEYWORDS[0])
    expect(nextCursor).toBe(KEYWORD_CHUNK_SIZE)
  })

  it("handles a chunk that crosses the wrap boundary", () => {
    const start = ARBEITSAGENTUR_KEYWORDS.length - 2
    const { keywords, nextCursor } = nextChunk(start)
    expect(keywords).toHaveLength(KEYWORD_CHUNK_SIZE)
    expect(keywords[0]).toBe(ARBEITSAGENTUR_KEYWORDS[start])
    expect(keywords[1]).toBe(ARBEITSAGENTUR_KEYWORDS[start + 1])
    // remaining KEYWORD_CHUNK_SIZE-2 keywords come from the start of the list
    expect(keywords[2]).toBe(ARBEITSAGENTUR_KEYWORDS[0])
    expect(nextCursor).toBe(KEYWORD_CHUNK_SIZE - 2)
  })
})
