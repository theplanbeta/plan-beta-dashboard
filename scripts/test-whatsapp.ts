/**
 * Test WhatsApp Business Cloud API
 * Sends a test message to verify API is working
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(__dirname, '../.env') })

async function testWhatsApp() {
  const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
  const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
  const TO_NUMBER = "491753861997" // German number (without +)

  console.log("🔄 Testing WhatsApp API...")
  console.log("📞 Phone Number ID:", WHATSAPP_PHONE_NUMBER_ID)
  console.log("📱 Sending to:", TO_NUMBER)

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: TO_NUMBER,
          type: "template",
          template: {
            name: "hello_world",
            language: {
              code: "en_US",
            },
          },
        }),
      }
    )

    const data = await response.json()

    if (response.ok) {
      console.log("✅ SUCCESS! Message sent!")
      console.log("📨 Message ID:", data.messages?.[0]?.id)
      console.log("\n🎉 Check your WhatsApp now! You should receive a 'Hello World' message.")
    } else {
      console.log("❌ ERROR sending message:")
      console.log(JSON.stringify(data, null, 2))

      if (data.error?.code === 100) {
        console.log("\n💡 This error usually means:")
        console.log("   1. The phone number needs to be registered as a test recipient")
        console.log("   2. Or you need to verify your WhatsApp Business account")
      }
    }
  } catch (error) {
    console.error("❌ Network error:", error)
  }
}

testWhatsApp()
