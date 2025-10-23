import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseDMMessage, generateLeadNotes } from '@/lib/dm-parser'
import InstagramAPI from '@/lib/instagram-api'

/**
 * POST /api/instagram/fetch-labeled-leads
 * Fetches all Instagram conversations labeled as "Lead" and creates lead records
 *
 * This can be triggered:
 * 1. Manually from the dashboard
 * 2. Via a cron job
 * 3. Automatically when you label a conversation in Instagram
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🏷️  Fetching Instagram conversations labeled as "Lead"...')

    const pageToken = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN
    const instagramAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID

    if (!pageToken || !instagramAccountId) {
      return NextResponse.json(
        { error: 'Instagram credentials not configured' },
        { status: 500 }
      )
    }

    // Fetch all conversations
    const conversationsUrl = `https://graph.facebook.com/v22.0/${instagramAccountId}/conversations?fields=id,participants,messages{message,from,created_time},folder&access_token=${pageToken}`

    const response = await fetch(conversationsUrl)
    const data = await response.json()

    if (data.error) {
      console.error('❌ Error fetching conversations:', data.error)
      return NextResponse.json(
        { error: `Instagram API error: ${data.error.message}` },
        { status: 500 }
      )
    }

    const conversations = data.data || []
    console.log(`📬 Found ${conversations.length} total conversations`)

    // Check each conversation for "Lead" label/folder
    let processedCount = 0
    let createdLeads = 0
    let updatedLeads = 0
    const leadDetails: any[] = []

    for (const conversation of conversations) {
      try {
        // Get detailed conversation info including labels
        const detailUrl = `https://graph.facebook.com/v22.0/${conversation.id}?fields=id,participants,messages{message,from,created_time,id},folder,tags&access_token=${pageToken}`
        const detailResponse = await fetch(detailUrl)
        const conversationDetail = await detailResponse.json()

        // Check if conversation has "Lead" tag or is in "Lead" folder
        const isLead = conversationDetail.folder === 'lead' ||
                       conversationDetail.tags?.some((tag: string) => tag.toLowerCase().includes('lead'))

        if (!isLead) {
          continue
        }

        console.log(`🎯 Processing labeled conversation: ${conversation.id}`)
        processedCount++

        // Get participant info
        const participants = conversationDetail.participants?.data || []
        const customer = participants.find((p: any) => p.id !== instagramAccountId)

        if (!customer) {
          console.log('⏭️  Skipping - no customer participant found')
          continue
        }

        // Fetch username
        let instagramHandle = customer.id
        try {
          const userResponse = await fetch(
            `https://graph.facebook.com/v22.0/${customer.id}?fields=username&access_token=${pageToken}`
          )
          const userData = await userResponse.json()
          if (userData.username) {
            instagramHandle = userData.username
          }
        } catch (error) {
          console.warn('⚠️  Could not fetch username:', error)
        }

        // Get all messages from this conversation
        const messages = conversationDetail.messages?.data || []
        const allMessageTexts = messages
          .filter((m: any) => m.from?.id === customer.id) // Only customer messages
          .map((m: any) => m.message)
          .reverse() // Chronological order

        if (allMessageTexts.length === 0) {
          console.log('⏭️  Skipping - no messages found')
          continue
        }

        console.log(`📝 Found ${allMessageTexts.length} messages from @${instagramHandle}`)

        // Combine all messages for better parsing
        const combinedMessages = allMessageTexts.join('\n')

        // Parse all messages to extract lead information
        const parsedContent = parseDMMessage(combinedMessages)

        console.log(`🔍 Parsed content:`, {
          intent: parsedContent.intent,
          level: parsedContent.level,
          leadScore: parsedContent.leadScore,
          email: parsedContent.contactInfo.email,
          phone: parsedContent.contactInfo.phone,
        })

        // Check if lead already exists
        const existingLead = await prisma.lead.findFirst({
          where: { instagramHandle },
        })

        if (existingLead) {
          console.log('📝 Lead exists, updating...')

          // Update existing lead
          const updatedLead = await prisma.lead.update({
            where: { id: existingLead.id },
            data: {
              leadScore: Math.max(existingLead.leadScore, parsedContent.leadScore),
              socialEngagement: {
                ...(existingLead.socialEngagement as any || {}),
                dm_count: allMessageTexts.length,
                last_dm_at: new Date().toISOString(),
              },
              notes: existingLead.notes
                ? `${existingLead.notes}\n\n[${new Date().toLocaleString()}] 🏷️  Captured from Instagram "Lead" label:\n${generateLeadNotes(instagramHandle, allMessageTexts, parsedContent)}`
                : `[${new Date().toLocaleString()}] 🏷️  Captured from Instagram "Lead" label:\n${generateLeadNotes(instagramHandle, allMessageTexts, parsedContent)}`,
              lastContactDate: new Date().toISOString(),
              // Update contact info if found
              ...(parsedContent.contactInfo.email && !existingLead.email
                ? { email: parsedContent.contactInfo.email }
                : {}),
              ...(parsedContent.contactInfo.phone && !existingLead.phone
                ? { phone: parsedContent.contactInfo.phone, whatsapp: parsedContent.contactInfo.phone }
                : {}),
            },
          })

          updatedLeads++
          leadDetails.push({
            id: updatedLead.id,
            name: updatedLead.name,
            instagram: instagramHandle,
            score: updatedLead.leadScore,
            action: 'updated',
          })

        } else {
          console.log('✨ Creating new lead...')

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
              firstTouchpoint: 'instagram_label',
              leadScore: parsedContent.leadScore,
              socialEngagement: {
                dm_count: allMessageTexts.length,
                first_dm_at: new Date().toISOString(),
                last_dm_at: new Date().toISOString(),
              },
              notes: `[${new Date().toLocaleString()}] 🏷️  Captured from Instagram "Lead" label:\n${generateLeadNotes(instagramHandle, allMessageTexts, parsedContent)}`,
              lastContactDate: new Date().toISOString(),
            },
          })

          createdLeads++
          leadDetails.push({
            id: newLead.id,
            name: newLead.name,
            instagram: instagramHandle,
            score: newLead.leadScore,
            action: 'created',
          })

          console.log(`✅ Lead created: ${newLead.name} (Score: ${newLead.leadScore})`)
        }

        // Store messages in database
        for (const msg of messages) {
          if (msg.from?.id === customer.id) {
            await prisma.instagramMessage.create({
              data: {
                messageId: msg.id || `${customer.id}_${msg.created_time}`,
                conversationId: customer.id,
                instagramHandle,
                direction: 'INCOMING',
                content: msg.message || '',
                sentAt: new Date(msg.created_time),
                isRead: true,
                leadCreated: !existingLead,
                leadId: existingLead?.id || leadDetails[leadDetails.length - 1].id,
              },
            }).catch(() => {
              // Ignore duplicate message errors
            })
          }
        }

      } catch (error: any) {
        console.error(`❌ Error processing conversation ${conversation.id}:`, error)
      }
    }

    console.log(`✅ Processed ${processedCount} labeled conversations`)
    console.log(`   Created: ${createdLeads} new leads`)
    console.log(`   Updated: ${updatedLeads} existing leads`)

    return NextResponse.json({
      success: true,
      processed: processedCount,
      created: createdLeads,
      updated: updatedLeads,
      leads: leadDetails,
    })

  } catch (error: any) {
    console.error('❌ Error fetching labeled leads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch labeled leads', details: error.message },
      { status: 500 }
    )
  }
}
