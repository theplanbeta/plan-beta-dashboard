import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function checkMessages() {
  try {
    const count = await prisma.instagramMessage.count()
    console.log(`\n📨 Total Instagram messages: ${count}`)

    if (count > 0) {
      const recent = await prisma.instagramMessage.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
      })

      console.log('\n📝 Recent messages:')
      recent.forEach((msg, i) => {
        console.log(`\n${i + 1}. From: @${msg.instagramHandle}`)
        console.log(`   Content: ${msg.content.substring(0, 100)}`)
        console.log(`   Direction: ${msg.direction}`)
        console.log(`   Lead Created: ${msg.leadCreated}`)
        console.log(`   Sent At: ${msg.sentAt}`)
      })
    } else {
      console.log('❌ No Instagram messages found')
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkMessages()
