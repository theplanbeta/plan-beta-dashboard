import { prisma } from './lib/prisma'

async function checkRecentLeads() {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        source: true,
        status: true,
        createdAt: true,
        notes: true,
      },
    })

    console.log('\n📊 Recent Leads (last 5):')
    console.log('========================\n')

    if (leads.length === 0) {
      console.log('No leads found.')
    } else {
      leads.forEach((lead, index) => {
        console.log(`${index + 1}. ${lead.name}`)
        console.log(`   ID: ${lead.id}`)
        console.log(`   Source: ${lead.source}`)
        console.log(`   Status: ${lead.status}`)
        console.log(`   Created: ${lead.createdAt}`)
        if (lead.notes) {
          console.log(`   Notes: ${lead.notes.substring(0, 100)}...`)
        }
        console.log('')
      })
    }

    // Check for leads created in last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    const recentLeads = await prisma.lead.findMany({
      where: {
        createdAt: {
          gte: tenMinutesAgo,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    console.log(`\n🔍 Leads created in last 10 minutes: ${recentLeads.length}`)
    if (recentLeads.length > 0) {
      recentLeads.forEach((lead) => {
        console.log(`   - ${lead.name} (${lead.source}) - ${lead.createdAt}`)
      })
    }

    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    await prisma.$disconnect()
  }
}

checkRecentLeads()
