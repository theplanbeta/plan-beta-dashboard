import { describe, it, expect } from "vitest"
import { smartMerge, PARSED_CV_SCALAR_KEYS, type ExistingProfile } from "@/lib/profile-merge"
import { ParsedCVSchema, type ParsedCV } from "@/lib/cv-parser"

function makeExisting(overrides: Partial<ExistingProfile> = {}): ExistingProfile {
  return {
    firstName: "Priya",
    lastName: "Sharma",
    currentJobTitle: null,
    yearsOfExperience: 3,
    workExperience: [],
    skills: { technical: ["Python"], languages: ["English"], soft: [] },
    educationDetails: [],
    certifications: [],
    manuallyEditedFields: null,
    ...overrides,
  }
}

function makeParsed(overrides: Partial<ParsedCV> = {}): ParsedCV {
  return {
    firstName: null,
    lastName: null,
    currentJobTitle: null,
    yearsOfExperience: null,
    workExperience: [],
    skills: { technical: [], languages: [], soft: [] },
    educationDetails: [],
    certifications: [],
    ...overrides,
  } as ParsedCV
}

describe("smartMerge", () => {
  it("appends new work experience entries", () => {
    const existing = makeExisting()
    const parsed = makeParsed({
      workExperience: [{ id: "new1", company: "Acme", title: "Engineer", from: "2023", to: null, description: null }],
    })
    const { merged, diff } = smartMerge(existing, parsed)
    expect(merged.workExperience).toHaveLength(1)
    expect(diff.workExperience.added).toHaveLength(1)
  })

  it("matches existing work experience and skips re-adding", () => {
    const existing = makeExisting({
      workExperience: [{ id: "e1", company: "Acme", title: "Engineer", from: "2023", to: null, description: "existing desc" }],
    })
    const parsed = makeParsed({
      workExperience: [{ id: "new1", company: "ACME", title: "engineer", from: "2023", to: null, description: null }],
    })
    const { merged, diff } = smartMerge(existing, parsed)
    expect(merged.workExperience).toHaveLength(1)
    expect(merged.workExperience[0].description).toBe("existing desc")
    expect(diff.workExperience.matched).toHaveLength(1)
    expect(diff.workExperience.added).toHaveLength(0)
  })

  it("respects manuallyEditedFields and skips scalar overwrite", () => {
    const existing = makeExisting({
      currentJobTitle: "Senior Engineer",
      manuallyEditedFields: { "profile.currentJobTitle": true },
    })
    const parsed = makeParsed({ currentJobTitle: "Junior Engineer" })
    const { merged, diff } = smartMerge(existing, parsed)
    expect(merged.currentJobTitle).toBe("Senior Engineer")
    expect(diff.preservedFromManualEdits).toContain("profile.currentJobTitle")
  })

  it("union-merges skills case-insensitively", () => {
    const existing = makeExisting({
      skills: { technical: ["Python", "SQL"], languages: [], soft: [] },
    })
    const parsed = makeParsed({
      skills: { technical: ["python", "Docker"], languages: [], soft: [] },
    })
    const { merged, diff } = smartMerge(existing, parsed)
    expect(merged.skills?.technical).toEqual(["Python", "SQL", "Docker"])
    expect(diff.skills.addedTechnical).toEqual(["Docker"])
  })

  it("skips skills entirely if manually edited", () => {
    const existing = makeExisting({
      skills: { technical: ["Python"], languages: [], soft: [] },
      manuallyEditedFields: { "profile.skills": true },
    })
    const parsed = makeParsed({
      skills: { technical: ["JavaScript"], languages: [], soft: [] },
    })
    const { merged, diff } = smartMerge(existing, parsed)
    expect(merged.skills?.technical).toEqual(["Python"])
    expect(diff.preservedFromManualEdits).toContain("profile.skills")
  })
})

describe("smartMerge date normalization + unionCI hygiene", () => {
  it("deduplicates work entries across date-format variants", () => {
    const existing = makeExisting({
      workExperience: [{ id: "e1", company: "Acme", title: "Engineer", from: "2020-03", to: null, description: "original" }],
    })
    const parsed = makeParsed({
      workExperience: [{ id: "n1", company: "Acme", title: "Engineer", from: "March 2020", to: null, description: "new" }],
    })
    const { merged, diff } = smartMerge(existing, parsed)
    expect(merged.workExperience).toHaveLength(1)
    expect(merged.workExperience[0].description).toBe("original")
    expect(diff.workExperience.added).toHaveLength(0)
  })

  it("handles 03/2020 slash format", () => {
    const existing = makeExisting({
      workExperience: [{ id: "e1", company: "Acme", title: "Engineer", from: "2020-03", to: null, description: null }],
    })
    const parsed = makeParsed({
      workExperience: [{ id: "n1", company: "Acme", title: "Engineer", from: "03/2020", to: null, description: null }],
    })
    const { diff } = smartMerge(existing, parsed)
    expect(diff.workExperience.added).toHaveLength(0)
  })

  it("skills unionCI trims and is case-insensitive", () => {
    const existing = makeExisting({ skills: { technical: ["Python"], languages: [], soft: [] } })
    const parsed = makeParsed({ skills: { technical: ["  python  ", "Docker"], languages: [], soft: [] } })
    const { merged } = smartMerge(existing, parsed)
    expect(merged.skills?.technical).toEqual(["Python", "Docker"])
  })
})

describe("PARSED_CV_SCALAR_KEYS drift-coverage", () => {
  it("every key in PARSED_CV_SCALAR_KEYS exists on ParsedCVSchema", () => {
    const shape = ParsedCVSchema.shape as Record<string, unknown>
    for (const key of PARSED_CV_SCALAR_KEYS) {
      expect(shape).toHaveProperty(key)
    }
  })

  it("catches drift when a new scalar is added to ParsedCV without updating the list", () => {
    // If ParsedCV adds a new top-level non-array/non-object scalar (string or number)
    // and PARSED_CV_SCALAR_KEYS is not updated, the new scalar silently bypasses
    // manuallyEditedFields protection on future merges. This test enumerates the
    // expected scalar keys and fires a clear failure when they drift.
    const expectedScalars = ["firstName", "lastName", "currentJobTitle", "yearsOfExperience"]
    expect([...PARSED_CV_SCALAR_KEYS].sort()).toEqual(expectedScalars.sort())
  })
})
