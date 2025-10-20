/**
 * Test Script for Instagram AI Auto-Responder
 * Simulates Instagram webhook events to test auto-reply functionality
 */

import { config } from 'dotenv'
config()

async function testInstagramWebhook() {
  const baseUrl = 'http://localhost:3001'

  // Test scenarios
  const testMessages = [
    {
      name: "Greeting",
      message: "Hi",
      expectedTopics: ["greeting", "options", "courses"]
    },
    {
      name: "Course Inquiry",
      message: "I want to learn German. I'm a complete beginner.",
      expectedTopics: ["A1", "beginner", "trial", "batch"]
    },
    {
      name: "Pricing Question",
      message: "What is the fee for A1 course?",
      expectedTopics: ["350", "EUR", "pricing"]
    },
    {
      name: "Batch Schedule",
      message: "When does the next A1 batch start?",
      expectedTopics: ["batch", "date", "schedule"]
    },
    {
      name: "Level Info",
      message: "What will I learn in B1 level?",
      expectedTopics: ["B1", "intermediate", "topics"]
    },
    {
      name: "Trial Class",
      message: "Can I attend a trial class?",
      expectedTopics: ["free", "trial", "book"]
    },
  ]

  console.log('🧪 Testing Instagram AI Auto-Responder\n')
  console.log('=' .repeat(60))

  for (const test of testMessages) {
    console.log(`\n📝 Test: ${test.name}`)
    console.log(`💬 Message: "${test.message}"`)

    // Create webhook payload
    const payload = {
      object: "instagram",
      entry: [{
        id: "test_page_id",
        time: Date.now(),
        messaging: [{
          sender: { id: "test_user_" + Date.now() },
          recipient: { id: "your_page_id" },
          timestamp: Date.now(),
          message: {
            mid: "test_mid_" + Date.now(),
            text: test.message
          }
        }]
      }]
    }

    try {
      const response = await fetch(`${baseUrl}/api/webhooks/instagram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        console.log('✅ Webhook processed successfully')

        // Wait a bit for async operations
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Check if response was generated (would be in InstagramMessage table)
        console.log('🤖 AI should have generated a response')
        console.log(`   Expected topics: ${test.expectedTopics.join(', ')}`)
      } else {
        console.log(`❌ Error: ${response.status} ${response.statusText}`)
        const error = await response.text()
        console.log(`   ${error}`)
      }
    } catch (error) {
      console.log(`❌ Network error: ${error}`)
    }

    console.log('-'.repeat(60))
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n✅ Testing complete!')
  console.log('\n📊 To check results:')
  console.log('1. Open Prisma Studio: http://localhost:5556')
  console.log('2. Check the InstagramMessage table for OUTGOING messages')
  console.log('3. Check the Lead table for auto-created leads')
  console.log('\nNote: Actual Instagram sending will only work in production with valid tokens.')
}

// Run test
testInstagramWebhook().catch(console.error)
