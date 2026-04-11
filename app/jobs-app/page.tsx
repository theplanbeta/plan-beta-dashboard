import Link from "next/link"
import {
  Briefcase,
  UserCircle,
  ArrowRight,
  PenLine,
  ScrollText,
  FileCheck2,
} from "lucide-react"

const stageStats = [
  { label: "Im Umschlag", count: 0, tone: "ink-faded" },
  { label: "Abgeschickt", count: 0, tone: "ink" },
  { label: "Gespräch", count: 0, tone: "ink-blue" },
  { label: "Angebot", count: 0, tone: "ink-green" },
]

const quickActions = [
  {
    title: "Stellenbörse",
    subtitle: "Hand-kuratierte Stellen, täglich aktualisiert",
    href: "/jobs-app/jobs",
    icon: Briefcase,
    tab: "№ 01",
  },
  {
    title: "Mein Profil",
    subtitle: "Das Herzstück jeder Bewerbungsmappe",
    href: "/jobs-app/onboarding",
    icon: UserCircle,
    tab: "№ 02",
  },
]

const howItWorks = [
  {
    step: "I.",
    title: "Eintragen",
    body: "Ihre Qualifikationen, Erfahrung und Deutschkenntnisse werden registriert.",
    icon: PenLine,
  },
  {
    step: "II.",
    title: "Vorschlagen",
    body: "Die KI schlägt passende Stellen mit einer Bewertung von 0 bis 100 vor.",
    icon: ScrollText,
  },
  {
    step: "III.",
    title: "Bewerben",
    body: "Lebenslauf und Anschreiben werden für jede Stelle einzeln erstellt.",
    icon: FileCheck2,
  },
]

export default function JobsAppHomePage() {
  const currentDate = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="space-y-7">
      {/* ── Masthead ─────────────────────────────────────────── */}
      <header className="amtlich-enter">
        <div className="flex items-center justify-between">
          <span className="amtlich-label">
            <span className="amtlich-rivet" /> Aktenzeichen PB-2026
          </span>
          <span className="mono ink-faded" style={{ fontSize: "0.62rem" }}>
            {currentDate}
          </span>
        </div>

        <h1 className="mt-3 display">
          Die Bewerbungs&shy;mappe
        </h1>

        <p
          className="mt-2 ink-faded"
          style={{
            fontFamily: "var(--f-body)",
            fontStyle: "italic",
            fontSize: "0.95rem",
            lineHeight: 1.45,
          }}
        >
          Your personal application folder for the German job market. Every CV, every
          cover letter, every interview — officially recorded, neatly filed.
        </p>

        <hr className="amtlich-divider mt-4" />
      </header>

      {/* ── Stage Overview — looks like a stamped ledger row ── */}
      <section className="amtlich-card amtlich-enter amtlich-enter-delay-1">
        <div className="flex items-center justify-between">
          <span className="mono">Übersicht</span>
          <span className="amtlich-stamp amtlich-stamp--ink">Entwurf</span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {stageStats.map((stage) => (
            <div key={stage.label} className="text-center">
              <div
                className={`display ${stage.tone}`}
                style={{
                  fontSize: "1.75rem",
                  fontVariationSettings: '"opsz" 144, "SOFT" 20, "wght" 450',
                  lineHeight: 1,
                }}
              >
                {String(stage.count).padStart(2, "0")}
              </div>
              <div className="mono mt-1" style={{ fontSize: "0.58rem" }}>
                {stage.label}
              </div>
            </div>
          ))}
        </div>

        <hr className="amtlich-divider" />

        <p
          className="ink-faded"
          style={{
            fontFamily: "var(--f-body)",
            fontSize: "0.82rem",
            fontStyle: "italic",
          }}
        >
          Register a profile to begin tracking applications.
        </p>
      </section>

      {/* ── Quick Actions — two manila folders ───────────────── */}
      <section className="space-y-5">
        {quickActions.map(({ title, subtitle, href, icon: Icon, tab }, i) => (
          <Link
            key={title}
            href={href}
            className={`amtlich-folder block amtlich-enter amtlich-enter-delay-${i + 2}`}
            data-tab={tab}
          >
            <div className="flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm border"
                style={{
                  borderColor: "var(--manila-edge)",
                  backgroundImage:
                    "linear-gradient(180deg, #F5E4A6 0%, #DEBE6F 100%)",
                  boxShadow:
                    "0 1px 0 rgba(255, 245, 200, 0.6) inset, 0 -1px 1px rgba(100, 70, 20, 0.2) inset, 0 2px 4px rgba(60, 40, 20, 0.15)",
                }}
              >
                <Icon size={24} strokeWidth={1.6} className="ink" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="display ink" style={{ fontSize: "1.15rem" }}>
                  {title}
                </h3>
                <p
                  className="mt-1 ink-soft"
                  style={{
                    fontFamily: "var(--f-body)",
                    fontSize: "0.85rem",
                    lineHeight: 1.4,
                  }}
                >
                  {subtitle}
                </p>
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="mono ink">Öffnen</span>
                  <ArrowRight size={12} className="ink" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* ── How it works — three stamped instructions ────────── */}
      <section className="amtlich-card amtlich-enter amtlich-enter-delay-4">
        <div className="flex items-center justify-between">
          <span className="mono">Verfahren</span>
          <span className="amtlich-stamp amtlich-stamp--blue">Offiziell</span>
        </div>

        <div className="mt-4 space-y-3">
          {howItWorks.map(({ step, title, body, icon: Icon }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="flex items-center gap-2 pt-0.5">
                <span
                  className="display ink-faded"
                  style={{
                    fontSize: "1.05rem",
                    fontVariationSettings: '"opsz" 36, "SOFT" 60, "wght" 500',
                    fontStyle: "italic",
                  }}
                >
                  {step}
                </span>
                <Icon size={16} strokeWidth={1.5} className="ink-soft" />
              </div>
              <div className="flex-1">
                <h4 className="display ink" style={{ fontSize: "0.95rem" }}>
                  {title}
                </h4>
                <p
                  className="ink-faded"
                  style={{
                    fontFamily: "var(--f-body)",
                    fontSize: "0.78rem",
                    lineHeight: 1.45,
                  }}
                >
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer seal ─────────────────────────────────────────── */}
      <footer
        className="amtlich-enter amtlich-enter-delay-4 flex items-center justify-between pt-2"
        style={{ paddingBottom: "1rem" }}
      >
        <span className="mono ink-faded" style={{ fontSize: "0.6rem" }}>
          planbeta.app · bewerbungsmappe
        </span>
        <span className="amtlich-rivet" />
      </footer>
    </div>
  )
}
