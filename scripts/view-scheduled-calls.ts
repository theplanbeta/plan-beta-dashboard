#!/usr/bin/env tsx
/**
 * View and manage scheduled outreach calls
 * Useful for founder to see daily schedule
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'today';

  console.log('========================================');
  console.log('OUTREACH CALLS VIEWER');
  console.log('========================================\n');

  switch (command) {
    case 'today':
      await viewToday();
      break;
    case 'week':
      await viewWeek();
      break;
    case 'pending':
      await viewPending();
      break;
    case 'stats':
      await viewStats();
      break;
    default:
      console.log('Usage: tsx scripts/view-scheduled-calls.ts [command]\n');
      console.log('Commands:');
      console.log('  today   - View today\'s scheduled calls');
      console.log('  week    - View this week\'s calls');
      console.log('  pending - View all pending calls');
      console.log('  stats   - View scheduling statistics\n');
  }

  await prisma.$disconnect();
}

async function viewToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const calls = await prisma.outreachCall.findMany({
    where: {
      scheduledDate: {
        gte: today,
        lt: tomorrow
      }
    },
    include: {
      student: {
        select: {
          name: true,
          whatsapp: true,
          currentLevel: true,
          churnRisk: true,
          consecutiveAbsences: true
        }
      }
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' }
    ]
  });

  console.log(`📅 Today's Calls (${today.toDateString()})\n`);

  if (calls.length === 0) {
    console.log('No calls scheduled for today.\n');
    return;
  }

  console.log(`Total: ${calls.length} calls\n`);

  const byPriority = {
    HIGH: calls.filter(c => c.priority === 'HIGH').length,
    MEDIUM: calls.filter(c => c.priority === 'MEDIUM').length,
    LOW: calls.filter(c => c.priority === 'LOW').length
  };

  console.log('Priority Breakdown:');
  console.log(`  HIGH: ${byPriority.HIGH}`);
  console.log(`  MEDIUM: ${byPriority.MEDIUM}`);
  console.log(`  LOW: ${byPriority.LOW}\n`);

  console.log('Scheduled Calls:\n');

  calls.forEach((call, idx) => {
    const priorityIcon = call.priority === 'HIGH' ? '🔴' : call.priority === 'MEDIUM' ? '🟡' : '🟢';
    const statusIcon = call.status === 'COMPLETED' ? '✅' : call.status === 'SNOOZED' ? '😴' : '📞';

    console.log(`${idx + 1}. ${priorityIcon} [${call.priority}] ${call.student.name}`);
    console.log(`   Status: ${statusIcon} ${call.status}`);
    console.log(`   Type: ${call.callType}`);
    console.log(`   WhatsApp: ${call.student.whatsapp}`);
    console.log(`   Level: ${call.student.currentLevel}`);
    console.log(`   Purpose: ${call.purpose}`);

    if (call.preCallNotes) {
      console.log(`   Notes: ${call.preCallNotes}`);
    }

    if (call.student.churnRisk === 'HIGH') {
      console.log(`   ⚠️  HIGH CHURN RISK`);
    }

    if (call.student.consecutiveAbsences >= 3) {
      console.log(`   ⚠️  ${call.student.consecutiveAbsences} consecutive absences`);
    }

    console.log('');
  });
}

async function viewWeek() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const calls = await prisma.outreachCall.findMany({
    where: {
      scheduledDate: {
        gte: today,
        lt: nextWeek
      }
    },
    include: {
      student: {
        select: {
          name: true,
          whatsapp: true
        }
      }
    },
    orderBy: [
      { scheduledDate: 'asc' },
      { priority: 'desc' }
    ]
  });

  console.log(`📅 This Week's Calls (${today.toDateString()} - ${nextWeek.toDateString()})\n`);

  if (calls.length === 0) {
    console.log('No calls scheduled this week.\n');
    return;
  }

  console.log(`Total: ${calls.length} calls\n`);

  // Group by date
  const callsByDate = new Map<string, typeof calls>();

  calls.forEach(call => {
    const dateKey = call.scheduledDate.toISOString().split('T')[0];
    if (!callsByDate.has(dateKey)) {
      callsByDate.set(dateKey, []);
    }
    callsByDate.get(dateKey)!.push(call);
  });

  // Display by date
  for (const [dateKey, dateCalls] of callsByDate) {
    const date = new Date(dateKey);
    console.log(`${date.toDateString()} - ${dateCalls.length} calls`);

    const byPriority = {
      HIGH: dateCalls.filter(c => c.priority === 'HIGH').length,
      MEDIUM: dateCalls.filter(c => c.priority === 'MEDIUM').length,
      LOW: dateCalls.filter(c => c.priority === 'LOW').length
    };

    console.log(`  Priority: HIGH=${byPriority.HIGH}, MEDIUM=${byPriority.MEDIUM}, LOW=${byPriority.LOW}`);

    dateCalls.forEach(call => {
      const priorityIcon = call.priority === 'HIGH' ? '🔴' : call.priority === 'MEDIUM' ? '🟡' : '🟢';
      console.log(`  ${priorityIcon} ${call.student.name} (${call.callType})`);
    });

    console.log('');
  }
}

async function viewPending() {
  const calls = await prisma.outreachCall.findMany({
    where: {
      status: 'PENDING'
    },
    include: {
      student: {
        select: {
          name: true,
          whatsapp: true
        }
      }
    },
    orderBy: [
      { scheduledDate: 'asc' },
      { priority: 'desc' }
    ]
  });

  console.log(`📋 All Pending Calls\n`);

  if (calls.length === 0) {
    console.log('No pending calls.\n');
    return;
  }

  console.log(`Total: ${calls.length} pending calls\n`);

  calls.forEach((call, idx) => {
    const priorityIcon = call.priority === 'HIGH' ? '🔴' : call.priority === 'MEDIUM' ? '🟡' : '🟢';

    console.log(`${idx + 1}. ${priorityIcon} ${call.student.name} - ${new Date(call.scheduledDate).toDateString()}`);
    console.log(`   Priority: ${call.priority} | Type: ${call.callType}`);
    console.log(`   Purpose: ${call.purpose}\n`);
  });
}

async function viewStats() {
  const totalCalls = await prisma.outreachCall.count();
  const pendingCalls = await prisma.outreachCall.count({ where: { status: 'PENDING' } });
  const completedCalls = await prisma.outreachCall.count({ where: { status: 'COMPLETED' } });
  const snoozedCalls = await prisma.outreachCall.count({ where: { status: 'SNOOZED' } });

  const highPriority = await prisma.outreachCall.count({ where: { priority: 'HIGH', status: 'PENDING' } });
  const mediumPriority = await prisma.outreachCall.count({ where: { priority: 'MEDIUM', status: 'PENDING' } });
  const lowPriority = await prisma.outreachCall.count({ where: { priority: 'LOW', status: 'PENDING' } });

  console.log('📊 Scheduling Statistics\n');

  console.log('Overall:');
  console.log(`  Total calls: ${totalCalls}`);
  console.log(`  Pending: ${pendingCalls}`);
  console.log(`  Completed: ${completedCalls}`);
  console.log(`  Snoozed: ${snoozedCalls}\n`);

  console.log('Pending by Priority:');
  console.log(`  🔴 HIGH: ${highPriority}`);
  console.log(`  🟡 MEDIUM: ${mediumPriority}`);
  console.log(`  🟢 LOW: ${lowPriority}\n`);

  // Get next 7 days breakdown
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log('Next 7 Days Breakdown:');

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);

    const count = await prisma.outreachCall.count({
      where: {
        scheduledDate: {
          gte: date,
          lt: nextDay
        },
        status: 'PENDING'
      }
    });

    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dateStr = date.toDateString();

    if (count > 0) {
      console.log(`  ${dayOfWeek} ${dateStr}: ${count} calls`);
    } else {
      console.log(`  ${dayOfWeek} ${dateStr}: -`);
    }
  }

  console.log('');
}

main().catch(console.error);
