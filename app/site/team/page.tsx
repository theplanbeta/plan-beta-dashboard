import Image from "next/image"
import { FOUNDER, TEACHERS, formatLevels, dailyShuffle } from "@/lib/team-data"
import { marketingWhatsAppUrl } from "@/lib/marketing-constants"

// Deterministic colour for the initials avatar so a given teacher always gets
// the same shade across renders. Keeps the grid visually varied without
// implying any ranking.
const INITIALS_PALETTE = [
  "from-rose-500/30 to-rose-700/20",
  "from-amber-500/30 to-amber-700/20",
  "from-emerald-500/30 to-emerald-700/20",
  "from-sky-500/30 to-sky-700/20",
  "from-violet-500/30 to-violet-700/20",
  "from-fuchsia-500/30 to-fuchsia-700/20",
]

function paletteFor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return INITIALS_PALETTE[hash % INITIALS_PALETTE.length]
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0][0]!.toUpperCase()
  return (parts[0][0]! + parts[parts.length - 1][0]!).toUpperCase()
}

function PortraitOrInitials({
  name,
  photo,
  sizes,
  priority = false,
  objectPosition = "center",
}: {
  name: string
  photo?: string
  sizes: string
  priority?: boolean
  objectPosition?: string
}) {
  if (photo) {
    return (
      <Image
        src={photo}
        alt={`${name}, German teacher at Plan Beta`}
        fill
        sizes={sizes}
        className="object-cover"
        style={{ objectPosition }}
        priority={priority}
      />
    )
  }
  return (
    <div
      role="img"
      aria-label={`${name} (photo coming soon)`}
      className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${paletteFor(name)}`}
    >
      <span className="text-5xl sm:text-6xl font-semibold text-white/80 tracking-wider">
        {initialsOf(name)}
      </span>
    </div>
  )
}

const TEAM_WA_URL = marketingWhatsAppUrl(
  "Hi Plan Beta! I'd like to learn from your team. Can you tell me about the next batch?"
)

export default function TeamPage() {
  // Public team page only shows teachers with a photo on file. Anyone in the
  // TEACHERS array without a `photo` field stays in the data (still visible
  // to admins) but is hidden here until their photo lands.
  const visibleTeachers = TEACHERS.filter((t) => Boolean(t.photo))
  const orderedTeachers = dailyShuffle(visibleTeachers)

  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      {/* Page header */}
      <section className="pt-32 pb-12 border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-primary/80 font-semibold mb-4">
            The team
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6">
            The teachers behind Plan Beta
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Every Plan Beta teacher holds at least a B2 in German and teaches
            live online batches from A1 through B2. No outsourced tutors, no
            recorded-video shortcuts.
          </p>
        </div>
      </section>

      {/* Founder spotlight */}
      <section className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-5 gap-8 md:gap-12 items-center">
            {/* Portrait */}
            <div className="md:col-span-2">
              <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.04]">
                <PortraitOrInitials
                  name={FOUNDER.name}
                  photo={FOUNDER.photo}
                  sizes="(min-width: 768px) 40vw, 100vw"
                  priority
                />
              </div>
            </div>
            {/* Bio */}
            <div className="md:col-span-3">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-medium mb-3">
                The person behind Plan Beta
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                {FOUNDER.name}
              </h2>
              <p className="inline-block text-sm font-semibold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-6">
                {FOUNDER.role}
              </p>
              <p className="text-gray-300 leading-relaxed mb-6">{FOUNDER.bio}</p>
              <p className="text-sm text-gray-500 mb-6">
                {formatLevels(FOUNDER.levels)} · Based in{" "}
                {FOUNDER.city ? `${FOUNDER.city}, ${FOUNDER.location}` : FOUNDER.location}
              </p>
              <a
                href={FOUNDER.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-full hover:bg-green-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Talk to {FOUNDER.name.split(" ")[0]}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Team grid */}
      <section className="py-16 sm:py-20 bg-[#0c0c0c] border-y border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-medium mb-3">
              Meet the team
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              The teachers you'll learn from
            </h2>
          </div>

          {orderedTeachers.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-12">
              Team profiles are being prepared. Check back soon.
            </p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {orderedTeachers.map((teacher) => (
                <article
                  key={teacher.name}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/[0.12] hover:bg-white/[0.05] transition-colors"
                >
                  <div className="relative aspect-square bg-white/[0.04]">
                    <PortraitOrInitials
                      name={teacher.name}
                      photo={teacher.photo}
                      objectPosition={teacher.objectPosition}
                      sizes="(min-width: 1024px) 22vw, 50vw"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {teacher.name}
                    </h3>
                    <p className="text-xs text-primary font-medium mb-2">
                      {formatLevels(teacher.levels)}
                    </p>
                    <p className="text-sm text-gray-400">
                      Based in{" "}
                      {teacher.city ? `${teacher.city}, ${teacher.location}` : teacher.location}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            One standard across the team
          </h2>
          <p className="text-gray-400 leading-relaxed mb-8">
            Every Plan Beta teacher clears a minimum B2 in German, and Aparna
            audits their classes herself. You&apos;re not gambling on who walks
            in. You&apos;re joining a team that holds itself to the same bar
            your exam will.
          </p>
          <a
            href={TEAM_WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white text-sm font-semibold rounded-full hover:bg-primary-dark transition-colors"
          >
            Talk to us about the next batch
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </section>
    </div>
  )
}
