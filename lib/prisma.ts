import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Helper function to check if an error is a connection error
function isConnectionError(error: any): boolean {
  return (
    error?.code === 'P1001' || // Can't reach database server
    error?.code === 'P1017' || // Server has closed the connection
    error?.message?.includes("Can't reach database server") ||
    error?.message?.includes("Connection closed") ||
    error?.message?.includes("Connection reset") ||
    error?.message?.includes("Connection check failed")
  )
}

// Helper function to add retry logic
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  retryCount = 0
): Promise<T> {
  try {
    return await operation()
  } catch (error: any) {
    if (isConnectionError(error) && retryCount < maxRetries - 1) {
      const delay = 1000 * (retryCount + 1) // Exponential backoff
      console.log(`🔄 Database connection error, retrying (${retryCount + 1}/${maxRetries}) in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return withRetry(operation, maxRetries, retryCount + 1)
    }
    throw error
  }
}

// Base Prisma client configuration
const basePrismaClient = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// Extend Prisma client with retry logic using the modern $extends API
const extendedPrisma = basePrismaClient.$extends({
  name: 'retryOnConnectionError',
  query: {
    $allModels: {
      async $allOperations({ operation, model, args, query }) {
        return withRetry(() => query(args))
      },
    },
  },
})

export const prisma = globalForPrisma.prisma ?? extendedPrisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Graceful shutdown handler
const cleanup = async () => {
  console.log('🔌 Disconnecting from database...')
  try {
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error disconnecting from database:', error)
  }
  if (process.env.NODE_ENV === 'production') {
    process.exit(0)
  }
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

// Handle uncaught exceptions to cleanup database connections
process.on('beforeExit', cleanup)
