import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function GET() {
  try {
    // Simple warmup - just initialize the model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" })

    // Quick test to warm up the connection
    const result = await model.generateContent("Hello")

    return NextResponse.json({
      status: "warm",
      timestamp: new Date().toISOString(),
      success: true
    })
  } catch (error) {
    console.error("Warmup error:", error)
    return NextResponse.json({
      status: "error",
      timestamp: new Date().toISOString(),
      success: false
    })
  }
}

// This allows the warmup to be called via a cron job
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
