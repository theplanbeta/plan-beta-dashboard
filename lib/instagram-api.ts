/**
 * Instagram Graph API Integration
 * Provides types and utilities for Instagram Business Account API
 */

import axios, { AxiosError, AxiosInstance } from 'axios'

// Environment variables for Instagram API
export const INSTAGRAM_CONFIG = {
  APP_ID: process.env.INSTAGRAM_APP_ID || '',
  APP_SECRET: process.env.INSTAGRAM_APP_SECRET || '',
  ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN || '',
  BUSINESS_ACCOUNT_ID: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '',
  GRAPH_API_VERSION: 'v22.0',
  GRAPH_API_BASE_URL: 'https://graph.facebook.com',
}

// Instagram API Types
export type InstagramMediaType = 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS'

export interface InstagramMedia {
  id: string
  caption?: string
  media_type: InstagramMediaType
  media_url: string
  permalink: string
  timestamp: string
  thumbnail_url?: string
  media_product_type?: string
  like_count?: number
  comments_count?: number
}

export interface InstagramMediaInsights {
  id: string
  impressions?: number
  reach?: number
  engagement?: number
  saved?: number
  plays?: number
  video_views?: number
  shares?: number
  total_interactions?: number
  profile_activity?: number
}

export interface InstagramConversation {
  id: string
  updated_time: string
  messages: {
    data: InstagramMessage[]
  }
}

export interface InstagramMessage {
  id: string
  created_time: string
  from: {
    id: string
    username: string
  }
  to: {
    data: Array<{
      id: string
      username: string
    }>
  }
  message: string
}

export interface InstagramWebhookEntry {
  id: string
  time: number
  messaging?: Array<{
    sender: {
      id: string
    }
    recipient: {
      id: string
    }
    timestamp: number
    message?: {
      mid: string
      text: string
    }
  }>
}

