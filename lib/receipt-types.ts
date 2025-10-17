// Receipt generation types

export type PaymentMethod = 'UPI' | 'Bank Transfer' | 'Cash' | 'Card' | 'Other'
export type PaymentStatus = 'PAID_IN_FULL' | 'PARTIAL_PAYMENT'

export interface ReceiptData {
  // Receipt metadata
  receiptNumber: string
  date: string // Date payment was received
  currency: 'EUR' | 'INR'

  // Student information
  studentName: string
  studentAddress?: string
  studentEmail?: string
  studentPhone?: string

  // Course items
  items: ReceiptItem[]

  // Payment details
  amountPaid: number
  totalAmount: number
  balanceRemaining: number
  paymentMethod: PaymentMethod
  transactionReference?: string // Optional transaction ID/reference
  paymentStatus: PaymentStatus

  // Related invoice
  invoiceNumber?: string

  // Additional notes
  additionalNotes?: string
}

export interface ReceiptItem {
  level: string
  description: string
  month: string
  batch: string
  amount: number
}

export interface ReceiptGenerationOptions {
  format: 'PDF' | 'JPG'
  sendEmail?: boolean
}
