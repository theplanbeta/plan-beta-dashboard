import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create founder user
  const hashedPasswordFounder = await hash('admin123', 12)
  const founder = await prisma.user.upsert({
    where: { email: 'admin@planbeta.in' },
    update: {
      password: hashedPasswordFounder,
      active: true,
    },
    create: {
      email: 'admin@planbeta.in',
      name: 'Admin User',
      password: hashedPasswordFounder,
      role: 'FOUNDER',
      phone: '+91 9876543210',
    },
  })

  // Create marketing user
  const hashedPasswordMarketing = await hash('marketing123', 12)
  const marketing = await prisma.user.upsert({
    where: { email: 'marketing@planbeta.in' },
    update: {
      password: hashedPasswordMarketing,
      active: true,
    },
    create: {
      email: 'marketing@planbeta.in',
      name: 'Marketing User',
      password: hashedPasswordMarketing,
      role: 'MARKETING',
      phone: '+91 9876543211',
    },
  })

  // Create teacher user
  const hashedPasswordTeacher = await hash('teacher123', 12)
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@planbeta.in' },
    update: {
      password: hashedPasswordTeacher,
      active: true,
    },
    create: {
      email: 'teacher@planbeta.in',
      name: 'Test Teacher',
      password: hashedPasswordTeacher,
      role: 'TEACHER',
      phone: '+91 9876543212',
      bio: 'Experienced German language teacher',
      qualifications: 'Goethe-Zertifikat C2, M.A. in German Studies',
      experience: '5+ years teaching German to Indian students',
      specializations: 'Grammar, Conversation, Exam Preparation',
      languages: 'English, Hindi, German',
      availability: 'Mon-Fri: 4 PM - 9 PM, Sat: 10 AM - 6 PM',
      hourlyRate: 800,
      preferredContact: 'WhatsApp',
      whatsapp: '+91 9876543212',
    },
  })

  console.log('✅ Seed data created successfully!')
  console.log('\n🎯 TEST CREDENTIALS:')
  console.log('\n👑 FOUNDER (Admin):')
  console.log('   📧 Email: admin@planbeta.in')
  console.log('   🔑 Password: admin123')
  console.log('\n📢 MARKETING:')
  console.log('   📧 Email: marketing@planbeta.in')
  console.log('   🔑 Password: marketing123')
  console.log('\n👨‍🏫 TEACHER:')
  console.log('   📧 Email: teacher@planbeta.in')
  console.log('   🔑 Password: teacher123')
  console.log('\n🌐 Login URL: http://localhost:3001/login')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
