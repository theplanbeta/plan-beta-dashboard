import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * NEW OUTREACH SYSTEM (Dec 2024+)
 * Journey-Based Scheduling: Call frequency based on where student is in their learning journey
 *
 * Journey Phases:
 * - WELCOME (Days 1-7): High-touch onboarding - calls on day 2-3, day 7
 * - SETTLING_IN (Days 8-21): Building habits - calls on day 14, day 21
 * - ACTIVE_LEARNING (Days 22-course end): Regular support - every 14 days
 * - PRE_COMPLETION (5-7 days before end): Upsell & next level - urgent call
 * - POST_COURSE (After completion): Alumni engagement - every 30-45 days
 *
 * Replaces old tier system (PLATINUM/GOLD/SILVER/BRONZE) which rewarded wrong students.
 * New system: ALL students get support based on their journey, not their "value"
 */
export type JourneyPhase = 'WELCOME' | 'SETTLING_IN' | 'ACTIVE_LEARNING' | 'PRE_COMPLETION' | 'POST_COURSE';

// Keep for backward compatibility with existing code, but deprecated
export type StudentTier = 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE';

/**
 * Call Priority Levels
 * HIGH: Urgent situations requiring immediate attention
 * MEDIUM: Important but not urgent
 * LOW: Nice-to-have check-ins
 */
export type CallPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface TierCalculationResult {
  tier: StudentTier;
  score: number;
  recommendedFrequencyDays: number;
  breakdown: {
    relationshipDepth: number;
    communityPotential: number;
    engagement: number;
    need: number;
    vipStatus: number;
  };
  reasoning: string[];
}

export interface PriorityCalculationResult {
  priority: CallPriority;
  score: number;
  reason: string;
  urgencyFactors: string[];
}

export interface ScheduledCall {
  studentId: string;
  scheduledDate: Date;
  priority: CallPriority;
  reason: string;
  tier: StudentTier;
  studentName: string;
  whatsapp: string;
}

/**
 * NEW: Journey Phase Calculation Result
 */
export interface JourneyPhaseResult {
  phase: JourneyPhase;
  enrollmentDays: number;
  classesAttended: number;
  expectedCourseDuration: number;
  daysUntilCompletion: number | null;
  nextCallDays: number; // Days from now until next recommended call
  description: string;
}

/**
 * NEW: Calculate student's journey phase (Dec 2024+ students only)
 * Returns where student is in their learning journey and when next call should be
 */
export async function getJourneyPhase(studentId: string): Promise<JourneyPhaseResult> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      enrollmentDate: true,
      currentLevel: true,
      classesAttended: true,
      completionStatus: true,
    }
  });

  if (!student) {
    throw new Error(`Student ${studentId} not found`);
  }

  const enrollmentDays = Math.floor((Date.now() - new Date(student.enrollmentDate).getTime()) / (1000 * 60 * 60 * 24));

  // Determine expected course duration
  let expectedCourseDuration = 40; // A1/A2
  if (student.currentLevel === 'B1' || student.currentLevel === 'B2') {
    expectedCourseDuration = 60;
  } else if (student.currentLevel === 'NEW' || student.currentLevel === 'SPOKEN_GERMAN') {
    expectedCourseDuration = 30;
  }

  const daysUntilCompletion = student.completionStatus === 'ACTIVE'
    ? expectedCourseDuration - student.classesAttended
    : null;

  // Determine phase and next call timing
  let phase: JourneyPhase;
  let nextCallDays: number;
  let description: string;

  if (student.completionStatus !== 'ACTIVE') {
    // Post-course alumni
    phase = 'POST_COURSE';
    nextCallDays = 35; // Monthly-ish check-ins
    description = 'Alumni - monthly community check-in';
  } else if (daysUntilCompletion !== null && daysUntilCompletion <= 7 && daysUntilCompletion > 0) {
    // Pre-completion upsell window
    phase = 'PRE_COMPLETION';
    nextCallDays = 2; // Urgent - call within 2 days
    description = `${daysUntilCompletion} days until course completion - upsell opportunity`;
  } else if (enrollmentDays <= 7) {
    // Welcome phase - high-touch onboarding
    phase = 'WELCOME';
    if (enrollmentDays <= 2) {
      nextCallDays = 1; // First call: day 2-3
      description = 'New student - welcome call';
    } else {
      nextCallDays = 7 - enrollmentDays; // Second call: day 7
      description = 'Week 1 settling-in call';
    }
  } else if (enrollmentDays <= 21) {
    // Settling in phase - building habits
    phase = 'SETTLING_IN';
    if (enrollmentDays < 14) {
      nextCallDays = 14 - enrollmentDays; // Call on day 14
      description = 'Week 2 habit-building check-in';
    } else {
      nextCallDays = 21 - enrollmentDays; // Call on day 21
      description = 'Week 3 progress review';
    }
  } else {
    // Active learning phase - regular support
    phase = 'ACTIVE_LEARNING';
    nextCallDays = 14; // Biweekly check-ins
    description = 'Active learning - biweekly support call';
  }

  return {
    phase,
    enrollmentDays,
    classesAttended: student.classesAttended,
    expectedCourseDuration,
    daysUntilCompletion,
    nextCallDays,
    description
  };
}

