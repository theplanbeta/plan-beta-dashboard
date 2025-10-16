import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function checkContent() {
  try {
    const count = await prisma.contentPerformance.count()
    console.log(`\n📊 Total content in database: ${count}`)

    if (count > 0) {
      const recent = await prisma.contentPerformance.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          platform: true,
          contentType: true,
          views: true,
          likes: true,
          publishedAt: true,
          caption: true,
        }
      })

      console.log('\n📝 Recent content:')
      recent.forEach((item, i) => {
        console.log(`\n${i + 1}. ${item.platform} ${item.contentType}`)
        console.log(`   Views: ${item.views}, Likes: ${item.likes}`)
        console.log(`   Caption: ${item.caption?.substring(0, 50)}...`)
      })
    } else {
      console.log('❌ No content found in database')
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkContent()
