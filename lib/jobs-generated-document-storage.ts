import { del, get, put } from "@vercel/blob"
import { mkdir, readFile, unlink, writeFile } from "fs/promises"
import path from "path"

const LOCAL_PREFIX = "local-generated/"

type StoredGeneratedDocument = {
  fileKey: string
  fileUrl: string
}

type LoadedGeneratedDocument = {
  body: BodyInit
  contentType: string
  contentLength: string | null
}

function shouldUseLocalStorage() {
  return !process.env.BLOB_READ_WRITE_TOKEN && process.env.NODE_ENV !== "production"
}

function localStorageRoot() {
  return path.join(process.cwd(), ".local", "generated-documents")
}

function localPathFor(relativeKey: string) {
  const root = localStorageRoot()
  const resolved = path.resolve(root, relativeKey)
  if (!resolved.startsWith(path.resolve(root) + path.sep)) {
    throw new Error("Invalid generated document path")
  }
  return resolved
}

function localRelativeKey(fileRef: string) {
  if (fileRef.startsWith(LOCAL_PREFIX)) return fileRef.slice(LOCAL_PREFIX.length)
  if (fileRef.startsWith(`local://${LOCAL_PREFIX}`)) {
    return fileRef.slice(`local://${LOCAL_PREFIX}`.length)
  }
  return null
}

export function isLocalGeneratedDocument(fileRef: string | null | undefined) {
  return Boolean(fileRef && localRelativeKey(fileRef))
}

export async function saveGeneratedDocumentPdf(
  fileName: string,
  pdfBuffer: Buffer
): Promise<StoredGeneratedDocument> {
  if (!shouldUseLocalStorage()) {
    const blob = await put(fileName, pdfBuffer, {
      access: "private",
      contentType: "application/pdf",
    })
    return {
      fileKey: blob.pathname,
      fileUrl: blob.url,
    }
  }

  const relativeKey = fileName.replace(/^\/+/, "")
  const absolutePath = localPathFor(relativeKey)
  await mkdir(path.dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, pdfBuffer)

  const fileKey = `${LOCAL_PREFIX}${relativeKey}`
  return {
    fileKey,
    fileUrl: `local://${fileKey}`,
  }
}

export async function loadGeneratedDocument(
  fileRef: string
): Promise<LoadedGeneratedDocument | null> {
  const relativeKey = localRelativeKey(fileRef)
  if (relativeKey) {
    const body = await readFile(localPathFor(relativeKey))
    return {
      body: new Uint8Array(body),
      contentType: "application/pdf",
      contentLength: String(body.byteLength),
    }
  }

  if (/^https?:\/\//i.test(fileRef)) {
    const blobResponse = await fetch(fileRef, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN ?? ""}`,
      },
    })
    if (!blobResponse.ok || !blobResponse.body) return null
    return {
      body: blobResponse.body,
      contentType: blobResponse.headers.get("content-type") || "application/pdf",
      contentLength: blobResponse.headers.get("content-length"),
    }
  }

  const result = await get(fileRef, { access: "private" })
  if (!result || result.statusCode !== 200 || !result.stream) return null
  return {
    body: result.stream,
    contentType: result.blob.contentType || "application/pdf",
    contentLength: String(result.blob.size),
  }
}

export async function deleteGeneratedDocument(fileRef: string | null | undefined) {
  if (!fileRef) return

  const relativeKey = localRelativeKey(fileRef)
  if (relativeKey) {
    try {
      await unlink(localPathFor(relativeKey))
    } catch {
      // Non-fatal: the database row is still the source of truth.
    }
    return
  }

  await del(fileRef)
}
