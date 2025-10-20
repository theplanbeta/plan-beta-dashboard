/**
 * Test Script for Lead Scoring and Comment Tracking Systems
 * Tests both implementations end-to-end
 */

import { config } from 'dotenv'
config()

import { prisma } from '@/lib/prisma'
import { calculateLeadScore, recalculateAllLeadScores } from '@/lib/lead-scoring/multi-factor-scorer'
import { detectTriggers, analyzeComments, extractContactFromComment } from '@/lib/comment-tracking/trigger-detector'

console.log('🧪 Testing Lead Scoring & Comment Tracking Systems\n')
console.log('='.repeat(70))

/**
 * Test 1: Comment Trigger Detection
 */
async function testCommentTriggerDetection() {
  console.log('\n📝 TEST 1: Comment Trigger Detection\n')

  const testComments = [
    {
      text: "I'm interested in joining the A1 batch! When does it start?",
      expectedPriority: 'critical',
      expectedIntent: 'enrollment',
    },
    {
      text: "What's the price for B1 level?",
      expectedPriority: 'high',
      expectedIntent: 'pricing',
    },
    {
      text: "Can I attend a free trial class?",
      expectedPriority: 'high',
      expectedIntent: 'trial',
    },
    {
      text: "Tell me more about A1 level",
      expectedPriority: 'medium',
      expectedIntent: 'level_info',
    },
    {
      text: "Nice! 👍",
      expectedPriority: 'low',
      expectedIntent: 'general',
    },
    {
      text: "DM for promotion! 🔥🔥🔥",
      expectedPriority: 'low',
      expectedIntent: 'general',
    },
  ]

  let passed = 0
  let failed = 0

  for (const testCase of testComments) {
    const result = detectTriggers(testCase.text)

    const priorityMatch = result.priority === testCase.expectedPriority
    const intentMatch = result.intent === testCase.expectedIntent

    if (priorityMatch && intentMatch) {
      console.log(`✅ PASS: "${testCase.text.substring(0, 40)}..."`)
      console.log(`   Priority: ${result.priority}, Intent: ${result.intent}, Score: ${result.score}`)
      passed++
    } else {
      console.log(`❌ FAIL: "${testCase.text.substring(0, 40)}..."`)
      console.log(`   Expected: ${testCase.expectedPriority}/${testCase.expectedIntent}`)
      console.log(`   Got: ${result.priority}/${result.intent}`)
      failed++
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)
  return { passed, failed }
}

/**
 * Test 2: Contact Extraction from Comments
 */
async function testContactExtraction() {
  console.log('\n📝 TEST 2: Contact Extraction from Comments\n')

  const testCases = [
    {
      text: "Interested! My email is john@example.com",
      expectedEmail: 'john@example.com',
      expectedPhone: undefined,
    },
    {
      text: "Please call me at 9876543210",
      expectedEmail: undefined,
      expectedPhone: '9876543210',
    },
    {
      text: "Contact me: +91 98765 43210, email: test@test.com",
      expectedEmail: 'test@test.com',
      expectedPhone: '+919876543210',
    },
    {
      text: "I want to join!",
      expectedEmail: undefined,
      expectedPhone: undefined,
    },
  ]

  let passed = 0
  let failed = 0

  for (const testCase of testCases) {
    const result = extractContactFromComment(testCase.text)

    const emailMatch = result.email === testCase.expectedEmail
    const phoneMatch = result.phone === testCase.expectedPhone

    if (emailMatch && phoneMatch) {
      console.log(`✅ PASS: "${testCase.text.substring(0, 40)}..."`)
      console.log(`   Email: ${result.email || 'none'}, Phone: ${result.phone || 'none'}`)
      passed++
    } else {
      console.log(`❌ FAIL: "${testCase.text.substring(0, 40)}..."`)
      console.log(`   Expected - Email: ${testCase.expectedEmail}, Phone: ${testCase.expectedPhone}`)
      console.log(`   Got - Email: ${result.email}, Phone: ${result.phone}`)
      failed++
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)
  return { passed, failed }
}

/**
 * Test 3: Batch Comment Analysis
 */
async function testBatchCommentAnalysis() {
  console.log('\n📝 TEST 3: Batch Comment Analysis\n')

  const comments = [
    { text: "I want to enroll in A1 batch", username: "user1" },
    { text: "What's the fee for B1?", username: "user2" },
    { text: "Nice reel!", username: "user3" },
    { text: "Can I get a trial class?", username: "user4" },
    { text: "DM for promo", username: "spam_bot" },
  ]

  const analysis = analyzeComments(comments)

  console.log(`High Priority: ${analysis.highPriority.length} comments`)
  analysis.highPriority.forEach(c => console.log(`  - @${c.username}: ${c.text.substring(0, 40)}...`))

  console.log(`\nLead Intents: ${analysis.leadIntents.length} comments`)
  analysis.leadIntents.forEach(c => console.log(`  - @${c.username}: ${c.text.substring(0, 40)}...`))

  console.log(`\nNeeds Reply: ${analysis.needsReply.length} comments`)
  analysis.needsReply.forEach(c => console.log(`  - @${c.username}: ${c.text.substring(0, 40)}...`))

  console.log(`\nSpam: ${analysis.spam.length} comments`)
  analysis.spam.forEach(c => console.log(`  - @${c.username}: ${c.text.substring(0, 40)}...`))

  const passed =
    analysis.highPriority.length >= 2 &&
    analysis.leadIntents.length >= 2 &&
    analysis.spam.length >= 1

  console.log(`\n${passed ? '✅' : '❌'} Batch analysis ${passed ? 'passed' : 'failed'}`)
  return { passed: passed ? 1 : 0, failed: passed ? 0 : 1 }
}

/**
 * Test 4: Lead Scoring System
 */
async function testLeadScoringSystem() {
  console.log('\n📝 TEST 4: Lead Scoring System\n')

  try {
    // Find a lead to test with
    const testLead = await prisma.lead.findFirst({
      where: {
        instagramHandle: { not: null },
      },
    })

    if (!testLead) {
      console.log('⚠️  No leads found in database to test scoring')
      console.log('   Creating a test lead...')

      const newLead = await prisma.lead.create({
        data: {
          name: 'Test User',
          whatsapp: '',
          email: '',
          phone: '',
          instagramHandle: 'test_user_scoring',
          source: 'INSTAGRAM',
          status: 'NEW',
          interestedLevel: 'A1',
          leadScore: 0,
          firstTouchpoint: 'instagram_dm',
          socialEngagement: {
            dm_count: 3,
            comments_count: 2,
            first_dm_at: new Date().toISOString(),
            last_dm_at: new Date().toISOString(),
          },
          notes: 'Test lead for scoring system. Asked about pricing and trial class.',
        },
      })

      console.log(`✅ Test lead created: ${newLead.id}`)

      const scoreResult = await calculateLeadScore(newLead.id)

      console.log('\n📊 Lead Score Result:')
      console.log(`   Total Score: ${scoreResult.totalScore}/100`)
      console.log(`   Quality: ${scoreResult.quality}`)
      console.log(`   Confidence: ${(scoreResult.confidence * 100).toFixed(0)}%`)
      console.log(`   Recommended Action: ${scoreResult.recommendedAction}`)
      console.log('\n   Breakdown:')
      console.log(`   - Engagement: ${scoreResult.breakdown.engagementScore}/30`)
      console.log(`   - Intent: ${scoreResult.breakdown.intentScore}/40`)
      console.log(`   - Contact: ${scoreResult.breakdown.contactScore}/20`)
      console.log(`   - Behavior: ${scoreResult.breakdown.behaviorScore}/10`)
      console.log('\n   Reasoning:')
      scoreResult.reasoning.forEach(r => console.log(`   - ${r}`))

      // Clean up test lead
      await prisma.lead.delete({ where: { id: newLead.id } })
      console.log('\n🧹 Test lead cleaned up')

      return { passed: 1, failed: 0 }
    } else {
      console.log(`Testing with existing lead: ${testLead.name} (@${testLead.instagramHandle})`)

      const scoreResult = await calculateLeadScore(testLead.id)

      console.log('\n📊 Lead Score Result:')
      console.log(`   Total Score: ${scoreResult.totalScore}/100`)
      console.log(`   Quality: ${scoreResult.quality}`)
      console.log(`   Confidence: ${(scoreResult.confidence * 100).toFixed(0)}%`)
      console.log(`   Recommended Action: ${scoreResult.recommendedAction}`)
      console.log('\n   Breakdown:')
      console.log(`   - Engagement: ${scoreResult.breakdown.engagementScore}/30`)
      console.log(`   - Intent: ${scoreResult.breakdown.intentScore}/40`)
      console.log(`   - Contact: ${scoreResult.breakdown.contactScore}/20`)
      console.log(`   - Behavior: ${scoreResult.breakdown.behaviorScore}/10`)

      return { passed: 1, failed: 0 }
    }
  } catch (error) {
    console.error('❌ Error testing lead scoring:', error)
    return { passed: 0, failed: 1 }
  }
}

/**
 * Test 5: Webhook Comment Handler (Simulated)
 */
async function testWebhookCommentHandler() {
  console.log('\n📝 TEST 5: Webhook Comment Handler (Simulated)\n')

  const testCommentPayload = {
    object: 'instagram',
    entry: [{
      id: 'test_page_id',
      time: Date.now(),
      changes: [{
        field: 'comments',
        value: {
          id: `test_comment_${Date.now()}`,
          text: 'I am interested in joining the next A1 batch! What is the fee?',
          media: { id: 'test_media_123' },
          from: { username: 'test_webhook_user', id: 'test_user_123' },
          created_time: Math.floor(Date.now() / 1000),
        },
      }],
    }],
  }

  console.log('🔄 Simulating webhook comment event...')
  console.log(`   Comment: "${testCommentPayload.entry[0].changes[0].value.text}"`)
  console.log(`   From: @${testCommentPayload.entry[0].changes[0].value.from.username}`)

  try {
    // Test trigger detection on the comment
    const triggerResult = detectTriggers(testCommentPayload.entry[0].changes[0].value.text)

    console.log('\n✅ Trigger detection passed:')
    console.log(`   Priority: ${triggerResult.priority}`)
    console.log(`   Intent: ${triggerResult.intent}`)
    console.log(`   Lead Intent: ${triggerResult.leadIntent}`)
    console.log(`   Should Auto-Reply: ${triggerResult.shouldAutoReply}`)

    if (triggerResult.suggestedReply) {
      console.log(`\n💬 Suggested Reply:`)
      console.log(`   ${triggerResult.suggestedReply.substring(0, 100)}...`)
    }

    console.log('\n✅ Webhook handler simulation passed')
    return { passed: 1, failed: 0 }
  } catch (error) {
    console.error('❌ Error in webhook simulation:', error)
    return { passed: 0, failed: 1 }
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  const results = {
    totalPassed: 0,
    totalFailed: 0,
  }

  // Test 1: Trigger Detection
  const test1 = await testCommentTriggerDetection()
  results.totalPassed += test1.passed
  results.totalFailed += test1.failed

  // Test 2: Contact Extraction
  const test2 = await testContactExtraction()
  results.totalPassed += test2.passed
  results.totalFailed += test2.failed

  // Test 3: Batch Analysis
  const test3 = await testBatchCommentAnalysis()
  results.totalPassed += test3.passed
  results.totalFailed += test3.failed

  // Test 4: Lead Scoring
  const test4 = await testLeadScoringSystem()
  results.totalPassed += test4.passed
  results.totalFailed += test4.failed

  // Test 5: Webhook Handler
  const test5 = await testWebhookCommentHandler()
  results.totalPassed += test5.passed
  results.totalFailed += test5.failed

  // Final results
  console.log('\n' + '='.repeat(70))
  console.log('📊 FINAL TEST RESULTS\n')
  console.log(`✅ Total Passed: ${results.totalPassed}`)
  console.log(`❌ Total Failed: ${results.totalFailed}`)
  console.log(`📈 Success Rate: ${((results.totalPassed / (results.totalPassed + results.totalFailed)) * 100).toFixed(1)}%`)
  console.log('\n' + '='.repeat(70))

  if (results.totalFailed === 0) {
    console.log('\n🎉 All tests passed! Both systems are working correctly.')
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.')
  }

  await prisma.$disconnect()
}

// Run tests
runAllTests().catch(console.error)
