// app/api/jobs-app/applications/[id]/kit/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireJobSeeker } from "@/lib/jobs-app-auth"

/**
 * Clean a string for use in a filename: replace spaces with underscores,
 * strip anything that isn't alphanumeric, underscore, or hyphen.
 */
function cleanForFilename(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
}

/**
 * Resolve a first/last name pair from the seeker profile, falling back to
 * splitting `seeker.name` on whitespace, and finally to "Candidate".
 */
function resolveName(
  profileFirst: string | null | undefined,
  profileLast: string | null | undefined,
  seekerName: string | null | undefined
): { firstName: string; lastName: string } {
  if (profileFirst || profileLast) {
    return {
      firstName: profileFirst || "",
      lastName: profileLast || "",
    }
  }

  if (seekerName && seekerName.trim().length > 0) {
    const parts = seekerName.trim().split(/\s+/)
    const firstName = parts[0] || "Candidate"
    const lastName = parts.slice(1).join(" ") || ""
    return { firstName, lastName }
  }

  return { firstName: "Candidate", lastName: "" }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let seeker
  try {
    seeker = await requireJobSeeker(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  const { id } = await params

  // 1. Find the application (no ownership filter so we can distinguish
  //    "not found" from "forbidden").
  const application = await prisma.jobApplication.findUnique({
    where: { id },
  })

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 })
  }

  if (application.seekerId !== seeker.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // 2. Look up the JobPosting (plain string, not a FK).
  const jobPosting = await prisma.jobPosting.findUnique({
    where: { id: application.jobPostingId },
  })

  // 3. Latest generated CV for this seeker + job.
  const latestCV = await prisma.generatedCV.findFirst({
    where: {
      seekerId: seeker.id,
      jobPostingId: application.jobPostingId,
    },
    orderBy: { createdAt: "desc" },
  })

  // 4. Language selection.
  //
  // For the email draft + portal guide we use the SEEKER's certified level
  // — they're the one writing the email, so they need to be comfortable
  // in the language.
  //
  // For the CV/Anschreiben suggestedLanguage we use the JOB's required
  // level: if the listing demands B2+ German, the application package
  // should default to German regardless of seeker comfort, because
  // German clinics will hard-skip an English Lebenslauf. The seeker can
  // override via the toggle in the modal.
  const seekerGermanLevel = seeker.profile?.germanLevel ?? ""
  const useGerman = ["B1", "B2", "C1", "C2"].includes(seekerGermanLevel)

  const jobGermanLevel = (jobPosting?.germanLevel ?? "").toUpperCase()
  const suggestedLanguage: "de" | "en" =
    ["B2", "C1", "C2"].includes(jobGermanLevel) ? "de" : "en"

  const { firstName, lastName } = resolveName(
    seeker.profile?.firstName,
    seeker.profile?.lastName,
    seeker.name
  )

  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || "Candidate"

  // Prefer live job posting values if available, fall back to the denormalized
  // copy on the application (which survives job deletion).
  const jobTitle = jobPosting?.title || application.jobTitle
  const jobCompany = jobPosting?.company || application.jobCompany

  // 5. Build email draft.
  let emailDraft: {
    subject: string
    body: string
    attachmentNames: string[]
  }

  const cleanFirst = cleanForFilename(firstName)
  const cleanLast = cleanForFilename(lastName)
  const nameSuffix = [cleanFirst, cleanLast].filter(Boolean).join("_") || "Candidate"

  if (useGerman) {
    emailDraft = {
      subject: `Bewerbung als ${jobTitle} — ${displayName}`,
      body: `Sehr geehrte Damen und Herren,

anbei sende ich Ihnen meine Bewerbungsunterlagen für die ausgeschriebene Stelle als ${jobTitle} bei ${jobCompany}.

Über eine positive Rückmeldung würde ich mich sehr freuen.

Mit freundlichen Grüßen
${displayName}`,
      attachmentNames: [
        `Lebenslauf_${nameSuffix}.pdf`,
        `Anschreiben_${nameSuffix}.pdf`,
      ],
    }
  } else {
    emailDraft = {
      subject: `Application for ${jobTitle} — ${displayName}`,
      body: `Dear Hiring Manager,

Please find attached my application documents for the position of ${jobTitle} at ${jobCompany}.

I would be delighted to hear from you.

Kind regards,
${displayName}`,
      attachmentNames: [
        `Resume_${nameSuffix}.pdf`,
        `CoverLetter_${nameSuffix}.pdf`,
      ],
    }
  }

  // 6. Portal guide (language-specific).
  const portalGuide = useGerman
    ? "Bei Online-Portalen: Kopieren Sie Ihre Zusammenfassung in das Feld 'Über mich' oder 'Motivation'. Laden Sie beide PDFs (Lebenslauf und Anschreiben) als Anhänge hoch. Wählen Sie bei 'Deutschkenntnisse' Ihr zertifiziertes Level. Bei 'Frühestmöglicher Eintritt' verwenden Sie '1-3 Monate Kündigungsfrist', wenn kein genaues Datum bekannt ist."
    : "For portal applications: Copy your professional summary into the 'About' or 'Motivation' field. Upload both PDFs (CV and cover letter) as attachments. If there's a 'German Level' dropdown, select your certified level. For 'Earliest Start Date', use '1-3 months notice' unless you have a specific date."

  // 7. Assemble kit.
  const kit = {
    cv: latestCV
      ? {
          id: latestCV.id,
          fileUrl: latestCV.fileUrl,
          language: latestCV.language,
          createdAt: latestCV.createdAt,
        }
      : null,
    anschreiben: null,
    emailDraft,
    portalGuide,
    jobGermanLevel: jobGermanLevel || null,
    suggestedLanguage,
  }

  return NextResponse.json({ kit })
}
