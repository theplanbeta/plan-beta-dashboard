/**
 * Test script for gem mining functionality
 * Tests: Reddit fetch → Comment extraction → AI gem mining
 */

import { PrismaClient } from '@prisma/client'
import { fetchSubredditPosts, formatPostForStorage, fetchPostComments } from '../lib/reddit-api'
import { generateContentIdea } from '../lib/gemini-content-analyzer'

const prisma = new PrismaClient()

async function testGemMining() {
  try {
    console.log('🧪 Testing Gem Mining System\n')

    // Step 1: Fetch top posts from a quality subreddit
    console.log('📊 Step 1: Fetching top posts from r/AskAGerman...')
    const posts = await fetchSubredditPosts('AskAGerman', 5, 'week')
    console.log(`✅ Found ${posts.length} quality posts\n`)

    if (posts.length === 0) {
      console.log('❌ No posts found. Exiting.')
      return
    }

    // Show post details
    posts.forEach((post, i) => {
      console.log(`Post ${i + 1}:`)
      console.log(`  Title: ${post.title}`)
      console.log(`  Upvotes: ${post.ups}`)
      console.log(`  Comments: ${post.num_comments}\n`)
    })

    // Step 2: Save first post to database
    const topPost = posts[0]
    console.log(`💾 Step 2: Saving post to database...`)

    const subreddit = await prisma.subreddit.findUnique({
      where: { name: 'AskAGerman' }
    })

    if (!subreddit) {
      console.log('❌ Subreddit not found in database. Please add it first.')
      return
    }

    const savedPost = await prisma.redditPost.create({
      data: {
        ...formatPostForStorage(topPost),
        subredditId: subreddit.id,
      }
    })
    console.log(`✅ Post saved with ID: ${savedPost.id}\n`)

    // Step 3: Fetch comments with upvote data
    console.log(`💬 Step 3: Fetching comments with upvote data...`)
    const comments = await fetchPostComments(
      topPost.subreddit,
      topPost.id,
      100
    )
    console.log(`✅ Fetched ${comments.length} quality comments\n`)

    // Show top 5 comments
    console.log('Top 5 Comments by Upvotes:')
    comments.slice(0, 5).forEach((comment, i) => {
      console.log(`  ${i + 1}. [${comment.upvotes} upvotes] ${comment.body.slice(0, 80)}...`)
    })
    console.log()

    // Step 4: Generate content idea using gem mining
    console.log(`🔍 Step 4: Mining gems and generating content idea...`)
    const commentsWithVotes = comments.map(c => ({
      body: c.body,
      upvotes: c.upvotes
    }))

    const idea = await generateContentIdea(
      topPost.title,
      topPost.selftext,
      topPost.ups,
      topPost.subreddit,
      commentsWithVotes
    )
    console.log(`✅ Content idea generated!\n`)

    // Step 5: Show results
    console.log('📝 GENERATED CONTENT IDEA:\n')
    console.log(`🎣 HOOK:`)
    console.log(`  ${idea.hook}\n`)

    console.log(`📜 SCRIPT (first 300 chars):`)
    console.log(`  ${idea.script.slice(0, 300)}...\n`)

    console.log(`🎨 VISUAL SUGGESTIONS (first 200 chars):`)
    console.log(`  ${idea.visualSuggestions.slice(0, 200)}...\n`)

    console.log(`📸 CAPTION:`)
    console.log(`  ${idea.caption}\n`)

    console.log(`#️⃣ HASHTAGS:`)
    console.log(`  ${idea.hashtags.map(h => `#${h}`).join(' ')}\n`)

    console.log(`🏷️  TOPIC: ${idea.topic}\n`)

    // Check for gem mining indicators
    console.log('🔍 QUALITY CHECK:')
    const hasUpvoteCitations = idea.script.toLowerCase().includes('upvote') ||
                               idea.caption.toLowerCase().includes('upvote')
    const hasSpecificNumbers = /\d+/.test(idea.script)
    const hasQuotes = idea.script.includes('"') || idea.script.includes("'")

    console.log(`  ✓ Contains upvote citations: ${hasUpvoteCitations ? '✅' : '❌'}`)
    console.log(`  ✓ Contains specific numbers: ${hasSpecificNumbers ? '✅' : '❌'}`)
    console.log(`  ✓ Contains quotes/examples: ${hasQuotes ? '✅' : '❌'}`)
    console.log(`  ✓ Script length: ${idea.script.length} chars (30-45s @ ~3 chars/word)`)

    if (hasUpvoteCitations && hasSpecificNumbers) {
      console.log('\n✅ GEM MINING WORKING! AI is citing upvotes and using specific details.')
    } else {
      console.log('\n⚠️  May need prompt refinement - missing upvote citations or specific details.')
    }

    // Save to database
    await prisma.contentIdea.create({
      data: {
        redditPostId: savedPost.id,
        hook: idea.hook,
        script: idea.script,
        visualSuggestions: idea.visualSuggestions,
        caption: idea.caption,
        hashtags: idea.hashtags,
        topic: idea.topic,
        status: 'DRAFT',
      }
    })
    console.log('\n💾 Content idea saved to database')

  } catch (error) {
    console.error('❌ Error during test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testGemMining()
