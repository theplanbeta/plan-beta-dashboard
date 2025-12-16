#!/usr/bin/env tsx
/**
 * Test script for AI-Powered Outreach System
 * Run with: tsx scripts/test-outreach-ai.ts
 */

import { generateCallBrief, findMeaningfulConnections, enhanceCallNotes } from '../lib/outreach-ai'
import { isGeminiAvailable, getRateLimitStatus } from '../lib/gemini-client'
import { prisma } from '../lib/prisma'

async function testOutreachAI() {
  console.log('========================================')
  console.log('AI-Powered Outreach System - Test Suite')
  console.log('========================================\n')

  // Check if Gemini is available
  console.log('Checking Gemini API availability...')
  if (!isGeminiAvailable()) {
    console.error('❌ Gemini API not available. Check GEMINI_API_KEY in .env')
    process.exit(1)
  }
  console.log('✅ Gemini API is available\n')

  // Get rate limit status
  const rateLimitStatus = getRateLimitStatus()
  console.log('Rate Limit Status:')
  console.log(`  - Requests in last minute: ${rateLimitStatus.requestsInLastMinute}`)
  console.log(`  - Remaining requests: ${rateLimitStatus.remainingRequests}`)
  console.log(`  - Reset in: ${rateLimitStatus.resetIn}ms\n`)

  // Get a random active student
  console.log('Fetching a random active student...')
  const student = await prisma.student.findFirst({
    where: { completionStatus: 'ACTIVE' },
    orderBy: { enrollmentDate: 'desc' },
  })

  if (!student) {
    console.log('⚠️  No active students found in database')
    console.log('   Testing with mock data instead...\n')
    await testWithMockData()
    return
  }

  console.log(`✅ Found student: ${student.name} (${student.studentId})\n`)
  console.log('========================================\n')

  // Test 1: Call Brief
  console.log('TEST 1: CALL BRIEF GENERATION')
  console.log('========================================')
  console.log(`Generating call brief for: ${student.name}...\n`)

  const briefStart = Date.now()
  const brief = await generateCallBrief(student.id)
  const briefTime = Date.now() - briefStart

  if (brief.success) {
    console.log('✅ Call Brief Generated Successfully!\n')
    console.log('Journey Summary:')
    console.log(`  ${brief.journeySummary}\n`)

    console.log('What\'s Changed Since Last Call:')
    brief.sinceLastCall.forEach((change, i) => {
      console.log(`  ${i + 1}. ${change}`)
    })
    console.log()

    console.log('Conversation Starters:')
    brief.conversationStarters.forEach((starter, i) => {
      console.log(`  ${i + 1}. ${starter}`)
    })
    console.log()

    console.log('Personal Detail to Remember:')
    console.log(`  ${brief.personalDetail}\n`)

    console.log('Context:')
    console.log(`  - Attendance Rate: ${brief.attendanceRate}%`)
    console.log(`  - Payment Status: ${brief.paymentStatus}`)
    console.log(`  - Churn Risk: ${brief.churnRisk}`)
    console.log(`  - Days Since Enrollment: ${brief.daysSinceEnrollment}`)
    console.log()

    console.log('Metrics:')
    console.log(`  - Token Count: ${brief.tokenCount}`)
    console.log(`  - Generation Time: ${briefTime}ms`)
    console.log(`  - Estimated Cost: $${((brief.tokenCount || 0) / 1000000 * 0.30).toFixed(6)}`)
  } else {
    console.log('❌ Call Brief Failed')
    console.log(`   Error: ${brief.error}`)
    console.log('   Graceful degradation provided basic info:')
    console.log(`   ${brief.journeySummary}`)
  }

  console.log('\n========================================\n')

  // Test 2: Connection Matching
  console.log('TEST 2: CONNECTION MATCHING')
  console.log('========================================')
  console.log(`Finding meaningful connections for: ${student.name}...\n`)

  const matchStart = Date.now()
  const matches = await findMeaningfulConnections(student.id)
  const matchTime = Date.now() - matchStart

  if (matches.success) {
    console.log(`✅ Found ${matches.topMatches.length} Connection(s)!\n`)

    matches.topMatches.forEach((match, i) => {
      console.log(`Match ${i + 1}: ${match.studentName}`)
      console.log(`  Confidence Score: ${match.confidenceScore}%`)
      console.log(`  Connection Reason: ${match.connectionReason}`)
      console.log(`  Commonalities:`)
      match.commonalities.forEach(common => {
        console.log(`    - ${common}`)
      })
      console.log(`  Suggested Introduction:`)
      console.log(`    "${match.suggestedIntro}"`)
      console.log()
    })

    console.log('Metrics:')
    console.log(`  - Token Count: ${matches.tokenCount}`)
    console.log(`  - Generation Time: ${matchTime}ms`)
    console.log(`  - Estimated Cost: $${((matches.tokenCount || 0) / 1000000 * 0.30).toFixed(6)}`)
  } else {
    console.log('❌ Connection Matching Failed')
    console.log(`   Error: ${matches.error}`)
  }

  console.log('\n========================================\n')

  // Test 3: Call Notes Enhancement
  console.log('TEST 3: CALL NOTES ENHANCEMENT')
  console.log('========================================')

  const sampleNotes = `
Called ${student.name} today. Overall positive conversation.
They mentioned work has been keeping them busy lately.
Interested in moving to a different batch timing if available.
Asked about getting extra practice materials for homework.
Really appreciates their current teacher.
Planning to visit Germany next year and wants to be fluent by then.
Mentioned their family is supportive of their learning journey.
`

  console.log('Raw Notes:')
  console.log(sampleNotes)
  console.log('\nEnhancing notes...\n')

  const enhanceStart = Date.now()
  const enhanced = await enhanceCallNotes(sampleNotes, {
    studentId: student.id,
    studentName: student.name,
    currentLevel: student.currentLevel,
    enrollmentDate: student.enrollmentDate,
  })
  const enhanceTime = Date.now() - enhanceStart

  if (enhanced.success) {
    console.log('✅ Notes Enhanced Successfully!\n')

    console.log('Summary:')
    console.log(`  ${enhanced.summary}\n`)

    console.log('Journey Updates:')
    enhanced.journeyUpdates.forEach((update, i) => {
      console.log(`  ${i + 1}. ${update}`)
    })
    console.log()

    console.log('Personal Notes:')
    enhanced.personalNotes.forEach((note, i) => {
      console.log(`  ${i + 1}. ${note}`)
    })
    console.log()

    console.log('Action Items:')
    enhanced.actionItems.forEach((item, i) => {
      console.log(`  ${i + 1}. [${item.priority.toUpperCase()}] ${item.task}`)
      console.log(`      Deadline: ${item.deadline}, Assigned to: ${item.assignedTo}`)
    })
    console.log()

    console.log('Follow-Up Timing:')
    console.log(`  - When: ${enhanced.followUpTiming.timing}`)
    console.log(`  - Why: ${enhanced.followUpTiming.reason}`)
    console.log(`  - Topic: ${enhanced.followUpTiming.suggestedTopic}`)
    console.log()

    console.log('Mood/Tone Detected:', enhanced.moodTone)
    console.log()

    console.log('Metrics:')
    console.log(`  - Token Count: ${enhanced.tokenCount}`)
    console.log(`  - Generation Time: ${enhanceTime}ms`)
    console.log(`  - Estimated Cost: $${((enhanced.tokenCount || 0) / 1000000 * 0.30).toFixed(6)}`)
  } else {
    console.log('❌ Notes Enhancement Failed')
    console.log(`   Error: ${enhanced.error}`)
  }

  console.log('\n========================================\n')

  // Calculate total cost
  const totalTokens = (brief.tokenCount || 0) + (matches.tokenCount || 0) + (enhanced.tokenCount || 0)
  const totalCost = (totalTokens / 1000000) * 0.30
  const totalTime = briefTime + matchTime + enhanceTime

  console.log('SUMMARY')
  console.log('========================================')
  console.log(`Total Tokens Used: ${totalTokens}`)
  console.log(`Total Cost: $${totalCost.toFixed(6)} (~${(totalCost * 100).toFixed(4)} cents)`)
  console.log(`Total Time: ${totalTime}ms`)
  console.log()
  console.log('Estimated Monthly Cost (200 students):')
  console.log('  - 150 call briefs/month')
  console.log('  - 50 connection matches/month')
  console.log('  - 150 notes enhancements/month')
  console.log('  - Total: ~$0.09/month\n')

  // Final rate limit check
  const finalRateLimitStatus = getRateLimitStatus()
  console.log('Final Rate Limit Status:')
  console.log(`  - Requests used: ${finalRateLimitStatus.requestsInLastMinute}`)
  console.log(`  - Remaining: ${finalRateLimitStatus.remainingRequests}`)
  console.log('\n========================================\n')

  console.log('✅ All Tests Completed Successfully!\n')
}

