export default function JobsAppLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <header className="amtlich-enter">
        <span className="amtlich-label">
          <span className="amtlich-rivet" /> Loading dossier…
        </span>
        <div
          className="mt-3"
          style={{
            height: "2rem",
            width: "70%",
            background:
              "linear-gradient(90deg, rgba(140,102,24,0.12) 0%, rgba(140,102,24,0.22) 50%, rgba(140,102,24,0.12) 100%)",
            backgroundSize: "200% 100%",
            animation: "pb-shimmer 1.6s linear infinite",
            borderRadius: "3px",
          }}
        />
      </header>

      <section className="amtlich-card amtlich-enter amtlich-enter-delay-1 space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: "1rem",
              width: `${90 - i * 8}%`,
              background:
                "linear-gradient(90deg, rgba(140,102,24,0.10) 0%, rgba(140,102,24,0.20) 50%, rgba(140,102,24,0.10) 100%)",
              backgroundSize: "200% 100%",
              animation: "pb-shimmer 1.6s linear infinite",
              borderRadius: "2px",
            }}
          />
        ))}
      </section>

      <style>
        {`
          @keyframes pb-shimmer {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          @media (prefers-reduced-motion: reduce) {
            div[aria-busy="true"] * {
              animation: none !important;
            }
          }
        `}
      </style>
    </div>
  )
}
