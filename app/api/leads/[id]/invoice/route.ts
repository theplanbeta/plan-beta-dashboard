import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPrice, REFUND_POLICY } from '@/lib/pricing'
import { logSuccess, logError } from '@/lib/audit'
import { AuditAction } from '@prisma/client'

// Generate invoice number
function generateInvoiceNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0')
  return `INV-${year}${month}${day}-${time}`
}

// POST /api/leads/[id]/invoice - Generate invoice for lead
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    const {
      currency = 'EUR',
      originalPrice,
      discountApplied = 0,
      payableNow,
      enrollmentType,
      customItems,
    } = body

    // Fetch lead with all details
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        interestedBatch: {
          select: {
            batchCode: true,
            level: true,
            schedule: true,
          },
        },
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    if (lead.converted) {
      return NextResponse.json(
        { error: 'Lead already converted' },
        { status: 400 }
      )
    }

    // Calculate amounts
    const finalPrice = originalPrice - discountApplied
    const remainingAmount = finalPrice - (payableNow || 0)

    // Build invoice items
    const items = customItems || [
      {
        level: lead.interestedLevel || 'A1',
        description: 'German Language Course',
        month: lead.interestedMonth || new Date().toLocaleString('default', { month: 'long' }),
        batch: lead.interestedBatchTime || 'TBD',
        amount: originalPrice,
      },
    ]

    // Create invoice in database
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        date: new Date(),
        dueDate: new Date(), // Same day for now
        currency,
        status: 'DRAFT',
        totalAmount: finalPrice,
        paidAmount: 0,
        remainingAmount: finalPrice,
        items: items,
        leadId: lead.id,
        sentToEmail: lead.email || undefined,
        notes: REFUND_POLICY,
      },
    })

    // Audit log: Invoice generated
    await logSuccess(
      AuditAction.INVOICE_GENERATED,
      `Invoice ${invoice.invoiceNumber} generated for lead ${lead.name} (${currency}${finalPrice})`,
      {
        entityType: 'Invoice',
        entityId: invoice.id,
        metadata: {
          leadId: lead.id,
          leadName: lead.name,
          invoiceNumber: invoice.invoiceNumber,
          currency,
          totalAmount: finalPrice,
          payableNow: payableNow || 0,
        },
        request: req,
      }
    )

    // Return invoice data for generation
    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.date.toISOString().split('T')[0],
        dueDate: invoice.dueDate.toISOString().split('T')[0],
        currency: invoice.currency,

        // Lead/Student info
        studentName: lead.name,
        studentAddress: '', // Can add to Lead model later
        studentEmail: lead.email || '',
        studentPhone: lead.whatsapp,

        // Items
        items: items,

        // Payment
        payableNow: payableNow || 0,
        remainingAmount: remainingAmount,

        // Terms
        additionalNotes: REFUND_POLICY,
      },
    })
  } catch (error) {
    console.error('Lead invoice generation error:', error)

    // Audit log: Error
    await logError(
      AuditAction.API_ERROR,
      `Failed to generate invoice for lead`,
      error as Error,
      {
        entityType: 'Lead',
        entityId: 'unknown',
        request: req,
      }
    )

    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    )
  }
}

// GET /api/leads/[id]/invoice - Get invoices for lead
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

    const invoices = await prisma.invoice.findMany({
      where: { leadId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(invoices)
  } catch (error) {
    console.error('Get invoices error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}
