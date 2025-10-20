/**
 * View High-Priority Comments
 * Quick script to see comments that need immediate attention
 */

import { prisma } from '@/lib/prisma'

async function viewHighPriorityComments() {
  console.log('🔥 HIGH PRIORITY INSTAGRAM COMMENTS\n')
  console.log('='.repeat(70))

  // Get critical and high priority comments from last 7 days
  const highPriorityComments = await prisma.instagramComment.findMany({
    where: {
      priority: {
        in: ['critical', 'high'],
      },
      commentedAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      },
    },
    orderBy: {
      commentedAt: 'desc',
    },
    take: 20,
  })

  if (highPriorityComments.length === 0) {
    console.log('\n✅ No high-priority comments in the last 7 days.')
    console.log('   This is good - no urgent followups needed!\n')
    await prisma.$disconnect()
    return
  }

  console.log(`\nFound ${highPriorityComments.length} high-priority comments:\n`)

  for (const comment of highPriorityComments) {
    const priorityEmoji = comment.priority === 'critical' ? '🚨' : '⚠️'
    const leadStatus = comment.leadCreated ? '✅ Lead Created' : '❌ No Lead'
    const replyStatus = comment.replied ? '✅ Auto-Replied' : '⏳ Pending Reply'

    console.log(`${priorityEmoji} ${comment.priority.toUpperCase()}`)
    console.log(`   From: @${comment.username}`)
    console.log(`   Date: ${comment.commentedAt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`)
    console.log(`   Comment: "${comment.text.substring(0, 80)}${comment.text.length > 80 ? '...' : ''}"`)
    console.log(`   Triggers: [${(comment.triggerWords as string[]).join(', ')}]`)
    console.log(`   Status: ${leadStatus} | ${replyStatus}`)

    if (comment.leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: comment.leadId },
        select: { leadScore: true, quality: true, phone: true, email: true },
      })

      if (lead) {
        console.log(`   📊 Lead Score: ${lead.leadScore}/100 (${lead.quality})`)
        if (lead.phone || lead.email) {
          console.log(`   📞 Contact: ${lead.phone || lead.email || 'N/A'}`)
        }
      }
    }

    if (comment.mediaUrl) {
      console.log(`   🔗 Post: ${comment.mediaUrl}`)
    }

    console.log('')
  }

  // Summary by priority
  const critical = highPriorityComments.filter(c => c.priority === 'critical').length
  const high = highPriorityComments.filter(c => c.priority === 'high').length
  const withLeads = highPriorityComments.filter(c => c.leadCreated).length
  const replied = highPriorityComments.filter(c => c.replied).length

  console.log('='.repeat(70))
  console.log('\n📊 SUMMARY:')
  console.log(`   Critical: ${critical}`)
  console.log(`   High: ${high}`)
  console.log(`   Leads Created: ${withLeads}/${highPriorityComments.length}`)
  console.log(`   Auto-Replied: ${replied}/${highPriorityComments.length}`)

  // Action items
  const needsFollowup = highPriorityComments.filter(c => c.leadCreated && !c.replied)
  if (needsFollowup.length > 0) {
    console.log(`\n⚡ ACTION NEEDED:`)
    console.log(`   ${needsFollowup.length} high-intent comments need manual followup`)
    console.log(`   View them in Prisma Studio or dashboard`)
  }

  console.log('\n')
  await prisma.$disconnect()
}

viewHighPriorityComments().catch(console.error)
