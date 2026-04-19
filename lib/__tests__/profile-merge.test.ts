import { describe, it, expect } from "vitest"
import { smartMerge, type ExistingProfile } from "@/lib/profile-merge"
import type { ParsedCV } from "@/lib/cv-parser"

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
