# Day Zero Generated Documents Contract

**Date:** 2026-04-30
**Status:** Implemented

Day Zero stores generated CVs and generated Anschreibens in the shared `GeneratedCV` Prisma model.

## Discriminator

- CV rows: `templateUsed` is `null` or any value other than `"anschreiben"`; current generated CV rows use `"ats-standard"`.
- Anschreiben rows: `templateUsed = "anschreiben"`.

This discriminator is part of the application contract. Any query that needs a CV must explicitly exclude `"anschreiben"` while preserving legacy `null` rows. Any query that needs an Anschreiben must explicitly require `"anschreiben"`.

## Download Access

Generated document blob URLs may be private and should not be opened directly from the UI.

All client download links should use:

```text
/api/jobs-app/cv/{generatedDocumentId}/download
```

The download route verifies the authenticated `JobSeeker` owns the `GeneratedCV` row before streaming the blob. Despite the route name, it serves both CV and Anschreiben rows.

## Application Kit

The application kit returns documents separately:

```json
{
  "cv": {
    "id": "generated-cv-id",
    "fileUrl": "blob-url",
    "language": "de",
    "createdAt": "..."
  },
  "anschreiben": {
    "id": "generated-anschreiben-id",
    "fileUrl": "blob-url",
    "language": "de",
    "createdAt": "..."
  }
}
```

The UI should use `id` for downloads and keep `fileUrl` as server metadata only.

## Implementation Touchpoints

- `app/api/jobs-app/applications/[id]/kit/route.ts` queries latest CV and latest Anschreiben separately.
- `app/api/jobs-app/cv/route.ts` excludes Anschreiben rows from the CV archive.
- `app/api/jobs-app/cv/[id]/download/route.ts` streams any owned generated document.
- `app/api/jobs-app/anschreiben/generate/route.ts` returns the generated row id.
- `components/jobs-app/ApplicationKitModal.tsx` downloads both documents through the authenticated proxy.
