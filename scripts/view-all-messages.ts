import { prisma } from '@/lib/prisma'

async function viewAllMessages() {
  console.log('📨 INSTAGRAM MESSAGES:\n')
  console.log('='.repeat(70))

  const messages = await prisma.instagramMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20
  })

  if (messages.length === 0) {
    console.log('\nNo messages found\n')
  } else {
    console.log(`\nFound ${messages.length} messages:\n`)
    messages.forEach((msg, index) => {
      console.log(`${index + 1}. From: @${msg.senderUsername || 'unknown'}`)
      const messageText = msg.text || '(no text)'
      console.log(`   Message: ${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}`)
      console.log(`   Date: ${msg.createdAt.toLocaleString()}`)
      console.log(`   Status: ${msg.status}`)
      console.log('')
    })
  }

  console.log('='.repeat(70))
  console.log('\n💬 INSTAGRAM COMMENTS:\n')
  console.log('='.repeat(70))

  const comments = await prisma.instagramComment.findMany({
    orderBy: { commentedAt: 'desc' },
    take: 20
  })

  if (comments.length === 0) {
    console.log('\nNo comments found\n')
  } else {
    console.log(`\nFound ${comments.length} comments:\n`)
    comments.forEach((comment, index) => {
      console.log(`${index + 1}. From: @${comment.username}`)
      console.log(`   Comment: "${comment.text}"`)
      console.log(`   Priority: ${comment.priority.toUpperCase()}`)
      console.log(`   Triggers: [${(comment.triggerWords as string[]).join(', ')}]`)
      console.log(`   Lead Created: ${comment.leadCreated ? '✅ Yes' : '❌ No'}`)
      console.log(`   Replied: ${comment.replied ? '✅ Yes' : '❌ No'}`)
      console.log(`   Date: ${comment.commentedAt.toLocaleString()}`)
      console.log('')
    })
  }

  console.log('='.repeat(70))
  console.log('\n📊 SUMMARY:')
  console.log(`   Total Messages: ${messages.length}`)
  console.log(`   Total Comments: ${comments.length}`)
  console.log(`   High Priority Comments: ${comments.filter(c => c.priority === 'critical' || c.priority === 'high').length}`)
  console.log(`   Leads Created from Comments: ${comments.filter(c => c.leadCreated).length}`)
  console.log('\n')

  await prisma.$disconnect()
}

viewAllMessages().catch(console.error)
