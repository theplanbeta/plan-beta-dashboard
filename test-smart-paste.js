// Test Smart Paste AI parsing locally
const { GoogleGenerativeAI } = require("@google/generative-ai")

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyBzYmqDxD_f3n2Np3zoGVc4kmQTxkm5bqY")

async function testSmartParse() {
  console.log("🧪 Testing Smart Paste AI Parser...\n")

  const testCases = [
    {
      name: "Instagram DM",
      text: `Hey I'm Priya from Trivandrum
interested in learning german for B1 level
my number is 9876543210
saw your instagram post
email: priya.k@gmail.com
want to join in January batch`
    },
    {
      name: "WhatsApp Message",
      text: `Rahul Sharma
+91 9988776655
rahul@gmail.com
Interested in A1 course
From Kerala
Saw Facebook ad`
    },
    {
      name: "Messy Notes",
      text: `Name: Anjali
Ph: 8899001122
A2 level
from Kochi
wants spoken german course
email anjali.nair@yahoo.com
referral from friend`
    },
    {
      name: "Minimal Info",
      text: `Vikram 9876543210 wants to learn German`
    }
  ]

  for (const testCase of testCases) {
    console.log(`📝 Test Case: ${testCase.name}`)
    console.log(`Input:\n${testCase.text}\n`)

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" })

      const prompt = `You are an expert data extractor for a German language school in India.
Extract structured lead information from the following unstructured text.

Text: """
${testCase.text}
"""

Extract and return ONLY a valid JSON object with these fields:
{
  "name": "Full name of the person (string, required)",
  "whatsapp": "Phone number with country code if available, otherwise just the number (string)",
  "email": "Email address if found (string or null)",
  "source": "Where the lead came from - must be one of: INSTAGRAM, FACEBOOK, WHATSAPP, GOOGLE_ADS, WORD_OF_MOUTH, WALK_IN, OTHER (default to OTHER if unclear)",
  "interestedLevel": "Course level they're interested in - must be one of: A1, A1_HYBRID, A2, B1, B2, SPOKEN_GERMAN or null",
  "notes": "Any additional context, comments, or information (string)"
}

IMPORTANT RULES:
1. Return ONLY valid JSON, no markdown formatting, no backticks, no extra text
2. If a field is not found, use null (except source which defaults to "OTHER")
3. For interestedLevel, look for keywords like "A1", "A2", "B1", "B2", "beginner", "intermediate", "spoken", "hybrid"
4. For source, look for mentions of "Instagram", "Facebook", "WhatsApp", "Google", "friend", "referral", "walked in", etc.
5. Clean phone numbers: remove spaces, dashes, parentheses. Add +91 prefix if it's an Indian number without country code
6. Extract location/city information into notes if found
7. If multiple pieces of information are unclear, make your best educated guess based on context

Return the JSON object now:`

      const result = await model.generateContent(prompt)
      const response = result.response
      const aiText = response.text()

      // Clean the response
      let cleanedText = aiText.trim()
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.replace(/```json\n?/g, "").replace(/```\n?/g, "")
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/```\n?/g, "")
      }

      const parsedData = JSON.parse(cleanedText)

      console.log("✅ AI Output:")
      console.log(JSON.stringify(parsedData, null, 2))
      console.log("\n" + "=".repeat(80) + "\n")

    } catch (error) {
      console.error("❌ Error:", error.message)
      console.log("\n" + "=".repeat(80) + "\n")
    }

    // Wait a bit between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log("✅ All tests completed!")
}

testSmartParse().catch(console.error)