/**
 * NEW: Calculate next call date based on journey phase
 * Used for auto-scheduling after call completion
 */
export function calculateNextCallDate(journeyPhase: JourneyPhaseResult, lastCallDate: Date = new Date()): Date {
  const nextDate = new Date(lastCallDate);
  nextDate.setDate(nextDate.getDate() + journeyPhase.nextCallDays);
  return nextDate;
}

/**
 * DEPRECATED: Calculate a student's tier based on multiple factors
 * Kept for backward compatibility but should not be used for Dec 2024+ students
 */
export async function calculateStudentTier(studentId: string): Promise<TierCalculationResult> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      referralsGiven: true,
      contentPosts: {
        where: { status: 'PUBLISHED' }
      },
      interactions: {
        orderBy: { createdAt: 'desc' },
        take: 5
      },
      payments: true,
      attendance: {
        where: {
          date: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
          }
        }
      }
    }
  });

  if (!student) {
    throw new Error(`Student ${studentId} not found`);
  }

  const reasoning: string[] = [];
  const breakdown = {
    relationshipDepth: 0,
    communityPotential: 0,
    engagement: 0,
    need: 0,
    vipStatus: 0
  };

  // 1. Relationship Depth (0-10 points)
  // Based on interaction history and tenure
  const enrollmentDays = Math.floor((Date.now() - new Date(student.enrollmentDate).getTime()) / (1000 * 60 * 60 * 24));
  const interactionCount = student.interactions.length;

  if (enrollmentDays > 180 && interactionCount >= 3) {
    breakdown.relationshipDepth = 10;
    reasoning.push('Long-term student with multiple interactions');
  } else if (enrollmentDays > 90 && interactionCount >= 2) {
    breakdown.relationshipDepth = 7;
    reasoning.push('Established student with some interaction history');
  } else if (enrollmentDays > 30 && interactionCount >= 1) {
    breakdown.relationshipDepth = 5;
    reasoning.push('New student with initial contact');
  } else if (enrollmentDays > 30) {
    breakdown.relationshipDepth = 3;
    reasoning.push('Student enrolled for a while but minimal interaction');
  } else {
    breakdown.relationshipDepth = 2;
    reasoning.push('Very new student');
  }

  // 2. Community Potential (0-10 points)
  // Referrals, content creation, ambassador potential
  const referralCount = student.referralsGiven.length;
  const contentPostCount = student.contentPosts.length;

  if (referralCount >= 3) {
    breakdown.communityPotential = 10;
    reasoning.push(`Strong ambassador - ${referralCount} referrals`);
  } else if (referralCount >= 2) {
    breakdown.communityPotential = 8;
    reasoning.push(`Active referrer - ${referralCount} referrals`);
  } else if (referralCount >= 1) {
    breakdown.communityPotential = 6;
    reasoning.push('Has made referrals');
  }

  if (contentPostCount >= 5) {
    breakdown.communityPotential += 5;
    reasoning.push(`Prolific content creator - ${contentPostCount} posts`);
  } else if (contentPostCount >= 2) {
    breakdown.communityPotential += 3;
    reasoning.push(`Active content contributor - ${contentPostCount} posts`);
  } else if (contentPostCount >= 1) {
    breakdown.communityPotential += 2;
    reasoning.push('Has shared content');
  }

  breakdown.communityPotential = Math.min(10, breakdown.communityPotential);

  // 3. Engagement Score (0-10 points)
  // Attendance rate, recent activity
  const attendanceRate = Number(student.attendanceRate);
  const recentAttendance = student.attendance.filter(a => a.status === 'PRESENT').length;

  if (attendanceRate >= 90) {
    breakdown.engagement = 10;
    reasoning.push('Exceptional attendance (90%+)');
  } else if (attendanceRate >= 80) {
    breakdown.engagement = 8;
    reasoning.push('Excellent attendance (80-90%)');
  } else if (attendanceRate >= 70) {
    breakdown.engagement = 6;
    reasoning.push('Good attendance (70-80%)');
  } else if (attendanceRate >= 50) {
    breakdown.engagement = 4;
    reasoning.push('Moderate attendance (50-70%)');
  } else if (attendanceRate > 0) {
    breakdown.engagement = 2;
    reasoning.push('Low attendance (<50%)');
  }

  // 4. Need Score (0-10 points - INVERTED: higher need = lower tier normally)
  // Churn risk, payment issues, absences
  let needScore = 0;

  if (student.churnRisk === 'HIGH') {
    needScore += 5;
    reasoning.push('HIGH churn risk - needs attention');
  } else if (student.churnRisk === 'MEDIUM') {
    needScore += 3;
    reasoning.push('MEDIUM churn risk');
  }

  if (student.consecutiveAbsences >= 5) {
    needScore += 3;
    reasoning.push(`Critical: ${student.consecutiveAbsences} consecutive absences`);
  } else if (student.consecutiveAbsences >= 3) {
    needScore += 2;
    reasoning.push(`Warning: ${student.consecutiveAbsences} consecutive absences`);
  }

  if (student.paymentStatus === 'OVERDUE') {
    needScore += 2;
    reasoning.push('Payment overdue');
  } else if (student.paymentStatus === 'PARTIAL') {
    needScore += 1;
    reasoning.push('Partial payment pending');
  }

  breakdown.need = Math.min(10, needScore);

  // 5. VIP Status (0-10 points)
  // High revenue, multiple referrals, premium engagement
  const totalRevenue = student.payments.reduce((sum, p) => sum + Number(p.amount), 0);

  if (totalRevenue >= 5000 || referralCount >= 3) {
    breakdown.vipStatus = 10;
    reasoning.push('VIP status - high value student');
  } else if (totalRevenue >= 3000 || referralCount >= 2) {
    breakdown.vipStatus = 7;
    reasoning.push('Premium student');
  } else if (totalRevenue >= 2000 || referralCount >= 1) {
    breakdown.vipStatus = 5;
    reasoning.push('Valuable student');
  } else {
    breakdown.vipStatus = 3;
  }

  // Calculate total score (max 50 points)
  const totalScore =
    breakdown.relationshipDepth +
    breakdown.communityPotential +
    breakdown.engagement +
    breakdown.vipStatus -
    (breakdown.need * 0.5); // Reduce score for high-need students (they need attention but aren't "high tier")

  // Determine tier and recommended frequency
  let tier: StudentTier;
  let recommendedFrequencyDays: number;

  if (totalScore >= 35 || breakdown.communityPotential >= 8 || breakdown.vipStatus >= 8) {
    tier = 'PLATINUM';
    recommendedFrequencyDays = 30; // Monthly
    reasoning.push('PLATINUM tier: Monthly contact recommended');
  } else if (totalScore >= 25 || breakdown.engagement >= 8) {
    tier = 'GOLD';
    recommendedFrequencyDays = 42; // ~6 weeks
    reasoning.push('GOLD tier: Contact every 6 weeks');
  } else if (totalScore >= 15) {
    tier = 'SILVER';
    recommendedFrequencyDays = 75; // ~2.5 months
    reasoning.push('SILVER tier: Contact every 2-3 months');
  } else {
    tier = 'BRONZE';
    recommendedFrequencyDays = 105; // ~3.5 months
    reasoning.push('BRONZE tier: Contact every 3-4 months');
  }

  return {
    tier,
    score: totalScore,
    recommendedFrequencyDays,
    breakdown,
    reasoning
  };
}

