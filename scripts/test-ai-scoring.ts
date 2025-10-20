/**
 * Test AI-enhanced lead scoring with multilingual messages
 */

import { analyzeLeadWithAI, enhanceScoreWithAI } from '../lib/lead-scoring/ai-lead-scorer'

async function testAIScoring() {
  console.log('🧪 Testing AI-Enhanced Lead Scoring\n')
  console.log('=' .repeat(70))

  // Test Case 1: Pure English
  console.log('\n📝 Test 1: English only')
  const englishTest = await analyzeLeadWithAI({
    comments: [
      { text: 'How much is the fee for A1 level?', createdAt: new Date() },
      { text: 'When does the next batch start?', createdAt: new Date() },
    ],
    messages: [
      { text: 'I want to enroll in German classes', createdAt: new Date() },
      { text: 'Can I get a trial class?', createdAt: new Date() },
    ],
    notes: 'Very interested, asked about pricing'
  })
  console.log('AI Analysis:', JSON.stringify(englishTest, null, 2))

  if (englishTest) {
    const enhanced = enhanceScoreWithAI(60, englishTest)
    console.log('\nScore Enhancement:')
    console.log(`  Base Score: 60`)
    console.log(`  AI Boost: ${enhanced.aiBoost}`)
    console.log(`  Final Score: ${enhanced.finalScore}`)
    console.log(`  Reasoning:`)
    enhanced.reasoning.forEach(r => console.log(`    - ${r}`))
  }

  // Test Case 2: Malayalam + English (Manglish)
  console.log('\n' + '='.repeat(70))
  console.log('\n📝 Test 2: Malayalam + English (Manglish)')
  const manglishTest = await analyzeLeadWithAI({
    comments: [
      { text: 'German class fee ethra aanu?', createdAt: new Date() },
      { text: 'Eppo aanu next batch start?', createdAt: new Date() },
    ],
    messages: [
      { text: 'Join cheyyan interested aanu', createdAt: new Date() },
      { text: 'Trial class undo?', createdAt: new Date() },
      { text: 'A1 level cheyyaan interested', createdAt: new Date() },
    ],
    notes: null
  })
  console.log('AI Analysis:', JSON.stringify(manglishTest, null, 2))

  if (manglishTest) {
    const enhanced = enhanceScoreWithAI(55, manglishTest)
    console.log('\nScore Enhancement:')
    console.log(`  Base Score: 55`)
    console.log(`  AI Boost: ${enhanced.aiBoost}`)
    console.log(`  Final Score: ${enhanced.finalScore}`)
    console.log(`  Reasoning:`)
    enhanced.reasoning.forEach(r => console.log(`    - ${r}`))
  }

  // Test Case 3: Low intent
  console.log('\n' + '='.repeat(70))
  console.log('\n📝 Test 3: Low intent / casual')
  const lowIntentTest = await analyzeLeadWithAI({
    comments: [
      { text: 'Nice video', createdAt: new Date() },
      { text: 'Good content', createdAt: new Date() },
    ],
    messages: [],
    notes: null
  })
  console.log('AI Analysis:', JSON.stringify(lowIntentTest, null, 2))

  if (lowIntentTest) {
    const enhanced = enhanceScoreWithAI(20, lowIntentTest)
    console.log('\nScore Enhancement:')
    console.log(`  Base Score: 20`)
    console.log(`  AI Boost: ${enhanced.aiBoost}`)
    console.log(`  Final Score: ${enhanced.finalScore}`)
    console.log(`  Reasoning:`)
    enhanced.reasoning.forEach(r => console.log(`    - ${r}`))
  }

  // Test Case 4: Pure Malayalam
  console.log('\n' + '='.repeat(70))
  console.log('\n📝 Test 4: Pure Malayalam')
  const malayalamTest = await analyzeLeadWithAI({
    comments: [],
    messages: [
      { text: 'ഫീസ് എത്ര ആണ്?', createdAt: new Date() },
      { text: 'എപ്പോൾ ആണ് ക്ലാസ്സ് തുടങ്ങുന്നത്?', createdAt: new Date() },
    ],
    notes: null
  })
  console.log('AI Analysis:', JSON.stringify(malayalamTest, null, 2))

  if (malayalamTest) {
    const enhanced = enhanceScoreWithAI(50, malayalamTest)
    console.log('\nScore Enhancement:')
    console.log(`  Base Score: 50`)
    console.log(`  AI Boost: ${enhanced.aiBoost}`)
    console.log(`  Final Score: ${enhanced.finalScore}`)
    console.log(`  Reasoning:`)
    enhanced.reasoning.forEach(r => console.log(`    - ${r}`))
  }

  console.log('\n' + '='.repeat(70))
  console.log('\n✅ AI Scoring Test Complete\n')
}

testAIScoring()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })
