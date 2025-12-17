/**
 * API endpoint to trigger recordings for all batches scheduled at current time
 * POST /api/recordings/trigger-scheduled
 *
 * This endpoint should be called by a cron job at:
 * - 6:55 AM CET (to start recording for 7 AM classes)
 * - 4:55 PM CET (to start recording for 5 PM classes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BatchStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    // Verify the request is from authorized source (e.g., cron secret)
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET environment variable is not set');
      return NextResponse.json(
        { error: 'Server misconfigured' },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Determine which timing we're checking based on current hour (CET)
    const now = new Date();
    const cetHour = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' })).getHours();

    let timing: string;
    if (cetHour === 6) {
      timing = 'MORNING'; // 6:55 AM CET - trigger morning classes
    } else if (cetHour === 16) {
      timing = 'EVENING'; // 4:55 PM CET - trigger evening classes
    } else {
      return NextResponse.json({
        message: 'No scheduled recordings at this time',
        currentHour: cetHour,
      });
    }

    console.log(`\n📅 Checking for ${timing} batches to record...`);

    // Find all active batches with the specified timing and auto-recording enabled
    const batches = await prisma.batch.findMany({
      where: {
        timing,
        autoRecord: true,
        status: BatchStatus.RUNNING, // Only running batches
        meetLink: {
          not: null,
        },
        startDate: {
          lte: now, // Batch has already started
        },
        OR: [
          { endDate: null }, // No end date
          { endDate: { gte: now } }, // Or hasn't ended yet
        ],
      },
      include: {
        teacher: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    console.log(`   Found ${batches.length} batches to record`);

    if (batches.length === 0) {
      return NextResponse.json({
        message: 'No batches found for recording',
        timing,
        currentHour: cetHour,
      });
    }

    // Trigger recording for each batch
    const results = await Promise.allSettled(
      batches.map(async (batch) => {
        console.log(`\n   📹 Triggering ${batch.batchCode} (${batch.level})...`);

        // Call the trigger endpoint for this batch
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/recordings/trigger`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            batchId: batch.id,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          console.log(`      ✅ Success: ${batch.batchCode}`);
          return {
            batchCode: batch.batchCode,
            level: batch.level,
            success: true,
            ...data,
          };
        } else {
          console.log(`      ❌ Failed: ${batch.batchCode} - ${data.error}`);
          return {
            batchCode: batch.batchCode,
            level: batch.level,
            success: false,
            error: data.error,
          };
        }
      })
    );

    // Collect results
    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));

    console.log(`\n✅ Successfully started ${successful.length} recordings`);
    console.log(`❌ Failed to start ${failed.length} recordings\n`);

    return NextResponse.json({
      success: true,
      timing,
      totalBatches: batches.length,
      successful: successful.length,
      failed: failed.length,
      details: results.map((r) => r.status === 'fulfilled' ? r.value : { error: 'Unknown error' }),
    });

  } catch (error) {
    console.error('Error in scheduled recording trigger:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Allow GET for testing
export async function GET(req: NextRequest) {
  const now = new Date();
  const cetHour = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' })).getHours();

  // Find all batches with auto-recording enabled
  const morningBatches = await prisma.batch.count({
    where: {
      timing: 'MORNING',
      autoRecord: true,
      status: BatchStatus.RUNNING,
      meetLink: { not: null },
    },
  });

  const eveningBatches = await prisma.batch.count({
    where: {
      timing: 'EVENING',
      autoRecord: true,
      status: BatchStatus.RUNNING,
      meetLink: { not: null },
    },
  });

  return NextResponse.json({
    currentCETHour: cetHour,
    morningBatches,
    eveningBatches,
    message: 'Use POST to trigger recordings',
  });
}
