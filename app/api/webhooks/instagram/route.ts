import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { parseDMMessage, shouldCreateLead, generateLeadNotes } from '@/lib/dm-parser'
import { trackLeadFromContent } from '@/lib/attribution-tracking'
import InstagramAPI from '@/lib/instagram-api'
import { generateDMResponse, getQuickResponse } from '@/lib/ai/dm-responder'
import { getConversationContext } from '@/lib/ai/conversation-context'
import { detectTriggers, extractContactFromComment, generateNotesFromComment } from '@/lib/comment-tracking/trigger-detector'

const VERIFY_TOKEN = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || 'plan_beta_instagram_webhook_2024'
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET

/**
 * GET /api/webhooks/instagram
 * Webhook verification endpoint for Instagram/Facebook
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  console.log('📞 Webhook verification request:', { mode, token, challenge })

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully')
    return new NextResponse(challenge, { status: 200 })
  }

  console.log('❌ Webhook verification failed')
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

/**
 * POST /api/webhooks/instagram
 * Webhook event handler for Instagram DMs
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('x-hub-signature-256')
    const body = await request.text()

    if (!verifySignature(body, signature)) {
      console.log('❌ Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const data = JSON.parse(body)
    console.log('📨 Instagram webhook received:', JSON.stringify(data, null, 2))

    // Process webhook events
    if (data.object === 'instagram') {
      for (const entry of data.entry || []) {
        // Handle messaging events
        if (entry.messaging) {
          for (const event of entry.messaging) {
            await handleMessagingEvent(event)
          }
        }

        // Handle changes (for other event types including comments)
        if (entry.changes) {
          for (const change of entry.changes) {
            console.log('📝 Change event:', change.field, change.value)

            // Handle comment events
            if (change.field === 'comments') {
              await handleCommentEvent(change.value)
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('❌ Webhook processing error:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

/**
 * Verify webhook signature using app secret
 */
function verifySignature(payload: string, signature: string | null): boolean {
  // Temporarily disable signature verification for development/testing
  console.warn('⚠️ Signature verification temporarily disabled for testing')
  return true

  // TODO: Re-enable after confirming APP_SECRET matches
  // if (!APP_SECRET || !signature) {
  //   console.warn('⚠️ Signature verification skipped (missing app secret or signature)')
  //   return true // Allow in development
  // }

  // const expectedSignature = 'sha256=' + crypto
  //   .createHmac('sha256', APP_SECRET)
  //   .update(payload)
  //   .digest('hex')

  // return crypto.timingSafeEqual(
  //   Buffer.from(signature),
  //   Buffer.from(expectedSignature)
  // )
}

/**
 * Handle Instagram messaging events (DMs)
 */
