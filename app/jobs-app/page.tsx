import Link from "next/link"
import { cookies } from "next/headers"
import {
  Briefcase,
  UserCircle,
  ArrowRight,
  PenLine,
  ScrollText,
  FileCheck2,
} from "lucide-react"
import { verifyJobsAppToken } from "@/lib/jobs-app-auth"

const stageStats = [
  { label: "Saved", count: 0, tone: "ink-faded" },
  { label: "Sent", count: 0, tone: "ink" },
  { label: "Interview", count: 0, tone: "ink-teal" },
  { label: "Offers", count: 0, tone: "ink-green" },
]

function buildQuickActions(isAuthed: boolean) {
  return [
    {
      title: "Browse Jobs",
      subtitle: "Hand-picked roles, updated daily",
      href: isAuthed ? "/jobs-app/jobs" : "/jobs-app/auth?mode=register",
      icon: Briefcase,
      tab: "№ 01 · STELLENBÖRSE",
    },
    {
      title: isAuthed ? "Your Profile" : "Open your dossier",
      subtitle: isAuthed
        ? "The core of every application folder"
        : "Sign up to start your career folder",
      href: isAuthed ? "/jobs-app/onboarding" : "/jobs-app/auth?mode=register",
      icon: UserCircle,
      tab: "№ 02 · PROFIL",
    },
  ]
}

const howItWorks = [
  {
    step: "I.",
    title: "Register",
    body: "Tell us about your experience, skills, and German level.",
    icon: PenLine,
  },
  {
    step: "II.",
    title: "Match",
    body: "Our AI scores every job against your profile out of 100.",
    icon: ScrollText,
  },
  {
    step: "III.",
    title: "Apply",
    body: "Generate a tailored CV and cover letter for each application.",
    icon: FileCheck2,
  },
]

