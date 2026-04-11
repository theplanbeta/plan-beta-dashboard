# Phase 6 — Mentors Feature Notes

## Seed data (not in git)

8 real mentors extracted from the abandoned `dayzero.xyz` prototype at
`/Users/deepak/DZ/dayzero/apps/web/lib/api/mentors.ts`.

- **File:** `.mempalace/mentors-seed-phase6.json` (gitignored)
- **Schema:** matches the prototype's `Mentor` TypeScript interface verbatim
- **PII note:** contains real names, photos hosted on `planbeta.in`, bios, session
  counts. These mentors worked under the Plan Beta banner in Germany. Before
  committing any of this to git or using it as production seed data, confirm
  ongoing consent with each person.

## Category breakdown

- Healthcare: 4 mentors (Deepak Bos, Jithin Mathew, Jomon Kulathil Sunny, Guru Kurakula)
- Engineering: 3 mentors (Dhanya Krishnan, Tharun Suresh Kumar, Rajeevan Rajagopal)
- Education: 1 mentor (Devdath Kishore)

## When Phase 6 starts

1. Re-open `.mempalace/mentors-seed-phase6.json`
2. Reach out to each mentor, confirm consent, update photos/bios if needed
3. Add `Mentor` Prisma model matching the schema
4. Seed via `npx prisma db seed`
5. Build `/jobs-app/mentors` route + booking flow
