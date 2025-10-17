import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readReceiptFile } from '@/lib/receipt-storage'
import { createAuditLog } from '@/lib/audit'

// GET /api/receipts/[id]/download?format=pdf|jpg
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'pdf'

    if (format !== 'pdf' && format !== 'jpg') {
      return NextResponse.json(
        { error: 'Invalid format. Must be pdf or jpg' },
        { status: 400 }
      )
    }

    // Fetch receipt
    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        payment: {
          include: {
            student: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    // Get the appropriate file path
    const filePath = format === 'pdf' ? receipt.pdfPath : receipt.jpgPath

    if (!filePath) {
      return NextResponse.json(
        { error: `${format.toUpperCase()} file not available for this receipt` },
        { status: 404 }
      )
    }

    // Read and decompress file
    const fileBuffer = await readReceiptFile(filePath)

    // Update download count and last accessed time
    await prisma.receipt.update({
      where: { id },
      data: {
        downloadCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    })

    // Log audit action
    await createAuditLog({
      action: 'RECEIPT_DOWNLOADED',
      description: `Downloaded ${format.toUpperCase()} receipt ${receipt.receiptNumber}`,
      entityType: 'Receipt',
      entityId: receipt.id,
      metadata: {
        receiptNumber: receipt.receiptNumber,
        format,
        studentName: receipt.payment.student.name,
      },
      request: req,
    })

    // Set appropriate content type and filename
    const contentType = format === 'pdf' ? 'application/pdf' : 'image/jpeg'
    const studentName = receipt.payment.student.name.replace(/\s+/g, '_')
    const filename = `Receipt_${receipt.receiptNumber}_${studentName}.${format}`

    // Return file with appropriate headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error('Error downloading receipt:', error)
    return NextResponse.json(
      {
        error: 'Failed to download receipt',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
