"use client"

import { useState, useRef, useEffect } from "react"
import { trackEvent } from "@/lib/tracking"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  options?: { label: string; value: string }[]
}

// Course recommendation logic
const courseRecommendations = {
  beginner: {
    live: { course: "a1-live", name: "German A1 Live", price: 14000 },
    selfPaced: { course: "a1-foundation", name: "German A1 Foundation", price: 10000 },
  },
  elementary: {
    live: { course: "a2-live", name: "German A2 Live", price: 16000 },
  },
  intermediate: {
    live: { course: "b1-live", name: "German B1 Live", price: 18000 },
  },
}

const initialMessage: Message = {
  id: "1",
  role: "assistant",
  content: "Hi! I'm here to help you find the perfect German course. What brings you to Plan Beta today?",
  options: [
    { label: "I want to learn German from scratch", value: "beginner" },
    { label: "I know some German and want to improve", value: "improve" },
    { label: "I need German for work/career", value: "career" },
    { label: "I have questions about courses", value: "questions" },
  ],
}

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([initialMessage])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  const addMessage = (message: Omit<Message, "id">) => {
    const newMessage = { ...message, id: Date.now().toString() }
    setMessages((prev) => [...prev, newMessage])
  }

  const simulateTyping = async (response: Omit<Message, "id">) => {
    setIsTyping(true)
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500))
    setIsTyping(false)
    addMessage(response)
  }

  const handleOptionClick = async (value: string) => {
    // Add user message
    const optionLabel = messages[messages.length - 1].options?.find((o) => o.value === value)?.label
    if (optionLabel) {
      addMessage({ role: "user", content: optionLabel })
    }

    // Track interaction
    trackEvent("chatbot_interaction", { step: value, selection: optionLabel || value })

    // Generate response based on selection
    let response: Omit<Message, "id">

    switch (value) {
      case "beginner":
        response = {
          role: "assistant",
          content: "Great choice! Starting from zero is exciting. We have two options for beginners:\n\n1️⃣ **A1 Live Classes** - Interactive live sessions 5 days/week for 8 weeks. Perfect if you like structured learning with a teacher.\n\n2️⃣ **A1 Foundation** - Self-paced course with video lessons in Malayalam. Great if you prefer flexibility.\n\nWhich learning style suits you better?",
          options: [
            { label: "I prefer live classes with a teacher", value: "prefer_live" },
            { label: "I want to learn at my own pace", value: "prefer_selfpaced" },
            { label: "I'm not sure yet", value: "unsure_style" },
          ],
        }
        break

      case "improve":
        response = {
          role: "assistant",
          content: "Great! What level have you already completed?",
          options: [
            { label: "I completed A1", value: "completed_a1" },
            { label: "I completed A2", value: "completed_a2" },
            { label: "I'm not sure of my level", value: "unsure_level" },
          ],
        }
        break

      case "career":
        response = {
          role: "assistant",
          content: "Great goal! Which field are you in?",
          options: [
            { label: "Nursing / Healthcare", value: "career_nursing" },
            { label: "IT / Technology", value: "career_it" },
            { label: "Engineering", value: "career_engineering" },
            { label: "Other", value: "career_other" },
          ],
        }
        break

      case "questions":
        response = {
          role: "assistant",
          content: "I'm happy to help! What would you like to know?",
          options: [
            { label: "Course pricing and duration", value: "q_pricing" },
            { label: "Class timings and schedule", value: "q_timing" },
            { label: "Certification and exams", value: "q_certification" },
            { label: "Something else", value: "q_other" },
          ],
        }
        break

      case "prefer_live":
        response = {
          role: "assistant",
          content: "The **A1 Live Classes** would be perfect for you!\n\n✅ Live sessions 5 days/week\n✅ Small batch (max 15 students)\n✅ All recordings included\n✅ Direct doubt clearing\n✅ Certificate on completion\n\nWould you like to enquire about enrolling?",
          options: [
            { label: "Yes, I'm interested!", value: "book_trial" },
            { label: "Tell me more about the course", value: "more_a1_live" },
            { label: "What about morning vs evening?", value: "q_timing" },
          ],
        }
        break

      case "prefer_selfpaced":
        response = {
          role: "assistant",
          content: "The **A1 Foundation Course** is great for self-learners!\n\n✅ 50+ video lessons\n✅ Malayalam explanations\n✅ Practice exercises\n✅ 3 months access\n✅ Learn anytime, anywhere\n\nWould you like to see a free preview of the course?",
          options: [
            { label: "Yes, show me a preview!", value: "preview_foundation" },
            { label: "What if I get stuck?", value: "support_selfpaced" },
            { label: "Can I switch to live classes later?", value: "upgrade_live" },
          ],
        }
        break

      case "completed_a1":
        response = {
          role: "assistant",
          content: "Perfect! **A2 Live Classes** is your next step.\n\n✅ Builds on A1 foundation\n✅ More conversation practice\n✅ Grammar deep-dive\n✅ 10 weeks duration\n\nWould you like to enquire about enrolling?",
          options: [
            { label: "Yes, I'm interested!", value: "book_trial" },
            { label: "What topics are covered in A2?", value: "topics_a2" },
          ],
        }
        break

      case "completed_a2":
        response = {
          role: "assistant",
          content: "Excellent! You're ready for **B1 Live Classes** - the level required for most work visas!\n\n✅ Achieve intermediate fluency\n✅ Business German module\n✅ Goethe B1 exam prep\n✅ 12 weeks duration\n\nWould you like to enquire about enrolling?",
          options: [
            { label: "Yes, I'm interested!", value: "book_trial" },
            { label: "Tell me about B1 exam prep", value: "exam_b1" },
          ],
        }
        break

      case "career_nursing":
        response = {
          role: "assistant",
          content: "For nursing in Germany, you'll need **B1 level** German.\n\n🏥 Germany has 200,000+ unfilled nursing positions\n💰 Salary: €2,800 - €4,500/month\n📋 Requirement: B1 German + Nursing degree\n\nI recommend starting with our A1→A2→B1 path. It takes about 8-10 months with consistent effort.\n\nWe also offer **Nursing Career Mentorship** with nurses already working in Germany!\n\nWould you like to start with A1?",
          options: [
            { label: "Yes, start with A1", value: "beginner" },
            { label: "Tell me about mentorship", value: "mentorship_nursing" },
            { label: "I already know some German", value: "improve" },
          ],
        }
        break

      case "career_it":
        response = {
          role: "assistant",
          content: "Good news! Many German tech companies work in English, but German gives you a huge advantage.\n\n💻 Berlin, Munich & Hamburg are major tech hubs\n💰 Salary: €4,500 - €8,000/month\n📋 B1 German is ideal (some roles accept A2)\n\nWe also offer **IT Career Mentorship** with tech professionals in Germany!\n\nWhere would you like to start?",
          options: [
            { label: "Start from scratch (A1)", value: "beginner" },
            { label: "I know basics, need to improve", value: "improve" },
            { label: "Tell me about IT mentorship", value: "mentorship_it" },
          ],
        }
        break

      case "q_pricing":
        response = {
          role: "assistant",
          content: "We offer courses at every level:\n\n**Live Classes:**\n• A1 (8 weeks) • A2 (10 weeks) • B1 (12 weeks)\n\n**Self-paced:**\n• A1 Foundation (3 months access)\n\n**Add-ons:**\n• Speaking sessions • Career mentorship\n\nAll courses include certificates. Contact our team for detailed pricing and EMI options!\n\nAnything else you'd like to know?",
          options: [
            { label: "Tell me about EMI options", value: "emi" },
            { label: "What's included in live classes?", value: "live_features" },
            { label: "I'm ready to enroll!", value: "book_trial" },
          ],
        }
        break

      case "q_timing":
        response = {
          role: "assistant",
          content: "We offer two batch timings:\n\n🌅 **Morning Batch:** 7:00 AM - 8:30 AM IST\n🌆 **Evening Batch:** 5:00 PM - 6:30 PM IST\n\nClasses run Monday to Friday. All sessions are recorded, so if you miss one, you can watch it later!\n\nWhich timing works better for you?",
          options: [
            { label: "Morning works for me", value: "morning_batch" },
            { label: "Evening is better", value: "evening_batch" },
            { label: "I need more flexibility", value: "prefer_selfpaced" },
          ],
        }
        break

      case "q_certification":
        response = {
          role: "assistant",
          content: "Upon course completion, you receive:\n\n📜 **Plan Beta Certificate** - Recognized by employers\n📝 **Goethe Exam Prep** - We prepare you for the official Goethe-Institut exam\n\nThe Goethe-Zertifikat is the gold standard recognized worldwide. While we provide comprehensive prep, you take the official exam at a Goethe center.\n\nOur students have a **95% first-attempt pass rate**!\n\nWant to know more about exam preparation?",
          options: [
            { label: "How do you prepare for exams?", value: "exam_prep" },
            { label: "Where can I take the Goethe exam?", value: "goethe_centers" },
            { label: "I'm ready to start!", value: "book_trial" },
          ],
        }
        break

      case "book_trial":
        response = {
          role: "assistant",
          content: "Excellent! Let me connect you with our team. You can:\n\n1️⃣ **Fill out our contact form** - We'll call you within 24 hours\n\n2️⃣ **WhatsApp us directly** - Get instant response\n\nWhich would you prefer?",
          options: [
            { label: "Take me to contact form", value: "goto_contact" },
            { label: "Chat on WhatsApp", value: "goto_whatsapp" },
          ],
        }
        break

      case "goto_contact":
        trackEvent("chatbot_completed", { cta: "contact_form" })
        window.location.href = "/site/contact"
        return

      case "goto_whatsapp":
        trackEvent("chatbot_completed", { cta: "whatsapp" })
        window.open(
          "https://wa.me/918547081550?text=Hi%20Plan%20Beta!%20I'm%20interested%20in%20your%20German%20courses.",
          "_blank"
        )
        response = {
          role: "assistant",
          content: "I've opened WhatsApp for you! Our team typically responds within minutes during business hours (9 AM - 8 PM IST).\n\nIs there anything else I can help you with?",
          options: [
            { label: "Tell me more about courses", value: "questions" },
            { label: "That's all, thanks!", value: "goodbye" },
          ],
        }
        break

      case "goodbye":
        response = {
          role: "assistant",
          content: "You're welcome! Good luck with your German learning journey. Remember, the first step is always the hardest, but it's also the most important.\n\n**Bis bald!** (See you soon!) 🇩🇪",
        }
        break

      default:
        response = {
          role: "assistant",
          content: "I'd be happy to help with that! For more detailed information, I'd recommend getting in touch with our team. They can answer all your questions personally.\n\nWould you like to schedule a call?",
          options: [
            { label: "Yes, schedule a call", value: "book_trial" },
            { label: "I have other questions", value: "questions" },
          ],
        }
    }

    await simulateTyping(response)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    addMessage({ role: "user", content: input })
    setInput("")

    // Simple response for free-text input
    await simulateTyping({
      role: "assistant",
      content: "Thanks for your message! For personalized help, I'd recommend connecting with our team directly. They can answer all your specific questions.\n\nWould you like to get in touch?",
      options: [
        { label: "Yes, contact the team", value: "book_trial" },
        { label: "Show me course options", value: "questions" },
      ],
    })
  }

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => { setIsOpen(true); trackEvent("chatbot_opened") }}
        className={`fixed bottom-24 right-6 z-40 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary-dark transition-all hover:scale-110 ${
          isOpen ? "hidden" : ""
        }`}
        aria-label="Open chat assistant"
      >
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        {/* Notification dot */}
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-primary px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-xl">🤖</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">Plan Beta Assistant</h3>
                <p className="text-xs text-red-100">Here to help you find the right course</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-1"
              aria-label="Close chat"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px] min-h-[300px]">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-white rounded-br-md"
                      : "bg-gray-100 text-gray-800 rounded-bl-md"
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{message.content}</p>

                  {/* Options */}
                  {message.options && message.role === "assistant" && (
                    <div className="mt-3 space-y-2">
                      {message.options.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleOptionClick(option.value)}
                          className="w-full text-left px-3 py-2 bg-white rounded-lg text-sm text-gray-700 hover:bg-gray-50 border border-gray-200 transition-colors"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
