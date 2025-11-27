import { prisma } from './prisma'

/**
 * Sanitize first name to create student ID base
 * Converts "John Doe" -> "john"
 */
export function sanitizeFirstName(name: string): string {
  const firstName = name.trim().split(/\s+/)[0]
  return firstName.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Generate next available student ID in format: firstname01, firstname02, etc.
 * @param name - Full name of the student
 * @returns Promise<string> - Generated student ID (e.g., "john01", "john02")
 */
export async function generateStudentId(name: string): Promise<string> {
  const baseName = sanitizeFirstName(name)

  // Find all existing students with similar IDs
  const existingStudents = await prisma.student.findMany({
    where: {
      studentId: {
        startsWith: baseName,
      },
    },
    select: {
      studentId: true,
    },
  })

  // Extract numbers from existing IDs
  const numbers = existingStudents
    .map(s => {
      const match = s.studentId.match(new RegExp(`^${baseName}(\\d+)$`))
      return match ? parseInt(match[1], 10) : 0
    })
    .filter(n => n > 0)

  // Get next number
  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1

  // Format as firstname01, firstname02, etc.
  return `${baseName}${String(nextNumber).padStart(2, '0')}`
}

/**
 * Check if a student ID is available
 */
export async function isStudentIdAvailable(studentId: string): Promise<boolean> {
  const existing = await prisma.student.findUnique({
    where: { studentId },
  })
  return !existing
}