/**
 * Course Duration Business Rules:
 * - A1, A2: 40 working days minimum
 * - B1, B2: 60 working days minimum
 * - NEW, SPOKEN_GERMAN: Flexible
 */
interface CourseMilestone {
  dayInCourse: number;
  milestone: 'WELCOME' | 'SETTLING_IN' | 'MID_COURSE' | 'PRE_COMPLETION' | 'COMPLETION_DUE' | 'OVERDUE';
  description: string;
  priorityBoost: number;
}

function getCourseJourneyMilestone(
  level: string,
  enrollmentDays: number,
  classesAttended: number
): CourseMilestone | null {
  // Determine course duration based on level
  let courseDuration = 40; // Default for A1/A2
  if (level === 'B1' || level === 'B2') {
    courseDuration = 60;
  } else if (level === 'NEW' || level === 'SPOKEN_GERMAN') {
    courseDuration = 30; // Shorter courses
  }

  const progressPercent = (classesAttended / courseDuration) * 100;

  // Week 1 (days 1-7): Welcome period
  if (enrollmentDays <= 7) {
    return {
      dayInCourse: enrollmentDays,
      milestone: 'WELCOME',
      description: `Week 1 welcome check-in (day ${enrollmentDays} of ${courseDuration})`,
      priorityBoost: 8
    };
  }

  // Days 8-14: Settling in
  if (enrollmentDays <= 14) {
    return {
      dayInCourse: enrollmentDays,
      milestone: 'SETTLING_IN',
      description: `Week 2 settling-in check (day ${enrollmentDays} of ${courseDuration})`,
      priorityBoost: 6
    };
  }

  // Mid-course: Around day 20 for A1/A2, day 30 for B1/B2
  const midPoint = Math.floor(courseDuration / 2);
  if (classesAttended >= midPoint - 3 && classesAttended <= midPoint + 3) {
    return {
      dayInCourse: classesAttended,
      milestone: 'MID_COURSE',
      description: `Mid-course progress check (${progressPercent.toFixed(0)}% complete)`,
      priorityBoost: 7
    };
  }

  // Pre-completion: 5-7 days before expected completion
  const preCompletionStart = courseDuration - 7;
  if (classesAttended >= preCompletionStart && classesAttended < courseDuration) {
    return {
      dayInCourse: classesAttended,
      milestone: 'PRE_COMPLETION',
      description: `Approaching completion - upsell opportunity (${courseDuration - classesAttended} classes remaining)`,
      priorityBoost: 9
    };
  }

  // Near or at expected completion
  if (classesAttended >= courseDuration && classesAttended <= courseDuration + 5) {
    return {
      dayInCourse: classesAttended,
      milestone: 'COMPLETION_DUE',
      description: `Course completion - next level discussion (${classesAttended} classes attended)`,
      priorityBoost: 10
    };
  }

  // Overdue (attended more classes than typical duration + buffer)
  if (classesAttended > courseDuration + 10) {
    return {
      dayInCourse: classesAttended,
      milestone: 'OVERDUE',
      description: `Extended beyond typical duration - retention check (${classesAttended} classes, typical: ${courseDuration})`,
      priorityBoost: 8
    };
  }

  return null;
}

