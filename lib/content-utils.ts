/**
 * Content utility functions for analyzing and processing content
 * These are generic utilities used across different content platforms
 */

/**
 * Extract hashtags from content caption
 */
export function extractHashtags(caption?: string): string[] {
  if (!caption) return []
  const hashtags = caption.match(/#\w+/g) || []
  return hashtags.map(tag => tag.slice(1)) // Remove # symbol
}

/**
 * Detect content topic based on keywords in caption
 */
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

/**
 * Calculate engagement rate for content
 * @param likes - Number of likes
 * @param comments - Number of comments
 * @param shares - Number of shares
 * @param views - Number of views (denominator)
 * @param saves - Number of saves (optional)
 * @returns Engagement rate as percentage
 */
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

/**
 * Calculate conversion rate
 */
export function calculateConversionRate(enrollments: number, leads: number): number {
  if (leads === 0) return 0
  return (enrollments / leads) * 100
}

/**
 * Calculate ROI
 */
export function calculateROI(revenue: number, estimatedCost: number): number {
  if (estimatedCost === 0) return 0
  return ((revenue - estimatedCost) / estimatedCost) * 100
}
