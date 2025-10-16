/**
 * Instagram Graph API Integration
 * Provides types and utilities for Instagram Business Account API
 */

import axios, { AxiosInstance } from 'axios'

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
export interface InstagramMedia {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS'
  media_url: string
  permalink: string
  timestamp: string
  thumbnail_url?: string
}

export interface InstagramMediaInsights {
  id: string
  impressions: number
  reach: number
  engagement: number
  saved: number
  video_views?: number
  likes: number
  comments: number
  shares: number
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
          fields: 'id,caption,media_type,media_url,permalink,timestamp,thumbnail_url,like_count,comments_count',
          limit,
        },
      })
      return response.data.data || []
    } catch (error) {
      console.error('Error fetching Instagram media:', error)
      throw error
    }
  }

  /**
   * Get insights for a specific media item
   */
  async getMediaInsights(mediaId: string): Promise<InstagramMediaInsights> {
    try {
      const response = await this.client.get(`/${mediaId}/insights`, {
        params: {
          metric: 'impressions,reach,engagement,saved,video_views,likes,comments,shares',
        },
      })

      const insights = response.data.data.reduce((acc: any, metric: any) => {
        acc[metric.name] = metric.values[0].value
        return acc
      }, {})

      return {
        id: mediaId,
        impressions: insights.impressions || 0,
        reach: insights.reach || 0,
        engagement: insights.engagement || 0,
        saved: insights.saved || 0,
        video_views: insights.video_views,
        likes: insights.likes || 0,
        comments: insights.comments || 0,
        shares: insights.shares || 0,
      }
    } catch (error) {
      console.error(`Error fetching insights for media ${mediaId}:`, error)
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

export function calculateEngagementRate(likes: number, comments: number, shares: number, views: number): number {
  if (views === 0) return 0
  const totalEngagement = likes + comments + shares
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
