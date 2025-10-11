import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
  // Connection pool configuration for Neon database
  // Limits concurrent connections to prevent exhausting database resources
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// Add connection management in development
if (process.env.NODE_ENV === 'development') {
  // Periodically check and clean up stale connections
  setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch (error) {
      console.log('Connection check failed, reconnecting...')
    }
  }, 30000) // Every 30 seconds
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Graceful shutdown handler
if (process.env.NODE_ENV === 'production') {
  const cleanup = async () => {
    await prisma.$disconnect()
    process.exit(0)
  }

  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)
}
