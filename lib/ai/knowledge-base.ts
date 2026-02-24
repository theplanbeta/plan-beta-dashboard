/**
 * Knowledge Base for Instagram DM Auto-Responder
 * Provides course information, pricing, FAQs for AI agent
 */

import { prisma } from '@/lib/prisma'
import { Level, BatchStatus } from '@prisma/client'

export interface BatchInfo {
  id: string
  batchCode: string
  level: string
  startDate: string | null
  schedule: string | null
  totalSeats: number
  enrolledCount: number
  seatsAvailable: number
  status: string
  fillRate: number
}

export interface PricingInfo {
  level: string
  price: number
  currency: string
  duration: string
}

export interface LevelInfo {
  code: string
  name: string
  description: string
  duration: string
  topics: string[]
  requirements: string
}

export interface KnowledgeBase {
  batches: BatchInfo[]
  pricing: PricingInfo[]
  levels: LevelInfo[]
  faqs: { question: string; answer: string }[]
  generalInfo: {
    whatsapp: string
    email: string
    website: string
    trialClass: string
  }
}

/**
 * Static pricing information
 */
const PRICING_DATA: PricingInfo[] = [
  {
    level: 'A1',
    price: 350,
    currency: 'EUR',
    duration: '3 months',
  },
  {
    level: 'A2',
    price: 350,
    currency: 'EUR',
    duration: '3 months',
  },
  {
    level: 'B1',
    price: 400,
    currency: 'EUR',
    duration: '3 months',
  },
  {
    level: 'B2',
    price: 450,
    currency: 'EUR',
    duration: '3 months',
  },
  {
    level: 'A1+A2 Combo',
    price: 650,
    currency: 'EUR',
    duration: '6 months',
  },
]

/**
 * Static level information
 */
const LEVEL_DATA: LevelInfo[] = [
  {
    code: 'A1',
    name: 'Beginner',
    description: 'For complete beginners with no German knowledge',
    duration: '3 months (48-60 hours)',
    topics: [
      'Basic greetings and introductions',
      'Numbers, dates, time',
      'Shopping and ordering food',
      'Talking about family and hobbies',
      'Basic grammar and sentence structure',
    ],
    requirements: 'No prior German knowledge required',
  },
  {
    code: 'A2',
    name: 'Elementary',
    description: 'For students who have completed A1',
    duration: '3 months (48-60 hours)',
    topics: [
      'Describing past events',
      'Making plans and appointments',
      'Talking about work and professions',
      'Travel and directions',
      'Express opinions and preferences',
    ],
    requirements: 'A1 certificate or equivalent knowledge',
  },
  {
    code: 'B1',
    name: 'Intermediate',
    description: 'For students who have completed A2',
    duration: '3 months (60-80 hours)',
    topics: [
      'Discussing current events',
      'Writing formal letters',
      'Job interviews and CV writing',
      'Complex conversations',
      'Preparation for B1 exam',
    ],
    requirements: 'A2 certificate or equivalent knowledge',
  },
  {
    code: 'B2',
    name: 'Upper Intermediate',
    description: 'Advanced German for work and university',
    duration: '3 months (80-100 hours)',
    topics: [
      'Academic and professional German',
      'Complex texts and discussions',
      'Preparation for B2 exam (university requirement)',
      'Business communication',
      'Cultural topics',
    ],
    requirements: 'B1 certificate or equivalent knowledge',
  },
]

/**
 * Static FAQs
 */
const FAQ_DATA = [
  {
    question: 'How can I enroll?',
    answer: 'You can enquire about our courses through our contact form or WhatsApp. Our team will get back to you within 24 hours to help you get started.',
  },
  {
    question: 'What are the class timings?',
    answer: 'We offer flexible timings - Morning (9-11 AM), Evening (6-8 PM), and Weekend batches. You can check available batches for your preferred timing.',
  },
  {
    question: 'Is the course online or offline?',
    answer: 'We currently offer online classes via Zoom with live interactive sessions. This allows students from anywhere to join.',
  },
  {
    question: 'What is the batch size?',
    answer: 'We keep small batches of 8-12 students to ensure personalized attention and more speaking practice.',
  },
  {
    question: 'Do you provide study materials?',
    answer: 'Yes, we provide comprehensive study materials, PDFs, practice exercises, and access to our online learning portal.',
  },
  {
    question: 'Are the teachers native German speakers?',
    answer: 'Our teachers are certified German language instructors with Goethe certification and extensive teaching experience.',
  },
  {
    question: 'Will I get a certificate?',
    answer: 'Yes, you receive a course completion certificate. We also prepare students for official Goethe Institut exams if required.',
  },
  {
    question: 'What if I miss a class?',
    answer: 'All classes are recorded and made available to students. You can also attend makeup classes from other batches.',
  },
  {
    question: 'What is the fee structure?',
    answer: 'Fees vary by level - A1/A2: €350, B1: €400, B2: €450. We also offer combo packages with discounts.',
  },
  {
    question: 'Do you offer EMI or installment payments?',
    answer: 'Yes, we offer flexible payment plans. You can pay in 2-3 installments. Contact us for details.',
  },
  {
    question: 'When does the next batch start?',
    answer: 'We start new batches every 2 weeks. Let me check the latest schedule for you.',
  },
  {
    question: 'How long does it take to complete A1?',
    answer: 'A1 level takes approximately 3 months with 2-3 classes per week (48-60 hours total).',
  },
  {
    question: 'Can I get a refund if I want to discontinue?',
    answer: 'We have a refund policy for the first 2 weeks. Please contact our admin team for specific terms.',
  },
]

