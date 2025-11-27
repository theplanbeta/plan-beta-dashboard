/**
 * API endpoint to trigger Google Meet recording for a specific batch
 * POST /api/recordings/trigger
 *
 * Body: { batchId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { batchId } = await req.json();

    if (!batchId) {
      return NextResponse.json(
        { error: 'batchId is required' },
        { status: 400 }
      );
    }

    // Fetch batch details
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        teacher: true,
      },
    });

    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    if (!batch.meetLink) {
      return NextResponse.json(
        { error: 'No Google Meet link configured for this batch' },
        { status: 400 }
      );
    }

    if (!batch.autoRecord) {
      return NextResponse.json(
        { error: 'Auto-recording is disabled for this batch' },
        { status: 400 }
      );
    }

    // Create recording log entry
    const recordingLog = await prisma.recordingLog.create({
      data: {
        batchId: batch.id,
        batchCode: batch.batchCode,
        meetLink: batch.meetLink,
        scheduledTime: new Date(),
        status: 'STARTED',
      },
    });

    console.log(`📹 Starting recording for batch ${batch.batchCode}`);
    console.log(`   Meet Link: ${batch.meetLink}`);
    console.log(`   Level: ${batch.level}`);
    console.log(`   Timing: ${batch.timing}`);

    // Trigger the recording script in the background
    const scriptPath = path.join(process.cwd(), 'scripts', 'google-meet-recorder.ts');
    const className = `${batch.level} ${batch.timing || ''} - ${batch.batchCode}`.trim();

    // Run the script in the background using nohup
    const command = `nohup npx tsx "${scriptPath}" "${batch.meetLink}" "${className}" > /dev/null 2>&1 &`;

    try {
      await execAsync(command);

      // Update recording log
      await prisma.recordingLog.update({
        where: { id: recordingLog.id },
        data: {
          startedAt: new Date(),
          status: 'RECORDING',
        },
      });

      console.log(`✅ Recording started successfully for ${batch.batchCode}`);

      return NextResponse.json({
        success: true,
        message: `Recording started for batch ${batch.batchCode}`,
        batchCode: batch.batchCode,
        className,
        recordingLogId: recordingLog.id,
      });

    } catch (error) {
      console.error(`❌ Failed to start recording for ${batch.batchCode}:`, error);

      // Update recording log with error
      await prisma.recordingLog.update({
        where: { id: recordingLog.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      return NextResponse.json(
        {
          error: 'Failed to start recording',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in recording trigger endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
