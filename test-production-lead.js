/**
 * Test script to verify lead creation on production
 * Run with: node test-production-lead.js
 */

const PRODUCTION_URL = 'https://plan-beta-dashboard-q25i9u1ny-theplanbetas-projects.vercel.app'

async function testLeadCreation() {
  console.log('🧪 Testing Lead Creation on Production\n')
  console.log('Base URL:', PRODUCTION_URL)
  console.log('=' .repeat(60))

  // Step 1: Login
  console.log('\n1️⃣ Attempting login...')

  try {
    const loginResponse = await fetch(`${PRODUCTION_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: 'marketing@planbeta.in',
        password: 'marketing123',
        csrfToken: '',
        callbackUrl: `${PRODUCTION_URL}/dashboard`,
        json: 'true'
      })
    })

    console.log('Login response status:', loginResponse.status)

    // Get session cookie
    const cookies = loginResponse.headers.get('set-cookie')
    console.log('Cookies received:', cookies ? 'Yes' : 'No')

    if (!cookies) {
      console.log('\n❌ No session cookie received from login')
      console.log('This might be expected - NextAuth uses httpOnly cookies')
      console.log('\n💡 Manual test required:')
      console.log('1. Open:', `${PRODUCTION_URL}/login`)
      console.log('2. Login with: marketing@planbeta.in / marketing123')
      console.log('3. Go to:', `${PRODUCTION_URL}/test-validation.html`)
      console.log('4. Click "Test Lead Creation"')
      return
    }

    // Step 2: Create Lead
    console.log('\n2️⃣ Creating test lead...')

    const leadData = {
      name: 'Test User from Script',
      whatsapp: '+919876543210',
      email: 'test@example.com',
      phone: '+919876543210',
      source: 'INSTAGRAM',
      quality: 'WARM',
      status: 'NEW',
      interestedLevel: '',
      interestedType: '',
      interestedMonth: '',
      interestedBatchTime: '',
      notes: 'Created by automated test script'
    }

    console.log('Payload:', JSON.stringify(leadData, null, 2))

    const leadResponse = await fetch(`${PRODUCTION_URL}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify(leadData)
    })

    console.log('\nLead creation response status:', leadResponse.status)

    const responseData = await leadResponse.json()
    console.log('Response:', JSON.stringify(responseData, null, 2))

    if (leadResponse.ok) {
      console.log('\n✅ SUCCESS! Lead created with ID:', responseData.id)
    } else {
      console.log('\n❌ FAILED!')
      if (leadResponse.status === 401) {
        console.log('Reason: Authentication required')
        console.log('\n💡 Manual test required (cookies not working):')
        console.log('1. Open:', `${PRODUCTION_URL}/login`)
        console.log('2. Login with: marketing@planbeta.in / marketing123')
        console.log('3. Go to:', `${PRODUCTION_URL}/test-validation.html`)
        console.log('4. Click "Test Lead Creation"')
      } else if (leadResponse.status === 400) {
        console.log('Reason: Validation failed')
        console.log('Details:', responseData.details)
      } else {
        console.log('Reason:', responseData.error || 'Unknown')
      }
    }

  } catch (error) {
    console.error('\n❌ Error during test:', error.message)
  }

  console.log('\n' + '='.repeat(60))
}

// Run test
testLeadCreation()
