import { prisma } from '../lib/prisma'

async function main() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      name: true,
      role: true
    },
    take: 10
  })
  
  console.log('\nUsers in database:')
  console.table(users)
}

main()
  .then(() => {
    console.log('\nNote: Email should include @ symbol (e.g., admin@planbeta.in)')
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
