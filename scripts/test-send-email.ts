import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testSendSetupEmail() {
  try {
    console.log('🧪 Testing: Send Individual Setup Email to Madhumitha\n')
    console.log('=' .repeat(80))

    // Get first teacher
    const teacher = await prisma.user.findFirst({
      where: {
        role: 'TEACHER',
        email: { contains: '@planbeta.internal' },
        active: true,
      },
      orderBy: { name: 'asc' },
    })

    if (!teacher) {
      console.log('❌ No teacher found for testing')
      return
    }

    console.log(`\n📧 Sending setup email to:`)
    console.log(`   Name: ${teacher.name}`)
    console.log(`   Email: ${teacher.email}`)
    console.log(`   ID: ${teacher.id}`)

    // Make API call
    console.log(`\n🔄 Calling API: POST /api/teachers/send-setup-email`)

    const response = await fetch('http://localhost:3001/api/teachers/send-setup-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In real testing, you'd need to include authentication cookie
        // For now, this will test if endpoint is accessible
      },
      body: JSON.stringify({
        teacherIds: [teacher.id],
      }),
    })

    console.log(`\n📊 Response Status: ${response.status} ${response.statusText}`)

    const data = await response.json()
    console.log(`\n📦 Response Data:`)
    console.log(JSON.stringify(data, null, 2))

    if (response.ok) {
      console.log(`\n✅ TEST PASSED: Email API responded successfully`)
      console.log(`   Sent: ${data.results?.sent || 0}`)
      console.log(`   Failed: ${data.results?.failed || 0}`)
      console.log(`   Skipped: ${data.results?.skipped || 0}`)

      if (data.results?.details) {
        console.log(`\n📋 Details:`)
        data.results.details.forEach((detail: any, idx: number) => {
          console.log(`   ${idx + 1}. ${detail.teacherName}: ${detail.status}${detail.reason ? ` (${detail.reason})` : ''}`)
        })
      }
    } else {
      console.log(`\n❌ TEST FAILED: ${data.error || 'Unknown error'}`)
      if (data.details) {
        console.log(`   Details: ${JSON.stringify(data.details)}`)
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('🏁 Test complete')

  } catch (error) {
    console.error('\n❌ Test error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSendSetupEmail()