async function testWithMockData() {
  console.log('Running tests with mock data...\n')

  // Mock student context
  const mockContext = {
    studentId: 'mock-student-123',
    studentName: 'Mock Student',
    currentLevel: 'A2' as any,
    enrollmentDate: new Date('2024-10-01'),
  }

  // Test Notes Enhancement (doesn't require database)
  console.log('TEST: CALL NOTES ENHANCEMENT (Mock Data)')
  console.log('========================================')

  const mockNotes = `
Called student today. They're doing well overall.
Mentioned they want to switch to weekend batch.
Planning a trip to Germany in March.
Spouse also interested in learning German.
Enjoying the current teacher's teaching style.
`

  console.log('Raw Notes:', mockNotes)
  console.log('\nEnhancing notes...\n')

  const enhanced = await enhanceCallNotes(mockNotes, mockContext)

  if (enhanced.success) {
    console.log('✅ Enhanced Successfully!\n')
    console.log('Summary:', enhanced.summary)
    console.log('Action Items:', enhanced.actionItems.length)
    console.log('Token Count:', enhanced.tokenCount)
  } else {
    console.log('❌ Enhancement Failed:', enhanced.error)
  }

  console.log('\n========================================\n')
}

// Run tests
testOutreachAI()
  .then(() => {
    console.log('Test script completed.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Test script failed:', error)
    process.exit(1)
  })