/**
 * Calculate call priority based on current student situation
 */
export async function calculateCallPriority(
  studentId: string,
  reason?: string
): Promise<PriorityCalculationResult> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      interactions: {
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
        take: 1
      },
      batch: {
        select: {
          level: true,
          startDate: true
        }
      }
    }
  });

  if (!student) {
    throw new Error(`Student ${studentId} not found`);
  }

  const urgencyFactors: string[] = [];
  let priorityScore = 0;

  // Check enrollment age (new students get priority)
  const enrollmentDays = Math.floor((Date.now() - new Date(student.enrollmentDate).getTime()) / (1000 * 60 * 60 * 24));

  // NEW: Check course journey milestone
  const milestone = getCourseJourneyMilestone(
    student.currentLevel,
    enrollmentDays,
    student.classesAttended
  );

  if (milestone) {
    priorityScore += milestone.priorityBoost;
    urgencyFactors.push(milestone.description);
  }

  // Legacy check for students without milestone (fallback)
  if (!milestone && enrollmentDays <= 21) {
    priorityScore += 5;
    urgencyFactors.push('Early enrollment period - general check-in');
  }

  // Check consecutive absences
  if (student.consecutiveAbsences >= 5) {
    priorityScore += 10;
    urgencyFactors.push(`CRITICAL: ${student.consecutiveAbsences} consecutive absences`);
  } else if (student.consecutiveAbsences >= 3) {
    priorityScore += 7;
    urgencyFactors.push(`Concerning: ${student.consecutiveAbsences} consecutive absences`);
  }

  // Check churn risk
  if (student.churnRisk === 'HIGH') {
    priorityScore += 8;
    urgencyFactors.push('HIGH churn risk detected');
  } else if (student.churnRisk === 'MEDIUM') {
    priorityScore += 5;
    urgencyFactors.push('MEDIUM churn risk');
  }

  // Check payment status
  if (student.paymentStatus === 'OVERDUE') {
    priorityScore += 8;
    urgencyFactors.push('Payment overdue - needs follow-up');
  } else if (student.paymentStatus === 'PARTIAL') {
    priorityScore += 4;
    urgencyFactors.push('Partial payment - balance discussion needed');
  } else if (student.paymentStatus === 'PENDING') {
    priorityScore += 3;
    urgencyFactors.push('Payment pending');
  }

  // Check attendance rate for low performers
  const attendanceRate = Number(student.attendanceRate);
  if (attendanceRate < 50 && attendanceRate > 0) {
    priorityScore += 5;
    urgencyFactors.push('Low attendance rate (<50%)');
  }

  // Check last contact date
  if (student.interactions.length > 0) {
    const lastContactDays = Math.floor(
      (Date.now() - new Date(student.interactions[0].createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (lastContactDays >= 120) {
      priorityScore += 4;
      urgencyFactors.push(`Last contact ${lastContactDays} days ago`);
    } else if (lastContactDays >= 90) {
      priorityScore += 2;
      urgencyFactors.push(`Not contacted in 3+ months`);
    }
  } else if (enrollmentDays > 30) {
    // Never contacted and been around for a while
    priorityScore += 3;
    urgencyFactors.push('Never contacted - overdue for check-in');
  }

  // Determine priority level and reason
  let priority: CallPriority;
  let finalReason: string;

  if (priorityScore >= 12) {
    priority = 'HIGH';
    finalReason = reason || `Urgent attention needed: ${urgencyFactors.join(', ')}`;
  } else if (priorityScore >= 6) {
    priority = 'MEDIUM';
    finalReason = reason || `Recommended follow-up: ${urgencyFactors.join(', ')}`;
  } else {
    priority = 'LOW';
    finalReason = reason || urgencyFactors.length > 0
      ? `Routine check-in: ${urgencyFactors.join(', ')}`
      : 'Routine check-in for relationship maintenance';
  }

  return {
    priority,
    score: priorityScore,
    reason: finalReason,
    urgencyFactors
  };
}

/**
 * NEW: Schedule daily calls based on journey phases (Dec 2024+ students only)
 * Replaces old tier-based system with lifecycle-aware scheduling
 */
export async function scheduleDailyCalls(
  targetDate: Date,
  targetCount: number = 4
): Promise<ScheduledCall[]> {
  // NEW: Lower limit for quality over quantity (max 4 calls per day)
  const maxCalls = Math.min(targetCount, 4);

  // December 1, 2024 cutoff for new journey-based system
  const dec2024Cutoff = new Date('2024-12-01');

  // Get students who already have scheduled calls for this date
  const existingScheduledCalls = await prisma.outreachCall.findMany({
    where: {
      scheduledDate: targetDate,
      status: { in: ['PENDING', 'SNOOZED'] }
    },
    select: { studentId: true }
  });

  const scheduledStudentIds = new Set(existingScheduledCalls.map(c => c.studentId));

  // NEW: Get only December 2024+ students
  const students = await prisma.student.findMany({
    where: {
      completionStatus: 'ACTIVE',
      enrollmentDate: { gte: dec2024Cutoff }, // NEW: December 2024+ only
      id: { notIn: Array.from(scheduledStudentIds) }
    },
    include: {
      interactions: {
        where: {
          interactionType: 'PHONE_CALL'
        },
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      outreachCalls: {
        where: {
          status: 'COMPLETED'
        },
        orderBy: { completedAt: 'desc' },
        take: 1
      }
    }
  });

  // NEW: Journey-based eligibility (no fixed 21-day rule)
  // Students are eligible if they need a call based on their journey phase
  const eligibleStudents = await Promise.all(
    students.map(async (student) => {
      // Get journey phase
      const journeyPhase = await getJourneyPhase(student.id);

      // Get last call date
      const lastManualCall = student.interactions.length > 0
        ? new Date(student.interactions[0].createdAt)
        : null;

      const lastOutreachCall = student.outreachCalls.length > 0 && student.outreachCalls[0].completedAt
        ? new Date(student.outreachCalls[0].completedAt)
        : null;

      const lastCallDate = [lastManualCall, lastOutreachCall]
        .filter(d => d !== null)
        .sort((a, b) => b!.getTime() - a!.getTime())[0];

      // Calculate days since last call
      const daysSinceLastCall = lastCallDate
        ? Math.floor((Date.now() - lastCallDate.getTime()) / (1000 * 60 * 60 * 24))
        : 999; // Never called

      // Student is eligible if days since last call >= recommended next call days
      const isEligible = daysSinceLastCall >= journeyPhase.nextCallDays;

      return {
        student,
        journeyPhase,
        daysSinceLastCall,
        isEligible
      };
    })
  );

  // Filter to only eligible students
  const readyForCall = eligibleStudents.filter(s => s.isEligible);

  // NEW: Sort by journey phase priority (WELCOME & PRE_COMPLETION first, then by days overdue)
  readyForCall.sort((a, b) => {
    // Priority order: PRE_COMPLETION > WELCOME > SETTLING_IN > ACTIVE_LEARNING > POST_COURSE
    const phasePriority: Record<JourneyPhase, number> = {
      'PRE_COMPLETION': 5,
      'WELCOME': 4,
      'SETTLING_IN': 3,
      'ACTIVE_LEARNING': 2,
      'POST_COURSE': 1
    };

    const priorityDiff = phasePriority[b.journeyPhase.phase] - phasePriority[a.journeyPhase.phase];
    if (priorityDiff !== 0) return priorityDiff;

    // If same phase, prioritize students who are most overdue
    const aDaysOverdue = a.daysSinceLastCall - a.journeyPhase.nextCallDays;
    const bDaysOverdue = b.daysSinceLastCall - b.journeyPhase.nextCallDays;
    return bDaysOverdue - aDaysOverdue;
  });

  // Take top maxCalls students
  const topStudents = readyForCall.slice(0, maxCalls);

  // Create scheduled calls with journey-based context
  const scheduledCalls: ScheduledCall[] = topStudents.map(({ student, journeyPhase }) => {
    // Determine priority based on journey phase
    let priority: CallPriority;
    if (journeyPhase.phase === 'PRE_COMPLETION' || journeyPhase.phase === 'WELCOME') {
      priority = 'HIGH';
    } else if (journeyPhase.phase === 'SETTLING_IN') {
      priority = 'MEDIUM';
    } else {
      priority = 'LOW';
    }

    return {
      studentId: student.id,
      scheduledDate: targetDate,
      priority,
      reason: journeyPhase.description,
      tier: 'SILVER', // Placeholder for backward compatibility (deprecated)
      studentName: student.name,
      whatsapp: student.whatsapp
    };
  });

  return scheduledCalls;
}

/**
 * Determine when to schedule the next call after completing one
 */
export async function scheduleNextCall(
  studentId: string,
  currentCallNotes: string
): Promise<Date> {
  const tier = await calculateStudentTier(studentId);
  const priority = await calculateCallPriority(studentId);

  // Start with tier-based frequency
  let daysUntilNext = tier.recommendedFrequencyDays;

  // Adjust based on call notes keywords
  const notes = currentCallNotes.toLowerCase();

  if (notes.includes('urgent') || notes.includes('immediate') || notes.includes('asap')) {
    daysUntilNext = 7; // Follow up in 1 week
  } else if (notes.includes('follow up') || notes.includes('check in')) {
    daysUntilNext = Math.min(daysUntilNext, 14); // Within 2 weeks
  } else if (notes.includes('doing well') || notes.includes('happy') || notes.includes('satisfied')) {
    daysUntilNext = Math.max(daysUntilNext, 60); // Can wait longer
  }

  // Priority override
  if (priority.priority === 'HIGH') {
    daysUntilNext = Math.min(daysUntilNext, 21); // Max 3 weeks for high priority
  }

  // Calculate next call date
  const nextCallDate = new Date();
  nextCallDate.setDate(nextCallDate.getDate() + daysUntilNext);

  // Adjust to weekday if lands on weekend
  const dayOfWeek = nextCallDate.getDay();
  if (dayOfWeek === 0) { // Sunday
    nextCallDate.setDate(nextCallDate.getDate() + 1); // Move to Monday
  } else if (dayOfWeek === 6) { // Saturday
    nextCallDate.setDate(nextCallDate.getDate() + 2); // Move to Monday
  }

  return nextCallDate;
}

/**
 * Check if a date is a weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Get next weekday from a given date
 */
export function getNextWeekday(date: Date): Date {
  const nextDate = new Date(date);
  while (isWeekend(nextDate)) {
    nextDate.setDate(nextDate.getDate() + 1);
  }
  return nextDate;
}
