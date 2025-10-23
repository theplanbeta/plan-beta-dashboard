/**
 * Subreddit Manager - Utility for managing Content Lab subreddits
 *
 * Usage:
 *   npx tsx scripts/subreddit-manager.ts status
 *   npx tsx scripts/subreddit-manager.ts add StudyInGermany
 *   npx tsx scripts/subreddit-manager.ts reset
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function showStatus() {
  console.log('\n📊 Subreddit Status\n')

  const subs = await prisma.subreddit.findMany({
    where: { active: true },
    select: {
      name: true,
      currentTimeframe: true,
      lastFetched: true,
      postCount: true,
    },
    orderBy: { name: 'asc' },
  })

  console.table(subs.map(s => ({
    Subreddit: `r/${s.name}`,
    Timeframe: s.currentTimeframe,
    'Last Fetched': s.lastFetched ? s.lastFetched.toLocaleDateString() : 'Never',
    'Posts Found': s.postCount,
  })))

  // Summary
  const timeframeCounts = subs.reduce((acc, s) => {
    acc[s.currentTimeframe] = (acc[s.currentTimeframe] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('\n📈 Timeframe Distribution:')
  Object.entries(timeframeCounts).forEach(([timeframe, count]) => {
    console.log(`  ${timeframe}: ${count} subreddits`)
  })

  const totalPosts = subs.reduce((sum, s) => sum + s.postCount, 0)
  console.log(`\n✅ Total posts collected: ${totalPosts}`)
}

async function addSubreddit(name: string, description?: string, category?: string) {
  try {
    const sub = await prisma.subreddit.create({
      data: {
        name,
        description: description || `Subreddit for ${name}`,
        category: category || 'expat',
        active: true,
        currentTimeframe: 'week',
      },
    })

    console.log(`✅ Added r/${sub.name}`)
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.log(`⚠️  r/${name} already exists`)
    } else {
      console.error('❌ Error adding subreddit:', error.message)
    }
  }
}

async function resetTimeframes() {
  const result = await prisma.subreddit.updateMany({
    where: { active: true },
    data: { currentTimeframe: 'week' },
  })

  console.log(`✅ Reset ${result.count} subreddits back to 'week' timeframe`)
}

async function deactivateSubreddit(name: string) {
  try {
    await prisma.subreddit.update({
      where: { name },
      data: { active: false },
    })

    console.log(`✅ Deactivated r/${name}`)
  } catch (error) {
    console.log(`❌ r/${name} not found`)
  }
}

async function addRecommended() {
  console.log('📥 Adding recommended subreddits...\n')

  const recommended = [
    { name: 'StudyInGermany', description: 'Subreddit for students planning to study in Germany', category: 'education' },
    { name: 'German', description: 'German language learning discussions', category: 'language' },
    { name: 'Munich', description: 'Munich city subreddit with expat discussions', category: 'location' },
    { name: 'Berlin', description: 'Berlin city subreddit with diverse expat community', category: 'location' },
  ]

  for (const sub of recommended) {
    await addSubreddit(sub.name, sub.description, sub.category)
  }

  console.log('\n✅ Done adding recommended subreddits')
}

// Main CLI
const command = process.argv[2]
const arg = process.argv[3]

async function main() {
  try {
    switch (command) {
      case 'status':
        await showStatus()
        break

      case 'add':
        if (!arg) {
          console.log('❌ Usage: npx tsx scripts/subreddit-manager.ts add <subreddit-name>')
          process.exit(1)
        }
        await addSubreddit(arg)
        break

      case 'remove':
        if (!arg) {
          console.log('❌ Usage: npx tsx scripts/subreddit-manager.ts remove <subreddit-name>')
          process.exit(1)
        }
        await deactivateSubreddit(arg)
        break

      case 'reset':
        await resetTimeframes()
        break

      case 'add-recommended':
        await addRecommended()
        break

      default:
        console.log(`
📋 Subreddit Manager Commands:

  status              Show current status of all subreddits
  add <name>          Add a new subreddit
  remove <name>       Deactivate a subreddit
  reset               Reset all timeframes back to 'week'
  add-recommended     Add recommended subreddits

Examples:
  npx tsx scripts/subreddit-manager.ts status
  npx tsx scripts/subreddit-manager.ts add StudyInGermany
  npx tsx scripts/subreddit-manager.ts reset
        `)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main()
