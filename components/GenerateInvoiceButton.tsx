"use client"

import { useState } from "react"
import { downloadInvoice, previewInvoice, generateInvoiceJPG, type InvoiceData } from "@/lib/invoice-generator"

interface GenerateInvoiceButtonProps {
  studentId: string
  paymentId?: string
  variant?: "primary" | "secondary" | "outline"
  showPreview?: boolean
  children?: React.ReactNode
}

export function GenerateInvoiceButton({
  studentId,
  paymentId,
  variant = "primary",
  showPreview = true,
  children,
}: GenerateInvoiceButtonProps) {
  const [loading, setLoading] = useState(false)
  const [loadingJPG, setLoadingJPG] = useState(false)
  const [error, setError] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleGenerate = async () => {
    try {
      setLoading(true)
      setError("")

      // Fetch invoice data from API
      const res = await fetch("/api/invoices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, paymentId }),
      })

      if (!res.ok) {
        throw new Error("Failed to generate invoice")
      }

      const { invoiceData } = await res.json()

      // Generate and download PDF (now async)
      await downloadInvoice(invoiceData as InvoiceData)
    } catch (err: any) {
      setError(err.message || "Failed to generate invoice")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateJPG = async () => {
    try {
      setLoadingJPG(true)
      setError("")

      // Fetch invoice data from API
      const res = await fetch("/api/invoices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, paymentId }),
      })

      if (!res.ok) {
        throw new Error("Failed to generate invoice")
      }

      const { invoiceData } = await res.json()

      // Generate and download JPG
      await generateInvoiceJPG(invoiceData as InvoiceData)
    } catch (err: any) {
      setError(err.message || "Failed to generate JPG invoice")
      console.error(err)
    } finally {
      setLoadingJPG(false)
    }
  }

  const handlePreview = async () => {
    try {
      setLoading(true)
      setError("")

      // Fetch invoice data
      const res = await fetch("/api/invoices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, paymentId }),
      })

      if (!res.ok) {
        throw new Error("Failed to generate invoice")
      }

      const { invoiceData } = await res.json()

      // Generate preview (now async)
      const dataUrl = await previewInvoice(invoiceData as InvoiceData)
      setPreviewUrl(dataUrl)
    } catch (err: any) {
      setError(err.message || "Failed to preview invoice")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const variantClasses = {
    primary:
      "bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed",
    secondary:
      "bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed",
    outline:
      "border-2 border-primary text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed",
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={loading || loadingJPG}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${variantClasses[variant]}`}
        >
          {loading ? "Generating..." : children || "PDF"}
        </button>

        <button
          onClick={handleGenerateJPG}
          disabled={loading || loadingJPG}
          className="px-4 py-2 rounded-md font-medium bg-success text-white hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingJPG ? "Generating..." : "JPG"}
        </button>

        {showPreview && (
          <button
            onClick={handlePreview}
            disabled={loading || loadingJPG}
            className="px-4 py-2 rounded-md font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Preview
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-error mt-2">{error}</p>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Invoice Preview</h3>
              <button
                onClick={() => setPreviewUrl(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <iframe
                src={previewUrl}
                className="w-full h-[600px] border rounded"
                title="Invoice Preview"
              />
            </div>
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setPreviewUrl(null)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleGenerate()
                  setPreviewUrl(null)
                }}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
