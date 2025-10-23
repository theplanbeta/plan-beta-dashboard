import fs from 'fs/promises'
import path from 'path'
import { createWriteStream, createReadStream } from 'fs'
import { pipeline } from 'stream/promises'
import { createGzip, createGunzip } from 'zlib'
import { Readable } from 'stream'

// Storage directory for receipts
// Use /tmp on Vercel (serverless), local storage otherwise
const isVercel = process.env.VERCEL === '1'
const RECEIPTS_DIR = isVercel
  ? path.join('/tmp', 'receipts')
  : path.join(process.cwd(), 'storage', 'receipts')

// Ensure storage directory exists
export async function ensureStorageDir() {
  try {
    await fs.mkdir(RECEIPTS_DIR, { recursive: true })
  } catch (error) {
    console.error('Error creating receipts directory:', error)
    throw error
  }
}

/**
 * Generate unique receipt number
 * Format: RCP-YYYYMMDD-XXXX
 */
export function generateReceiptNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')

  return `RCP-${year}${month}${day}-${random}`
}

/**
 * Save receipt file (PDF or JPG) with compression
 * @param buffer File buffer
 * @param receiptNumber Receipt number for filename
 * @param format 'pdf' or 'jpg'
 * @returns Object with file path and size
 */
export async function saveReceiptFile(
  buffer: Buffer,
  receiptNumber: string,
  format: 'pdf' | 'jpg'
): Promise<{ filePath: string; fileSize: number; compressedSize: number }> {
  await ensureStorageDir()

  // Create filename
  const filename = `${receiptNumber}.${format}.gz`
  const filePath = path.join(RECEIPTS_DIR, filename)

  // Get original size
  const originalSize = buffer.length

  // Compress and save
  await pipeline(
    Readable.from(buffer),
    createGzip({ level: 9 }), // Maximum compression
    createWriteStream(filePath)
  )

  // Get compressed size
  const stats = await fs.stat(filePath)
  const compressedSize = stats.size

  console.log(`Saved ${format.toUpperCase()} receipt: ${filename}`)
  console.log(`Original: ${(originalSize / 1024).toFixed(2)} KB`)
  console.log(`Compressed: ${(compressedSize / 1024).toFixed(2)} KB`)
  console.log(`Compression ratio: ${((1 - compressedSize / originalSize) * 100).toFixed(1)}%`)

  return {
    filePath: filename, // Store relative path in DB
    fileSize: originalSize,
    compressedSize
  }
}

/**
 * Read receipt file and decompress
 * @param fileName Filename from database (e.g., "RCP-20240115-0001.pdf.gz")
 * @returns Decompressed buffer
 */
export async function readReceiptFile(fileName: string): Promise<Buffer> {
  const filePath = path.join(RECEIPTS_DIR, fileName)

  // Check if file exists
  try {
    await fs.access(filePath)
  } catch (error) {
    throw new Error(`Receipt file not found: ${fileName}`)
  }

  // Read and decompress
  const chunks: Buffer[] = []

  await pipeline(
    createReadStream(filePath),
    createGunzip(),
    async function* (source) {
      for await (const chunk of source) {
        chunks.push(chunk)
      }
    }
  )

  return Buffer.concat(chunks)
}

/**
 * Delete receipt files
 * @param pdfPath PDF filename
 * @param jpgPath JPG filename
 */
export async function deleteReceiptFiles(pdfPath?: string | null, jpgPath?: string | null) {
  const filesToDelete = [pdfPath, jpgPath].filter(Boolean) as string[]

  for (const fileName of filesToDelete) {
    try {
      const filePath = path.join(RECEIPTS_DIR, fileName)
      await fs.unlink(filePath)
      console.log(`Deleted receipt file: ${fileName}`)
    } catch (error) {
      console.error(`Error deleting receipt file ${fileName}:`, error)
      // Continue with other files even if one fails
    }
  }
}

/**
 * Get storage stats for receipts
 */
export async function getStorageStats() {
  try {
    await ensureStorageDir()
    const files = await fs.readdir(RECEIPTS_DIR)

    let totalSize = 0
    let pdfCount = 0
    let jpgCount = 0

    for (const file of files) {
      const filePath = path.join(RECEIPTS_DIR, file)
      const stats = await fs.stat(filePath)
      totalSize += stats.size

      if (file.includes('.pdf.gz')) pdfCount++
      if (file.includes('.jpg.gz')) jpgCount++
    }

    return {
      totalFiles: files.length,
      pdfCount,
      jpgCount,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    }
  } catch (error) {
    console.error('Error getting storage stats:', error)
    return {
      totalFiles: 0,
      pdfCount: 0,
      jpgCount: 0,
      totalSizeBytes: 0,
      totalSizeMB: '0.00',
    }
  }
}

/**
 * Clean up old receipts (optional maintenance function)
 * @param daysOld Delete receipts older than this many days
 */
export async function cleanupOldReceipts(daysOld: number = 365) {
  try {
    await ensureStorageDir()
    const files = await fs.readdir(RECEIPTS_DIR)
    const now = Date.now()
    const cutoffTime = now - (daysOld * 24 * 60 * 60 * 1000)

    let deletedCount = 0

    for (const file of files) {
      const filePath = path.join(RECEIPTS_DIR, file)
      const stats = await fs.stat(filePath)

      if (stats.mtimeMs < cutoffTime) {
        await fs.unlink(filePath)
        deletedCount++
        console.log(`Deleted old receipt: ${file}`)
      }
    }

    return {
      deletedCount,
      message: `Deleted ${deletedCount} receipts older than ${daysOld} days`
    }
  } catch (error) {
    console.error('Error cleaning up old receipts:', error)
    throw error
  }
}
