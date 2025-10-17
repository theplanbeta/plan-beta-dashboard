import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function changeAdminPassword() {
  try {
    // Get all FOUNDER users
    const admins = await prisma.user.findMany({
      where: {
        role: 'FOUNDER'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true
      }
    })

    console.log('\nFound admin users (FOUNDER role):')
    console.log('====================================')
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.name} (${admin.email}) - ${admin.active ? 'Active' : 'Inactive'}`)
    })

    if (admins.length === 0) {
      console.log('\nNo admin users found!')
      process.exit(1)
    }

    // Get email from command line argument
    const emailToUpdate = process.argv[2]
    const newPassword = process.argv[3]

    if (!emailToUpdate || !newPassword) {
      console.log('\n❌ Usage: npx tsx scripts/change-admin-password.ts <email> <new-password>')
      console.log('Example: npx tsx scripts/change-admin-password.ts admin@planbeta.in MyNewPassword123')
      process.exit(1)
    }

    // Find the admin user
    const admin = admins.find(a => a.email === emailToUpdate)
    if (!admin) {
      console.log(`\n❌ Admin user with email "${emailToUpdate}" not found!`)
      process.exit(1)
    }

    // Hash the new password
    const hashedPassword = await hash(newPassword, 10)

    // Update the password
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        password: hashedPassword,
        requirePasswordChange: false
      }
    })

    console.log(`\n✅ Password updated successfully for ${admin.name} (${admin.email})`)
    console.log(`New password: ${newPassword}`)
    console.log(`\n🔐 You can now login with:`)
    console.log(`   Email: ${admin.email}`)
    console.log(`   Password: ${newPassword}`)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

changeAdminPassword()