export default async function JobsAppHomePage() {
  const token = (await cookies()).get("pb-jobs-app")?.value
  const isAuthed = token ? Boolean(await verifyJobsAppToken(token)) : false
  const quickActions = buildQuickActions(isAuthed)

  return (
    <div className="space-y-7">
      {/* ── Masthead ─────────────────────────────────────────── */}
      <header className="amtlich-enter">
        <span className="amtlich-label">
          <span className="amtlich-rivet" /> № 00 · Day Zero
        </span>

        <h1 className="mt-3 display">
          Day Zero with us,<br />Day One at work.
        </h1>

        <p
          className="mt-3 ink-soft"
          style={{
            fontFamily: "var(--f-body)",
            fontSize: "1rem",
            lineHeight: 1.5,
            maxWidth: "36ch",
          }}
        >
          {isAuthed
            ? "The career companion for professionals on their way to Germany. Every CV, every cover letter, every interview — neatly filed in one folder."
            : "Find German jobs that match your CV. Made for Indians preparing to move to Germany. Free to start."}
        </p>

        <hr className="amtlich-divider mt-5" />
      </header>

      {/* ── Stage Overview (authed) / Social Proof (anon) ─────── */}
      {isAuthed ? (
        <section className="amtlich-card amtlich-enter amtlich-enter-delay-1">
          <div className="flex items-center justify-between">
            <span className="mono">Overview</span>
            <span className="amtlich-stamp amtlich-stamp--ink">Entwurf</span>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {stageStats.map((stage) => (
              <div key={stage.label} className="text-center">
                <div
                  className={`display ${stage.tone}`}
                  style={{
                    fontSize: "1.9rem",
                    fontVariationSettings: '"opsz" 144, "SOFT" 20, "wght" 500',
                    lineHeight: 1,
                  }}
                >
                  {String(stage.count).padStart(2, "0")}
                </div>
                <div
                  className="mono mt-1.5"
                  style={{ fontSize: "var(--fs-mono-xs)" }}
                >
                  {stage.label}
                </div>
              </div>
            ))}
          </div>

          <hr className="amtlich-divider" />

          <p
            className="ink-faded"
            style={{ fontFamily: "var(--f-body)", fontSize: "0.88rem" }}
          >
            Create a profile to start tracking applications.
          </p>
        </section>
      ) : (
        <section className="amtlich-card amtlich-enter amtlich-enter-delay-1">
          <div className="flex items-center justify-between">
            <span className="mono">Live right now</span>
            <span className="amtlich-stamp amtlich-stamp--green">Active</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <div
                className="display ink"
                style={{ fontSize: "1.7rem", fontVariationSettings: '"opsz" 144, "SOFT" 20, "wght" 550', lineHeight: 1 }}
              >
                2,400+
              </div>
              <div className="mono mt-1.5" style={{ fontSize: "var(--fs-mono-xs)" }}>jobs live</div>
            </div>
            <div>
              <div
                className="display ink"
                style={{ fontSize: "1.7rem", fontVariationSettings: '"opsz" 144, "SOFT" 20, "wght" 550', lineHeight: 1 }}
              >
                180+
              </div>
              <div className="mono mt-1.5" style={{ fontSize: "var(--fs-mono-xs)" }}>employers</div>
            </div>
            <div>
              <div
                className="display ink"
                style={{ fontSize: "1.7rem", fontVariationSettings: '"opsz" 144, "SOFT" 20, "wght" 550', lineHeight: 1 }}
              >
                17
              </div>
              <div className="mono mt-1.5" style={{ fontSize: "var(--fs-mono-xs)" }}>nurses placed</div>
            </div>
          </div>
          <hr className="amtlich-divider" />
          <p
            className="ink-faded text-center"
            style={{ fontFamily: "var(--f-body)", fontSize: "0.85rem" }}
          >
            Upload your CV · Auto-matched to live jobs · Tailored CVs per role.
          </p>
        </section>
      )}

      {/* ── Quick Actions — manila folders ───────────────────── */}
      <section className="space-y-6">
        {quickActions.map(({ title, subtitle, href, icon: Icon, tab }, i) => (
          <Link
            key={title}
            href={href}
            className={`amtlich-folder block amtlich-enter amtlich-enter-delay-${i + 2}`}
            data-tab={tab}
            style={{ textDecoration: "none" }}
          >
            <div className="flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm border"
                style={{
                  borderColor: "var(--manila-edge)",
                  backgroundImage:
                    "linear-gradient(180deg, #F5E4A6 0%, #D4AA40 100%)",
                  boxShadow:
                    "0 1px 0 rgba(255, 245, 200, 0.65) inset, 0 -1px 1px rgba(100, 70, 20, 0.22) inset, 0 2px 4px rgba(60, 40, 20, 0.18)",
                }}
              >
                <Icon size={24} strokeWidth={1.6} className="ink" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="display ink" style={{ fontSize: "1.2rem" }}>
                  {title}
                </h3>
                <p
                  className="mt-1 ink-soft"
                  style={{
                    fontFamily: "var(--f-body)",
                    fontSize: "0.9rem",
                    lineHeight: 1.4,
                  }}
                >
                  {subtitle}
                </p>
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="mono ink">Open folder</span>
                  <ArrowRight size={12} strokeWidth={2.2} className="ink" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* ── How it works — three stamped instructions ────────── */}
      <section className="amtlich-card amtlich-enter amtlich-enter-delay-4">
        <div className="flex items-center justify-between">
          <span className="mono">How it works</span>
          <span className="amtlich-stamp amtlich-stamp--teal">Offiziell</span>
        </div>

        <div className="mt-4 space-y-3.5">
          {howItWorks.map(({ step, title, body, icon: Icon }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="flex items-center gap-2 pt-1">
                <span
                  className="display ink-faded"
                  style={{
                    fontSize: "1.1rem",
                    fontVariationSettings:
                      '"opsz" 36, "SOFT" 50, "wght" 500',
                    fontStyle: "italic",
                    minWidth: "22px",
                  }}
                >
                  {step}
                </span>
                <Icon size={16} strokeWidth={1.6} className="ink-soft" />
              </div>
              <div className="flex-1">
                <h4 className="display ink" style={{ fontSize: "1rem" }}>
                  {title}
                </h4>
                <p
                  className="ink-faded mt-0.5"
                  style={{
                    fontFamily: "var(--f-body)",
                    fontSize: "0.84rem",
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
        <span className="mono ink-faded" style={{ fontSize: "var(--fs-mono-xs)" }}>
          dayzero.xyz · by plan beta
        </span>
        <span className="amtlich-rivet" />
      </footer>
    </div>
  )
}