/**
 * General contact information
 */
const GENERAL_INFO = {
  whatsapp: process.env.SUPPORT_WHATSAPP || '+91 XXX XXX XXXX',
  email: 'hello@planbeta.in',
  website: 'https://plan-beta-dashboard.vercel.app',
  trialClass: 'Get in touch with our team to learn more about our courses!',
}

/**
 * Load batches from database
 */
export async function loadBatches(): Promise<BatchInfo[]> {
  try {
    const batches = await prisma.batch.findMany({
      where: {
        status: {
          in: [BatchStatus.PLANNING, BatchStatus.FILLING, BatchStatus.RUNNING],
        },
        OR: [
          { startDate: { gte: new Date() } }, // Future batches
          { status: BatchStatus.RUNNING }, // Currently running
        ],
      },
      orderBy: [
        { startDate: 'asc' },
        { level: 'asc' },
      ],
      take: 20, // Show next 20 batches
    })

    return batches.map(batch => ({
      id: batch.id,
      batchCode: batch.batchCode,
      level: batch.level,
      startDate: batch.startDate?.toISOString() || null,
      schedule: batch.schedule,
      totalSeats: batch.totalSeats,
      enrolledCount: batch.enrolledCount,
      seatsAvailable: batch.totalSeats - batch.enrolledCount,
      status: batch.status,
      fillRate: Number(batch.fillRate),
    }))
  } catch (error) {
    console.error('Error loading batches:', error)
    return []
  }
}

/**
 * Get complete knowledge base
 */
export async function getKnowledgeBase(): Promise<KnowledgeBase> {
  const batches = await loadBatches()

  return {
    batches,
    pricing: PRICING_DATA,
    levels: LEVEL_DATA,
    faqs: FAQ_DATA,
    generalInfo: GENERAL_INFO,
  }
}

/**
 * Find batches by level
 */
export function findBatchesByLevel(kb: KnowledgeBase, level: string): BatchInfo[] {
  const normalizedLevel = level.toUpperCase().replace(/[^A-Z0-9]/g, '')

  return kb.batches.filter(batch => {
    const batchLevel = batch.level.toUpperCase().replace(/[^A-Z0-9]/g, '')
    return batchLevel === normalizedLevel || batchLevel.startsWith(normalizedLevel)
  })
}

/**
 * Find pricing by level
 */
export function findPricingByLevel(kb: KnowledgeBase, level: string): PricingInfo | null {
  const normalizedLevel = level.toUpperCase().trim()

  return kb.pricing.find(p =>
    p.level.toUpperCase() === normalizedLevel ||
    p.level.toUpperCase().includes(normalizedLevel)
  ) || null
}

/**
 * Find level info by code
 */
export function findLevelInfo(kb: KnowledgeBase, level: string): LevelInfo | null {
  const normalizedLevel = level.toUpperCase().replace(/[^A-Z0-9]/g, '')

  return kb.levels.find(l => l.code === normalizedLevel) || null
}

/**
 * Search FAQs by keyword
 */
export function searchFAQs(kb: KnowledgeBase, query: string): { question: string; answer: string }[] {
  const keywords = query.toLowerCase().split(' ')

  return kb.faqs.filter(faq => {
    const combined = (faq.question + ' ' + faq.answer).toLowerCase()
    return keywords.some(keyword => combined.includes(keyword))
  }).slice(0, 3) // Return top 3 matches
}

/**
 * Format batch information for display
 */
export function formatBatchInfo(batch: BatchInfo): string {
  const date = batch.startDate ? new Date(batch.startDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) : 'TBD'

  const seats = batch.seatsAvailable > 0
    ? `${batch.seatsAvailable} seat${batch.seatsAvailable === 1 ? '' : 's'} left`
    : '⚠️ Full'

  return `📅 ${batch.batchCode} - ${batch.level}
🗓️ Starts: ${date}
⏰ Timing: ${batch.schedule || 'TBD'}
💺 ${seats}`
}

/**
 * Format all batches for a level
 */
export function formatBatchesForLevel(kb: KnowledgeBase, level: string): string {
  const batches = findBatchesByLevel(kb, level)

  if (batches.length === 0) {
    return `No upcoming batches for ${level} at the moment. New batches start every 2 weeks. Would you like to be notified when the next batch opens?`
  }

  const formatted = batches
    .slice(0, 3) // Show max 3 batches
    .map(formatBatchInfo)
    .join('\n\n')

  return formatted
}
