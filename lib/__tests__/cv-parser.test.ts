import { describe, it, expect } from "vitest"
import { ParsedCVSchema } from "@/lib/cv-parser"

describe("ParsedCVSchema", () => {
  it("parses a minimal well-formed payload", () => {
    const raw = {
      firstName: "Priya",
      lastName: "Sharma",
      currentJobTitle: null,
      yearsOfExperience: 5,
      workExperience: [],
      skills: { technical: [], languages: [], soft: [] },
      educationDetails: [],
      certifications: [],
    }
    const parsed = ParsedCVSchema.parse(raw)
    expect(parsed.firstName).toBe("Priya")
    expect(parsed.workExperience).toEqual([])
  })

  it("handles null workExperience (Claude returns null instead of [])", () => {
    const raw = {
      firstName: null,
      lastName: null,
      currentJobTitle: null,
      yearsOfExperience: null,
      workExperience: null,
      skills: { technical: null, languages: null, soft: null },
      educationDetails: null,
      certifications: null,
    }
    const parsed = ParsedCVSchema.parse(raw)
    expect(parsed.workExperience).toEqual([])
    expect(parsed.skills.technical).toEqual([])
  })

  it("handles missing array keys (Claude omits them entirely)", () => {
    const raw = {
      firstName: null,
      lastName: null,
      currentJobTitle: null,
      yearsOfExperience: null,
      skills: { technical: [], languages: [], soft: [] },
    }
    // @ts-expect-error — testing runtime defaulting
    const parsed = ParsedCVSchema.parse(raw)
    expect(parsed.workExperience).toEqual([])
    expect(parsed.educationDetails).toEqual([])
  })

  it("rejects unknown top-level keys (prompt injection defense)", () => {
    const raw = {
      firstName: "X",
      lastName: null,
      currentJobTitle: null,
      yearsOfExperience: null,
      workExperience: [],
      skills: { technical: [], languages: [], soft: [] },
      educationDetails: [],
      certifications: [],
      germanLevel: "C2",
    }
    expect(() => ParsedCVSchema.parse(raw)).toThrow()
  })

  it("coerces arrays inside skills even if nullable inside", () => {
    const raw = {
      firstName: null,
      lastName: null,
      currentJobTitle: null,
      yearsOfExperience: null,
      workExperience: [],
      skills: { technical: ["Python"], languages: null, soft: [] },
      educationDetails: [],
      certifications: [],
    }
    const parsed = ParsedCVSchema.parse(raw)
    expect(parsed.skills.technical).toEqual(["Python"])
    expect(parsed.skills.languages).toEqual([])
  })
})
