"use client"

import { useState, useRef, useCallback } from "react"
import { extractPhotoMetadata, isPhotoRecent } from "@/lib/exif-parser"
import { getVisitorId } from "@/lib/tracking"
import Image from "next/image"

interface ExtractedJob {
  title?: string | null
  company?: string | null
  location?: string | null
  description?: string | null
  contactInfo?: string | null
  germanLevel?: string | null
  jobType?: string | null
  salaryInfo?: string | null
}

type UploadStep = "select" | "preview" | "uploading" | "result" | "error"

export default function SpotAJobPage() {
  const [step, setStep] = useState<UploadStep>("select")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<{
    latitude?: number
    longitude?: number
    takenAt?: Date
    cityPreview?: string
  }>({})
  const [extractedJob, setExtractedJob] = useState<ExtractedJob | null>(null)
  const [error, setError] = useState("")
  const [submissionCount, setSubmissionCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be under 5MB")
      return
    }

    setSelectedFile(file)
    setError("")

    // Create preview
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    // Extract EXIF metadata
    try {
      const exif = await extractPhotoMetadata(file)
      const meta: typeof metadata = {}

      if (exif.latitude && exif.longitude) {
        meta.latitude = exif.latitude
        meta.longitude = exif.longitude
      }

      if (exif.takenAt) {
        meta.takenAt = exif.takenAt
        if (!isPhotoRecent(exif.takenAt, 60)) {
          setError("This photo appears to be over 60 days old. The job posting may no longer be active.")
        }
      }

      setMetadata(meta)
    } catch {
      // EXIF extraction failed — continue without metadata
    }

    setStep("preview")
  }, [])

  const handleUpload = async () => {
    if (!selectedFile) return

    setStep("uploading")
    setError("")

    try {
      const formData = new FormData()
      formData.append("photo", selectedFile)

      if (metadata.latitude && metadata.longitude) {
        formData.append("latitude", String(metadata.latitude))
        formData.append("longitude", String(metadata.longitude))
      }

      if (metadata.takenAt) {
        formData.append("photoTakenAt", metadata.takenAt.toISOString())
      }

      const visitorId = getVisitorId()
      if (visitorId) {
        formData.append("submittedBy", visitorId)
      }

      const res = await fetch("/api/jobs/community", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Upload failed")
      }

      const job = await res.json()
      setExtractedJob(job)
      setSubmissionCount((c) => c + 1)
      setStep("result")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.")
      setStep("error")
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setMetadata({})
    setExtractedJob(null)
    setError("")
    setStep("select")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            SpotAJob
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Found a job posting in Germany? Snap a photo and share it with the community.
          </p>
          {submissionCount > 0 && (
            <p className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
              You&apos;ve shared {submissionCount} job{submissionCount > 1 ? "s" : ""} today!
            </p>
          )}
        </div>

        {/* Step: Select Photo */}
        {step === "select" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
                Take a photo or choose from gallery
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                JPEG, PNG, WebP, or HEIC (max 5MB)
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* How it works */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">How it works</h3>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>Take a photo of a job posting you see in Germany</span>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Our AI automatically extracts the job details</span>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>After moderation, it appears on our job board for everyone</span>
                </div>
              </div>
            </div>

            {/* Guidelines */}
            <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
              <p>By uploading, you agree that the photo is of a public job posting and does not contain private information.</p>
              <p>GPS location data from the photo helps others find the job. No personal data is stored.</p>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && previewUrl && (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <Image
                src={previewUrl}
                alt="Job posting photo"
                width={600}
                height={400}
                className="w-full h-auto max-h-[400px] object-contain bg-gray-100 dark:bg-gray-900"
              />
            </div>

            {/* EXIF metadata */}
            {(metadata.latitude || metadata.takenAt) && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm space-y-1">
                {metadata.latitude && metadata.longitude && (
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Location:</span>{" "}
                    {metadata.latitude.toFixed(4)}, {metadata.longitude.toFixed(4)}
                  </p>
                )}
                {metadata.takenAt && (
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Photo taken:</span>{" "}
                    {metadata.takenAt.toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-400">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Choose Different Photo
              </button>
              <button
                onClick={handleUpload}
                className="flex-1 py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload &amp; Extract
              </button>
            </div>
          </div>
        )}

        {/* Step: Uploading */}
        {step === "uploading" && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-gray-700 dark:text-gray-300 font-medium">
              Processing your photo...
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              AI is extracting job details. This may take a few seconds.
            </p>
          </div>
        )}

        {/* Step: Result */}
        {step === "result" && extractedJob && (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
              <p className="text-green-700 dark:text-green-400 font-medium">
                Photo uploaded successfully!
              </p>
              <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                It will appear on the job board after moderation.
              </p>
            </div>

            {/* Extracted details */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                AI-Extracted Details
              </h3>
              <dl className="space-y-2 text-sm">
                {extractedJob.title && (
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Title</dt>
                    <dd className="text-gray-900 dark:text-white font-medium">{extractedJob.title}</dd>
                  </div>
                )}
                {extractedJob.company && (
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Company</dt>
                    <dd className="text-gray-900 dark:text-white">{extractedJob.company}</dd>
                  </div>
                )}
                {extractedJob.location && (
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Location</dt>
                    <dd className="text-gray-900 dark:text-white">{extractedJob.location}</dd>
                  </div>
                )}
                {extractedJob.jobType && (
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Type</dt>
                    <dd className="text-gray-900 dark:text-white">{extractedJob.jobType}</dd>
                  </div>
                )}
                {extractedJob.germanLevel && (
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">German Level</dt>
                    <dd className="text-gray-900 dark:text-white">{extractedJob.germanLevel}</dd>
                  </div>
                )}
                {extractedJob.salaryInfo && (
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Salary</dt>
                    <dd className="text-gray-900 dark:text-white">{extractedJob.salaryInfo}</dd>
                  </div>
                )}
                {!extractedJob.title && !extractedJob.company && (
                  <p className="text-gray-500 dark:text-gray-400 italic">
                    AI couldn&apos;t extract details — our team will review manually.
                  </p>
                )}
              </dl>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Submit Another Job
            </button>
          </div>
        )}

        {/* Step: Error */}
        {step === "error" && (
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
              <p className="text-red-700 dark:text-red-400 font-medium">Upload Failed</p>
              <p className="text-sm text-red-600 dark:text-red-500 mt-1">{error}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Start Over
              </button>
              <button
                onClick={handleUpload}
                className="flex-1 py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
