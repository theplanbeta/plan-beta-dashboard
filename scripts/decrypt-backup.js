#!/usr/bin/env node

/**
 * Decrypt an AES-256-GCM encrypted backup file.
 *
 * Usage:
 *   node scripts/decrypt-backup.js <encrypted-file> [output-file]
 *
 * The BACKUP_ENCRYPTION_KEY env var must be set (64-char hex string = 32 bytes).
 * You can also pass it inline:
 *   BACKUP_ENCRYPTION_KEY=abc123... node scripts/decrypt-backup.js backup.json.gz.enc
 *
 * The decrypted output is a gzipped JSON file. Decompress with:
 *   gunzip backup.json.gz
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const encryptedFile = process.argv[2]
if (!encryptedFile) {
  console.error('Usage: node scripts/decrypt-backup.js <encrypted-file> [output-file]')
  process.exit(1)
}

const key = process.env.BACKUP_ENCRYPTION_KEY
if (!key || key.length !== 64) {
  console.error('Error: BACKUP_ENCRYPTION_KEY env var must be set (64-char hex string)')
  console.error('Example: BACKUP_ENCRYPTION_KEY=your64charhexkey node scripts/decrypt-backup.js file.enc')
  process.exit(1)
}

const outputFile = process.argv[3] || encryptedFile.replace(/\.enc$/, '')

try {
  const data = fs.readFileSync(encryptedFile)

  // Format: [12-byte IV][16-byte auth tag][ciphertext]
  const iv = data.slice(0, 12)
  const authTag = data.slice(12, 28)
  const ciphertext = data.slice(28)

  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])

  fs.writeFileSync(outputFile, decrypted)
  console.log(`Decrypted: ${encryptedFile} -> ${outputFile}`)
  console.log(`File size: ${decrypted.length} bytes`)
  console.log(`\nDecompress with: gunzip ${outputFile}`)
} catch (error) {
  if (error.message?.includes('Unsupported state')) {
    console.error('Error: Decryption failed — wrong key or corrupted file')
  } else {
    console.error('Error:', error.message)
  }
  process.exit(1)
}
