/**
 * Test Tasker → n8n connection
 * Simulates what Tasker sends when Instagram notification arrives
 */

async function testTasker() {
  console.log("🧪 Testing Tasker → n8n connection...")

  const payload = {
    senderName: "Test Instagram User",
    messagePreview: "Hello, I'm interested in learning German!",
    notificationType: "MESSAGE",
    timestamp: new Date().toISOString(),
    secret: "planbeta_tasker_instagram_2024_secure"
  }

  console.log("\n📤 Sending to n8n webhook:")
  console.log(JSON.stringify(payload, null, 2))

  try {
    const response = await fetch("http://192.168.29.10:5678/webhook/tasker", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (response.ok) {
      console.log("\n✅ SUCCESS!")
      console.log("Response from n8n:")
      console.log(JSON.stringify(data, null, 2))
      console.log("\n🎉 Check n8n executions: http://localhost:5678 → Executions")
      console.log("🎉 Check your dashboard: http://localhost:3001/dashboard/leads")
    } else {
      console.log("\n❌ ERROR!")
      console.log("Status:", response.status)
      console.log("Response:", JSON.stringify(data, null, 2))
    }
  } catch (error) {
    console.error("\n❌ Network error:", error)
    console.log("\n💡 Make sure:")
    console.log("   1. n8n is running (docker ps | grep n8n)")
    console.log("   2. Workflow is ACTIVE in n8n")
    console.log("   3. Your Mac and phone are on same WiFi")
  }
}

testTasker()
