// lib/pdf-validation.ts
import { PDFDocument } from "pdf-lib"

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const MAX_PAGES = 20
const MALWARE_MARKERS = ["/JavaScript", "/Launch", "/EmbeddedFile", "/XFA"]

export interface ValidationFailure {
  code: "size" | "mime" | "malware" | "pages" | "corrupt"
  message: string
}

export interface ValidationSuccess {
  pageCount: number
  size: number
}

export type ValidationResult =
  | { ok: true; value: ValidationSuccess }
  | { ok: false; error: ValidationFailure }

export async function validatePdf(
  buffer: Buffer,
  mimeType: string
): Promise<ValidationResult> {
  if (mimeType !== "application/pdf") {
    return { ok: false, error: { code: "mime", message: "PDF only. Export from Word/Pages if needed." } }
  }

  if (buffer.byteLength > MAX_SIZE_BYTES) {
    return { ok: false, error: { code: "size", message: "PDF must be under 10 MB." } }
  }

  // Raw-byte scan on first 64 KB — cheap pre-check for hostile PDFs
  const head = buffer.subarray(0, 64 * 1024).toString("latin1")
  for (const marker of MALWARE_MARKERS) {
    if (head.includes(marker)) {
      return {
        ok: false,
        error: {
          code: "malware",
          message: "This PDF contains features we can't process (embedded scripts or forms). Re-export as a flat PDF.",
        },
      }
    }
  }

  let pageCount: number
  try {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true })
    pageCount = doc.getPageCount()
  } catch {
    return {
      ok: false,
      error: { code: "corrupt", message: "This PDF looks invalid. Re-save or export from your CV tool." },
    }
  }

  if (pageCount > MAX_PAGES) {
    return {
      ok: false,
      error: {
        code: "pages",
        message: "This PDF has too many pages. Trim to the most relevant or upload a shorter version.",
      },
    }
  }

  return { ok: true, value: { pageCount, size: buffer.byteLength } }
}
