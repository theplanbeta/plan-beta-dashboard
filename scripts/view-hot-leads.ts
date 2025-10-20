/**
 * View HOT Leads
 * Quick script to see leads that need immediate followup
 */

import { prisma } from '@/lib/prisma'
import { calculateLeadScore } from '@/lib/lead-scoring/multi-factor-scorer'

async function viewHotLeads() {
  console.log('🔥 HOT LEADS DASHBOARD\n')
  console.log('='.repeat(70))

  // Get HOT leads (score >= 75) or quality = HOT
  const hotLeads = await prisma.lead.findMany({
    where: {
      OR: [
        { leadScore: { gte: 75 } },
        { quality: 'HOT' },
      ],
      status: {
        in: ['NEW', 'CONTACTED', 'INTERESTED', 'TRIAL_SCHEDULED'],
      },
    },
    orderBy: {
      leadScore: 'desc',
    },
    take: 15,
  })

  if (hotLeads.length === 0) {
    console.log('\n📊 No HOT leads at the moment.')
    console.log('   Check back after more Instagram engagement!\n')
    await prisma.$disconnect()
    return
  }

  console.log(`\nFound ${hotLeads.length} HOT leads:\n`)

  for (const lead of hotLeads) {
    const hasContact = !!(lead.phone || lead.email || lead.whatsapp)
    const contactIcon = hasContact ? '📞' : '⚠️'

    console.log(`🔥 ${lead.quality} LEAD - Score: ${lead.leadScore}/100`)
    console.log(`   Name: ${lead.name}`)

    if (lead.instagramHandle) {
      console.log(`   Instagram: @${lead.instagramHandle}`)
    }

    if (lead.phone || lead.whatsapp) {
      console.log(`   ${contactIcon} Phone: ${lead.phone || lead.whatsapp}`)
    }
    if (lead.email) {
      console.log(`   ${contactIcon} Email: ${lead.email}`)
    }

    console.log(`   Status: ${lead.status}`)
    console.log(`   Level: ${lead.interestedLevel}`)
    console.log(`   Source: ${lead.firstTouchpoint}`)

    if (lead.lastContactDate) {
      const daysSince = Math.floor((Date.now() - new Date(lead.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
      console.log(`   Last Contact: ${daysSince} days ago`)
    }

    // Get detailed score breakdown
    try {
      const scoreResult = await calculateLeadScore(lead.id)
      console.log(`\n   📊 Score Breakdown:`)
      console.log(`      Engagement: ${scoreResult.breakdown.engagementScore}/30`)
      console.log(`      Intent: ${scoreResult.breakdown.intentScore}/40`)
      console.log(`      Contact: ${scoreResult.breakdown.contactScore}/20`)
      console.log(`      Behavior: ${scoreResult.breakdown.behaviorScore}/10`)
      console.log(`\n   💡 Recommended Action: ${scoreResult.recommendedAction.toUpperCase().replace(/_/g, ' ')}`)

      if (scoreResult.reasoning.length > 0) {
        console.log(`   💭 Reasoning: ${scoreResult.reasoning[0]}`)
      }
    } catch (error) {
      console.log(`   ⚠️  Could not calculate detailed score`)
    }

    console.log('')
  }

  // Summary statistics
  const avgScore = Math.round(hotLeads.reduce((sum, lead) => sum + lead.leadScore, 0) / hotLeads.length)
  const withContact = hotLeads.filter(l => l.phone || l.email).length
  const fromComments = hotLeads.filter(l => l.firstTouchpoint === 'instagram_comment').length
  const fromDMs = hotLeads.filter(l => l.firstTouchpoint === 'instagram_dm').length

  console.log('='.repeat(70))
  console.log('\n📊 SUMMARY:')
  console.log(`   Total HOT Leads: ${hotLeads.length}`)
  console.log(`   Average Score: ${avgScore}/100`)
  console.log(`   With Contact Info: ${withContact}/${hotLeads.length}`)
  console.log(`   From Comments: ${fromComments}`)
  console.log(`   From DMs: ${fromDMs}`)

  // Priority actions
  const needsImmediateFollowup = hotLeads.filter(l => {
    const daysSince = l.lastContactDate
      ? Math.floor((Date.now() - new Date(l.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
      : 999
    return daysSince > 2 && l.status === 'NEW'
  })

  if (needsImmediateFollowup.length > 0) {
    console.log(`\n⚡ URGENT ACTION NEEDED:`)
    console.log(`   ${needsImmediateFollowup.length} HOT leads haven't been contacted in 2+ days`)
    console.log(`   Prioritize these for immediate followup!`)
    console.log(`\n   Quick list:`)
    needsImmediateFollowup.forEach(l => {
      console.log(`   - ${l.name} (@${l.instagramHandle}) - ${l.phone || l.email || 'No contact'}`)
    })
  }

  console.log('\n')
  await prisma.$disconnect()
}

viewHotLeads().catch(console.error)
