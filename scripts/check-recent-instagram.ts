/**
 * Check recent Instagram messages and comments
 */

import { prisma } from '../lib/prisma'

async function checkRecentData() {
  console.log('📊 Recent Instagram Activity\n')
  console.log('=' .repeat(70))

  // Check messages
  const messages = await prisma.instagramMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  console.log('\n📨 Recent Messages (last 10):')
  if (messages.length === 0) {
    console.log('   No messages found')
  } else {
    messages.forEach((msg, i) => {
      console.log(`\n   ${i + 1}. ${msg.instagramHandle || 'Unknown'}`)
      console.log(`      Direction: ${msg.direction}`)
      console.log(`      Content: ${msg.content.substring(0, 100)}`)
      console.log(`      Received: ${msg.createdAt}`)
      console.log(`      Sent At: ${msg.sentAt}`)
    })
  }

  // Check comments
  const comments = await prisma.instagramComment.findMany({
    orderBy: { commentedAt: 'desc' },
    take: 10,
  })

  console.log('\n\n💬 Recent Comments (last 10):')
  if (comments.length === 0) {
    console.log('   No comments found')
  } else {
    comments.forEach((comment, i) => {
      console.log(`\n   ${i + 1}. @${comment.username}`)
      console.log(`      Text: ${comment.text.substring(0, 100)}`)
      console.log(`      Priority: ${comment.priority}`)
      console.log(`      Lead Created: ${comment.leadCreated ? 'Yes' : 'No'}`)
      console.log(`      Received: ${comment.createdAt}`)
      console.log(`      Commented At: ${comment.commentedAt}`)
    })
  }

  // Check leads
  const leads = await prisma.lead.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  console.log('\n\n🎯 Recent Leads (last 24 hours):')
  if (leads.length === 0) {
    console.log('   No leads created in the last 24 hours')
  } else {
    leads.forEach((lead, i) => {
      console.log(`\n   ${i + 1}. ${lead.name || lead.instagramHandle || 'Unknown'}`)
      console.log(`      Quality: ${lead.quality}`)
      console.log(`      Score: ${lead.leadScore}`)
      console.log(`      Status: ${lead.status}`)
      console.log(`      Created: ${lead.createdAt}`)
    })
  }

  console.log('\n' + '='.repeat(70))
  console.log('\n🔌 Disconnecting from database...\n')
  await prisma.$disconnect()
}

checkRecentData()
  .catch(console.error)
