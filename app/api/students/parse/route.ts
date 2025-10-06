import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { text } = await request.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      )
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" })

    const prompt = `You are an expert data extractor for a German language school in India.
Extract structured student information from the following unstructured text.

Text: """
${text}
"""

Extract and return ONLY a valid JSON object with these fields:
{
  "name": "Full name of the person (string, required)",
  "whatsapp": "Phone number with country code if available, otherwise just the number (string)",
  "email": "Email address if found (string or null)",
  "notes": "Any additional context, comments, or information (string)"
}

IMPORTANT RULES:
1. Return ONLY valid JSON, no markdown formatting, no backticks, no extra text
2. If a field is not found, use null (except notes which can be empty string)
3. Clean phone numbers: remove spaces, dashes, parentheses. Add +91 prefix if it's an Indian number without country code
4. Extract location/city information into notes if found
5. Extract any course level mentions (A1, A2, B1, B2) into notes
6. Extract payment/pricing info into notes if mentioned
7. If multiple pieces of information are unclear, make your best educated guess based on context

Return the JSON object now:`

    const result = await model.generateContent(prompt)
    const response = result.response
    const aiText = response.text()

    // Clean the response - remove markdown code blocks if present
    let cleanedText = aiText.trim()
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.replace(/```json\n?/g, "").replace(/```\n?/g, "")
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/```\n?/g, "")
    }

    // Parse the JSON
    const parsedData = JSON.parse(cleanedText)

    // Validate required field
    if (!parsedData.name) {
      return NextResponse.json(
        { error: "Could not extract a name from the text" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
    })
  } catch (error) {
    console.error("AI parsing error:", error)

    // Check if it's a JSON parse error
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again or enter data manually." },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: "Failed to parse student data. Please try again." },
      { status: 500 }
    )
  }
}
