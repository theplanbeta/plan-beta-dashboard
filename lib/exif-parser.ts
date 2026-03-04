/**
 * Client-side EXIF metadata extraction from photos
 * Uses exifr for lightweight parsing of GPS + date data
 */

import exifr from "exifr"

export interface PhotoMetadata {
  latitude?: number
  longitude?: number
  takenAt?: Date
  orientation?: number
}

/**
 * Extract GPS coordinates, date taken, and orientation from a photo file
 * Runs client-side before upload for instant preview
 */
export async function extractPhotoMetadata(file: File): Promise<PhotoMetadata> {
  try {
    const data = await exifr.parse(file, {
      gps: true,
      pick: ["DateTimeOriginal", "CreateDate", "Orientation", "GPSLatitude", "GPSLongitude"],
    })

    if (!data) return {}

    const result: PhotoMetadata = {}

    // GPS coordinates
    if (data.latitude !== undefined && data.longitude !== undefined) {
      result.latitude = data.latitude
      result.longitude = data.longitude
    }

    // Date taken
    if (data.DateTimeOriginal) {
      result.takenAt = new Date(data.DateTimeOriginal)
    } else if (data.CreateDate) {
      result.takenAt = new Date(data.CreateDate)
    }

    // Orientation
    if (data.Orientation) {
      result.orientation = data.Orientation
    }

    return result
  } catch (error) {
    console.warn("[EXIF Parser] Failed to extract metadata:", error)
    return {}
  }
}

/**
 * Check if a photo was taken recently (within maxDays)
 * Used to warn about stale job postings
 */
export function isPhotoRecent(takenAt: Date | undefined, maxDays: number = 30): boolean {
  if (!takenAt) return true // If no date, assume recent
  const daysDiff = (Date.now() - takenAt.getTime()) / (1000 * 60 * 60 * 24)
  return daysDiff <= maxDays
}
