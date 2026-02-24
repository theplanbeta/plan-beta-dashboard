"use client"

import { useEffect, useState } from "react"

interface WhatsAppMessage {
  id: string
  direction: string
  phoneNumber: string
  templateName: string | null
  messageText: string | null
  status: string
  createdAt: string
}

interface Props {
  leadId?: string
  studentId?: string
  phoneNumber?: string
}

export default function WhatsAppMessageLog({ leadId, studentId, phoneNumber }: Props) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams()
    if (leadId) params.set("leadId", leadId)
    if (studentId) params.set("studentId", studentId)
    if (phoneNumber) params.set("phoneNumber", phoneNumber)
    params.set("limit", "20")

    fetch(`/api/whatsapp/messages?${params}`)
      .then((res) => (res.ok ? res.json() : { messages: [] }))
      .then((data) => setMessages(data.messages || []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false))
  }, [leadId, studentId, phoneNumber])

  if (loading) {
    return (
      <div className="text-sm text-gray-500 py-4 text-center">
        Loading messages...
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-4 text-center">
        No WhatsApp messages yet
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    SENT: "bg-blue-100 text-blue-700",
    DELIVERED: "bg-green-100 text-green-700",
    READ: "bg-emerald-100 text-emerald-700",
    FAILED: "bg-red-100 text-red-700",
    RECEIVED: "bg-purple-100 text-purple-700",
  }

  return (
    <div className="space-y-2">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm"
        >
          {/* Direction icon */}
          <div className="flex-shrink-0 mt-0.5">
            {msg.direction === "OUTBOUND" ? (
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900 dark:text-white">
                {msg.templateName ? `Template: ${msg.templateName}` : "Text message"}
              </span>
              <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${statusColors[msg.status] || "bg-gray-100 text-gray-600"}`}>
                {msg.status}
              </span>
            </div>
            {msg.messageText && (
              <p className="text-gray-600 dark:text-gray-400 truncate">
                {msg.messageText}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {new Date(msg.createdAt).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {" \u00B7 "}
              {msg.phoneNumber}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