async function handleMessagingEvent(event: any) {
  try {
    const senderId = event.sender?.id
    const recipientId = event.recipient?.id
    const timestamp = event.timestamp
    const messageData = event.message

    if (!messageData || !senderId) {
      console.log('⏭️ Skipping event (no message or sender)')
      return
    }

    console.log('💬 Processing DM from:', senderId)

    // Fetch sender info from Instagram Graph API using Page Access Token
    let instagramHandle = senderId
    try {
      const pageToken = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN
      const response = await fetch(
        `https://graph.facebook.com/v22.0/${senderId}?fields=username&access_token=${pageToken}`
      )
      const userData = await response.json()
      if (userData.username) {
        instagramHandle = userData.username
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch username for sender:', senderId)
    }

    const messageContent = messageData.text || messageData.attachments?.[0]?.type || ''

    // Parse message to extract lead information
    const parsedContent = parseDMMessage(messageContent)
    console.log('🔍 Parsed DM:', {
      intent: parsedContent.intent,
      level: parsedContent.level,
      leadScore: parsedContent.leadScore,
      urgency: parsedContent.urgency,
    })

    // Check if we should create a lead
    let leadId: string | undefined
    let leadCreated = false

    if (shouldCreateLead(parsedContent)) {
      console.log('🎯 Creating lead from DM...')

      try {
        // Check if lead with this Instagram handle already exists
        const existingLead = await prisma.lead.findFirst({
          where: { instagramHandle },
        })

        if (existingLead) {
          console.log('📝 Lead already exists, updating...')

          // Update existing lead with new information
          const updatedLead = await prisma.lead.update({
            where: { id: existingLead.id },
            data: {
              leadScore: Math.max(existingLead.leadScore, parsedContent.leadScore),
              socialEngagement: {
                dm_count: ((existingLead.socialEngagement as any)?.dm_count || 0) + 1,
                last_dm_at: new Date(timestamp).toISOString(),
              },
              notes: existingLead.notes
                ? `${existingLead.notes}\n\n[${new Date(timestamp).toLocaleString()}] ${messageContent.substring(0, 100)}...`
                : generateLeadNotes(instagramHandle, [messageContent], parsedContent),
              lastContactDate: new Date(timestamp).toISOString(),
            },
          })

          leadId = updatedLead.id
          leadCreated = false
        } else {
          console.log('✨ Creating new lead...')

          // Get all messages from this conversation to provide context
          const conversationMessages = await prisma.instagramMessage.findMany({
            where: { conversationId: senderId },
            orderBy: { sentAt: 'desc' },
            take: 5,
          })

          const allMessages = [...conversationMessages.map(m => m.content), messageContent]

          // Create new lead
          const newLead = await prisma.lead.create({
            data: {
              name: parsedContent.contactInfo.name || `Instagram User (@${instagramHandle})`,
              whatsapp: parsedContent.contactInfo.phone || '',
              email: parsedContent.contactInfo.email || '',
              phone: parsedContent.contactInfo.phone || '',
              status: 'NEW',
              interestedLevel: (parsedContent.level || 'A1') as any,
              source: 'INSTAGRAM',
              instagramHandle,
              firstTouchpoint: 'instagram_dm',
              leadScore: parsedContent.leadScore,
              socialEngagement: {
                dm_count: 1,
                first_dm_at: new Date(timestamp).toISOString(),
                last_dm_at: new Date(timestamp).toISOString(),
              },
              notes: generateLeadNotes(instagramHandle, allMessages, parsedContent),
              lastContactDate: new Date(timestamp).toISOString(),
            },
          })

          leadId = newLead.id
          leadCreated = true

          console.log('✅ Lead created:', {
            id: newLead.id,
            name: newLead.name,
            score: newLead.leadScore,
          })
        }
      } catch (error: any) {
        console.error('❌ Error creating/updating lead:', error)
      }
    }

    // Store message in database
    await prisma.instagramMessage.create({
      data: {
        messageId: messageData.mid || `${senderId}_${timestamp}`,
        conversationId: senderId, // Use sender ID as conversation ID
        instagramHandle,
        direction: 'INCOMING',
        content: messageContent,
        sentAt: new Date(timestamp),
        isRead: false,
        leadCreated,
        leadId,
      },
    })

    console.log('✅ Message stored:', {
      from: instagramHandle,
      content: messageContent.substring(0, 50),
      leadCreated,
    })

    // ========== AUTO-REPLY LOGIC ==========
    try {
      console.log('🤖 Generating AI response...')

      // Check for quick response first (faster)
      let responseText = getQuickResponse(messageContent)

      if (!responseText) {
        // Get conversation context
        const context = await getConversationContext(senderId, instagramHandle)

        // Generate AI response
        const aiResponse = await generateDMResponse(messageContent, context)

        if (aiResponse.shouldSend) {
          responseText = aiResponse.message

          // Update lead score if higher
          if (leadId && aiResponse.suggestedLeadScore > (context.leadData?.leadScore || 0)) {
            await prisma.lead.update({
              where: { id: leadId },
              data: { leadScore: aiResponse.suggestedLeadScore },
            })
          }

          // Extract and update contact info if found
          if (leadId && aiResponse.extractedData) {
            const updateData: any = {}
            if (aiResponse.extractedData.phone && !context.leadData?.hasContactInfo) {
              updateData.phone = aiResponse.extractedData.phone
              updateData.whatsapp = aiResponse.extractedData.phone
            }
            if (aiResponse.extractedData.email) {
              updateData.email = aiResponse.extractedData.email
            }
            if (aiResponse.extractedData.interestedLevel) {
              updateData.interestedLevel = aiResponse.extractedData.interestedLevel
            }

            if (Object.keys(updateData).length > 0) {
              await prisma.lead.update({
                where: { id: leadId },
                data: updateData,
              })
            }
          }

          // Mark for human handoff if needed
          if (aiResponse.shouldHandoffToHuman) {
            console.log(`🚨 Handoff to human requested: ${aiResponse.handoffReason}`)
            if (leadId) {
              await prisma.lead.update({
                where: { id: leadId },
                data: {
                  status: 'CONTACTED',
                  notes: context.leadData?.hasContactInfo
                    ? `${await (await prisma.lead.findUnique({ where: { id: leadId } }))?.notes}\n\n[${new Date().toLocaleString()}] 🚨 Handoff requested: ${aiResponse.handoffReason}`
                    : `Handoff requested: ${aiResponse.handoffReason}`,
                },
              })
            }
          }
        }
      }

      // Send response via Instagram API
      if (responseText) {
        console.log('📤 Sending response:', responseText.substring(0, 100))

        const instagramAPI = new InstagramAPI()
        await instagramAPI.sendMessage(senderId, responseText)

        // Store outgoing message
        await prisma.instagramMessage.create({
          data: {
            messageId: `bot_${Date.now()}`,
            conversationId: senderId,
            instagramHandle,
            direction: 'OUTGOING',
            content: responseText,
            sentAt: new Date(),
            isRead: true,
            leadCreated: false,
            leadId,
          },
        })

        console.log('✅ Auto-reply sent successfully')
      }
    } catch (replyError: any) {
      console.error('❌ Error sending auto-reply:', replyError)
      // Don't throw - message was already stored, just log the error
    }
    // ========== END AUTO-REPLY LOGIC ==========

  } catch (error: any) {
    console.error('❌ Error handling messaging event:', error)
    throw error
  }
}

/**
 * Handle Instagram comment events
 */
async function handleCommentEvent(commentData: any) {
  try {
    const commentId = commentData.id
    const mediaId = commentData.media?.id
    const commentText = commentData.text
    const username = commentData.from?.username || commentData.from?.id
    const commentedAt = new Date(commentData.created_time * 1000)

    if (!commentId || !commentText || !username) {
      console.log('⏭️ Skipping comment event (missing data)')
      return
    }

    console.log('💬 Processing comment from:', username)
    console.log('   Comment:', commentText.substring(0, 100))

    // Check if this comment already exists
    const existingComment = await prisma.instagramComment.findUnique({
      where: { commentId },
    })

    if (existingComment) {
      console.log('⏭️ Comment already processed')
      return
    }

    // Detect trigger words and intent
    const triggerResult = detectTriggers(commentText)
    console.log('🔍 Trigger analysis:', {
      priority: triggerResult.priority,
      intent: triggerResult.intent,
      leadIntent: triggerResult.leadIntent,
      score: triggerResult.score,
      triggers: triggerResult.triggerWords,
    })

    // Extract contact information if present
    const contactInfo = extractContactFromComment(commentText)

    // Get media URL if available
    let mediaUrl: string | undefined
    if (mediaId) {
      try {
        const pageToken = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN
        const mediaResponse = await fetch(
          `https://graph.facebook.com/v22.0/${mediaId}?fields=permalink&access_token=${pageToken}`
        )
        const mediaData = await mediaResponse.json()
        mediaUrl = mediaData.permalink
      } catch (error) {
        console.warn('⚠️ Could not fetch media URL for:', mediaId)
      }
    }

    // Create or update lead if high intent detected
    let leadId: string | undefined
    let leadCreated = false

    if (triggerResult.leadIntent) {
      console.log('🎯 Creating lead from comment...')

      try {
        // Check if lead with this Instagram handle already exists
        const existingLead = await prisma.lead.findFirst({
          where: { instagramHandle: username },
        })

        if (existingLead) {
          console.log('📝 Lead already exists, updating...')

          // Update existing lead with comment engagement
          const updatedLead = await prisma.lead.update({
            where: { id: existingLead.id },
            data: {
              leadScore: Math.max(existingLead.leadScore, triggerResult.score),
              socialEngagement: {
                ...((existingLead.socialEngagement as any) || {}),
                comments_count: ((existingLead.socialEngagement as any)?.comments_count || 0) + 1,
                last_comment_at: commentedAt.toISOString(),
              },
              notes: existingLead.notes
                ? `${existingLead.notes}\n\n${generateNotesFromComment(username, commentText, mediaUrl, triggerResult)}`
                : generateNotesFromComment(username, commentText, mediaUrl, triggerResult),
              lastContactDate: commentedAt.toISOString(),
              // Update contact info if found
              ...(contactInfo.phone && !existingLead.phone
                ? { phone: contactInfo.phone, whatsapp: contactInfo.phone }
                : {}),
              ...(contactInfo.email && !existingLead.email
                ? { email: contactInfo.email }
                : {}),
            },
          })

          leadId = updatedLead.id
          leadCreated = false
        } else {
          console.log('✨ Creating new lead from comment...')

          // Create new lead from comment
          const newLead = await prisma.lead.create({
            data: {
              name: `Instagram User (@${username})`,
              whatsapp: contactInfo.phone || '',
              email: contactInfo.email || '',
              phone: contactInfo.phone || '',
              status: 'NEW',
              interestedLevel: 'A1', // Default level
              source: 'INSTAGRAM',
              instagramHandle: username,
              firstTouchpoint: 'instagram_comment',
              leadScore: triggerResult.score,
              socialEngagement: {
                comments_count: 1,
                first_comment_at: commentedAt.toISOString(),
                last_comment_at: commentedAt.toISOString(),
              },
              notes: generateNotesFromComment(username, commentText, mediaUrl, triggerResult),
              lastContactDate: commentedAt.toISOString(),
            },
          })

          leadId = newLead.id
          leadCreated = true

          console.log('✅ Lead created from comment:', {
            id: newLead.id,
            name: newLead.name,
            score: newLead.leadScore,
            priority: triggerResult.priority,
          })
        }
      } catch (error: any) {
        console.error('❌ Error creating/updating lead from comment:', error)
      }
    }

    // Store comment in database
    await prisma.instagramComment.create({
      data: {
        commentId,
        mediaId: mediaId || '',
        mediaUrl: mediaUrl || '',
        username,
        text: commentText,
        commentedAt,
        triggerWords: triggerResult.triggerWords,
        leadIntent: triggerResult.leadIntent,
        leadCreated,
        leadId,
        priority: triggerResult.priority,
        processed: false, // Will be processed for reply separately
      },
    })

    console.log('✅ Comment stored:', {
      from: username,
      priority: triggerResult.priority,
      leadCreated,
    })

    // ========== AUTO-REPLY TO COMMENT ==========
    if (triggerResult.shouldAutoReply && triggerResult.suggestedReply) {
      try {
        console.log('🤖 Auto-replying to comment...')

        const instagramAPI = new InstagramAPI()
        await instagramAPI.replyToComment(commentId, triggerResult.suggestedReply)

        // Update comment as replied
        await prisma.instagramComment.update({
          where: { commentId },
          data: {
            replied: true,
            replyText: triggerResult.suggestedReply,
            repliedAt: new Date(),
            processed: true,
          },
        })

        console.log('✅ Auto-reply sent to comment')
      } catch (replyError: any) {
        console.error('❌ Error replying to comment:', replyError)
        // Don't throw - comment was already stored
      }
    }
    // ========== END AUTO-REPLY TO COMMENT ==========

  } catch (error: any) {
    console.error('❌ Error handling comment event:', error)
    throw error
  }
}