// Instagram API Client
export class InstagramAPI {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: `${INSTAGRAM_CONFIG.GRAPH_API_BASE_URL}/${INSTAGRAM_CONFIG.GRAPH_API_VERSION}`,
      params: {
        access_token: INSTAGRAM_CONFIG.ACCESS_TOKEN,
      },
    })
  }

  /**
   * Fetch all media (reels, posts, etc.) from Instagram Business Account
   */
  async getMediaList(limit = 25): Promise<InstagramMedia[]> {
    try {
      const response = await this.client.get(`/${INSTAGRAM_CONFIG.BUSINESS_ACCOUNT_ID}/media`, {
        params: {
          fields: [
            'id',
            'caption',
            'media_type',
            'media_product_type',
            'media_url',
            'permalink',
            'timestamp',
            'thumbnail_url',
            'like_count',
            'comments_count',
          ].join(','),
          limit,
        },
      })
      return response.data.data || []
    } catch (error) {
      const axiosError = error as AxiosError<any>
      console.error('Error fetching Instagram media:', {
        status: axiosError?.response?.status,
        statusText: axiosError?.response?.statusText,
        data: axiosError?.response?.data,
        config: {
          url: axiosError?.config?.url,
          params: axiosError?.config?.params
        }
      })
      throw error
    }
  }

  private static readonly MEDIA_INSIGHT_METRICS: Record<InstagramMediaType, readonly string[]> = {
    IMAGE: ['impressions', 'reach', 'saved'],
    VIDEO: ['impressions', 'reach', 'saved', 'video_views'],
    CAROUSEL_ALBUM: ['impressions', 'reach', 'saved'],
    REELS: ['plays', 'reach', 'saved', 'total_interactions'],
  }

  private static readonly FALLBACK_METRICS: readonly string[] = ['impressions', 'reach', 'saved']

  /**
   * Get insights for a specific media item
   */
  async getMediaInsights(mediaId: string, mediaType: InstagramMediaType): Promise<InstagramMediaInsights> {
    const metrics = Array.from(
      new Set(
        InstagramAPI.MEDIA_INSIGHT_METRICS[mediaType]?.length
          ? InstagramAPI.MEDIA_INSIGHT_METRICS[mediaType]
          : InstagramAPI.FALLBACK_METRICS
      )
    )

    if (metrics.length === 0) {
      return { id: mediaId }
    }

    try {
      const response = await this.client.get(`/${mediaId}/insights`, {
        params: {
          metric: metrics.join(','),
        },
      })

      const insights = response.data.data.reduce((acc: any, metric: any) => {
        acc[metric.name] = metric.values[0].value
        return acc
      }, {})

      const engagement = insights.engagement ?? insights.total_interactions ?? 0

      return {
        id: mediaId,
        impressions: insights.impressions || 0,
        reach: insights.reach || 0,
        engagement,
        saved: insights.saved || 0,
        plays: insights.plays || 0,
        video_views: insights.video_views,
        shares: insights.shares || 0,
        total_interactions: insights.total_interactions || engagement || 0,
        profile_activity: insights.profile_activity || 0,
      }
    } catch (error) {
      const axiosError = error as AxiosError<any>
      console.error(`Error fetching insights for media ${mediaId}:`, axiosError?.response?.data || error)

      // Retry once with fallback metrics if the selected metrics are invalid
      if (
        axiosError?.response?.status === 400 &&
        axiosError.response?.data?.error?.code === 100 &&
        metrics.join(',') !== InstagramAPI.FALLBACK_METRICS.join(',')
      ) {
        console.warn(`Retrying Instagram insights for ${mediaId} with fallback metric set`)
        const fallbackMetrics = InstagramAPI.FALLBACK_METRICS.join(',')
        const retryResponse = await this.client.get(`/${mediaId}/insights`, {
          params: { metric: fallbackMetrics },
        })

        const fallbackData = retryResponse.data.data.reduce((acc: any, metric: any) => {
          acc[metric.name] = metric.values[0].value
          return acc
        }, {})

        return {
          id: mediaId,
          impressions: fallbackData.impressions || 0,
          reach: fallbackData.reach || 0,
          engagement: fallbackData.engagement || fallbackData.total_interactions || 0,
          saved: fallbackData.saved || 0,
        }
      }

      throw error
    }
  }

  /**
   * Get conversations (DMs) from Instagram
   */
  async getConversations(limit = 10): Promise<InstagramConversation[]> {
    try {
      const response = await this.client.get(`/${INSTAGRAM_CONFIG.BUSINESS_ACCOUNT_ID}/conversations`, {
        params: {
          fields: 'id,updated_time,messages{id,created_time,from,to,message}',
          limit,
        },
      })
      return response.data.data || []
    } catch (error) {
      console.error('Error fetching conversations:', error)
      throw error
    }
  }

  /**
   * Send a message via Instagram DM
   */
  async sendMessage(recipientId: string, message: string): Promise<void> {
    try {
      await this.client.post(`/${INSTAGRAM_CONFIG.BUSINESS_ACCOUNT_ID}/messages`, {
        recipient: { id: recipientId },
        message: { text: message },
      })
    } catch (error) {
      console.error('Error sending Instagram message:', error)
      throw error
    }
  }

  /**
   * Reply to a comment on Instagram
   */
  async replyToComment(commentId: string, message: string): Promise<void> {
    try {
      await this.client.post(`/${commentId}/replies`, {
        message,
      })
    } catch (error) {
      console.error('Error replying to Instagram comment:', error)
      throw error
    }
  }

  /**
   * Verify webhook signature for security
   */
  static verifyWebhookSignature(signature: string, body: string): boolean {
    const crypto = require('crypto')
    const expectedSignature = crypto
      .createHmac('sha256', INSTAGRAM_CONFIG.APP_SECRET)
      .update(body)
      .digest('hex')

    return signature === `sha256=${expectedSignature}`
  }
}

// Helper functions for content analysis
export function extractHashtags(caption?: string): string[] {
  if (!caption) return []
  const hashtags = caption.match(/#\w+/g) || []
  return hashtags.map(tag => tag.slice(1)) // Remove # symbol
}

export function detectTopic(caption?: string): string | null {
  if (!caption) return null

  const lowerCaption = caption.toLowerCase()

  // Topic detection based on keywords
  if (lowerCaption.includes('grammar') || lowerCaption.includes('grammatik')) return 'grammar_tips'
  if (lowerCaption.includes('student success') || lowerCaption.includes('testimonial')) return 'student_success'
  if (lowerCaption.includes('batch') || lowerCaption.includes('enrollment')) return 'batch_promo'
  if (lowerCaption.includes('culture') || lowerCaption.includes('tradition')) return 'german_culture'
  if (lowerCaption.includes('vocabulary') || lowerCaption.includes('wortschatz')) return 'vocabulary'
  if (lowerCaption.includes('a1') || lowerCaption.includes('a2') || lowerCaption.includes('b1')) return 'level_info'

  return 'general'
}

export function calculateEngagementRate(
  likes: number,
  comments: number,
  shares: number,
  views: number,
  saves: number = 0
): number {
  if (views === 0) return 0
  const totalEngagement = likes + comments + shares + saves
  return (totalEngagement / views) * 100
}

export function calculateConversionRate(enrollments: number, leads: number): number {
  if (leads === 0) return 0
  return (enrollments / leads) * 100
}

export function calculateROI(revenue: number, estimatedCost: number): number {
  if (estimatedCost === 0) return 0
  return ((revenue - estimatedCost) / estimatedCost) * 100
}

// Default export
export default InstagramAPI
