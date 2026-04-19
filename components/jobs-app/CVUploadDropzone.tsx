"use client"

import { useRef, useState } from "react"
import { Upload, FileText, Loader2 } from "lucide-react"

interface Props {
  onUploadStart?: (importId: string) => void
  onError?: (message: string) => void
  className?: string
  compact?: boolean
}

export function CVUploadDropzone({ onUploadStart, onError, className, compact }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<"idle" | "uploading" | "error">("idle")
  const [message, setMessage] = useState<string | null>(null)

  async function handleFile(file: File) {
    setState("uploading")
    setMessage(null)
    const fd = new FormData()
    fd.append("file", file)
    try {
      const res = await fetch("/api/jobs-app/profile/cv-upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      })
      const data = await res.json().catch(() => ({ error: "Upload failed" }))
      if (!res.ok) {
        setState("error")
        setMessage(data.error ?? `Upload failed (${res.status})`)
        onError?.(data.error ?? "Upload failed")
        return
      }
      onUploadStart?.(data.importId)
      setState("idle")
    } catch (e) {
      setState("error")
      setMessage((e as Error).message)
      onError?.((e as Error).message)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  return (
    <div
      className={className}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      style={{
        border: "2px dashed rgba(0,0,0,.25)",
        borderRadius: 6,
        padding: compact ? 16 : 40,
        textAlign: "center",
        background: state === "error" ? "#fff5f5" : "#fffef5",
        cursor: state === "uploading" ? "wait" : "pointer",
      }}
      onClick={() => state === "idle" && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        style={{ display: "none" }}
        onChange={onChange}
      />
      {state === "uploading" ? (
        <>
          <Loader2 className="mx-auto animate-spin" size={28} />
          <p className="mt-2">Uploading…</p>
        </>
      ) : (
        <>
          {state === "error" ? <FileText size={28} className="mx-auto" /> : <Upload size={28} className="mx-auto" />}
          <p className="mt-2">{state === "error" ? message : "Drop your CV (PDF) here or click to browse"}</p>
          <p className="text-sm opacity-60 mt-1">PDF only · up to 10 MB · up to 20 pages</p>
        </>
      )}
    </div>
  )
}
