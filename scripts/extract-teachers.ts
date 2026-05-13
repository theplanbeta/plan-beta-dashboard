/**
 * One-shot extractor: prints a ready-to-paste TS array of active teachers
 * for `lib/team-data.ts`. Skips Aparna (the founder; she's separate on the
 * page).
 *
 * Usage:
 *   npx tsx scripts/extract-teachers.ts > .team-raw.txt
 *
 * The output is pure TS — you can paste it directly into the TEACHERS array.
 * Each block carries the teacher's email as a `// email: ...` comment so you
 * can identify who's who when curating the list (the email is NOT rendered
 * on the public page; only name/photo/levels/bio are).
 */
import { prisma } from "@/lib/prisma"

function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function main() {
  const teachers = await prisma.user.findMany({
    where: {
      role: "TEACHER",
      active: true,
      NOT: { name: { contains: "Aparna", mode: "insensitive" } },
    },
    select: {
      name: true,
      email: true,
      teacherLevels: true,
      bio: true,
      qualifications: true,
      experience: true,
    },
    orderBy: { name: "asc" },
  })

  if (teachers.length === 0) {
    console.error("// No active teachers found (excluding Aparna).")
    process.exit(0)
  }

  console.log(`// Generated from User table on ${new Date().toISOString().slice(0, 10)}.`)
  console.log(`// ${teachers.length} active teachers (Aparna excluded — she's the FOUNDER constant).`)
  console.log("// Review each entry: fix the photo filename, write a 1-line bio,")
  console.log("// delete anyone who shouldn't appear on the public site.")
  console.log("")
  console.log("export const TEACHERS: Teacher[] = [")

  for (const t of teachers) {
    const slug = slugify(t.name)
    const levels =
      t.teacherLevels.length > 0
        ? t.teacherLevels.map((l) => `"${l}"`).join(", ")
        : `/* TODO: levels missing in DB — fill in */`

    // First-pass bio suggestion — pulled from User.bio if set, otherwise
    // a brief placeholder. The user is expected to edit every line.
    const bioSeed = (t.bio || "").trim()
    const bioLine = bioSeed
      ? bioSeed.replace(/\s+/g, " ").slice(0, 140)
      : "TODO: one-sentence personality line — no years, no titles."

    console.log(`  {`)
    console.log(`    // email: ${t.email}`)
    console.log(`    name: ${JSON.stringify(t.name)},`)
    console.log(`    photo: "/team/${slug}.jpg",`)
    console.log(`    levels: [${levels}],`)
    console.log(`    bio: ${JSON.stringify(bioLine)},`)
    console.log(`  },`)
  }

  console.log("]")
}

main()
  .catch((err) => {
    console.error("Extraction failed:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
