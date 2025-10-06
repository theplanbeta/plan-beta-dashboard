// Invoice generation types - compatible with existing invoice generator

export interface InvoiceData {
  // Invoice metadata
  invoiceNumber: string
  date: string
  dueDate: string
  currency: 'EUR' | 'INR'

  // Student information
  studentName: string
  studentAddress?: string
  studentEmail?: string
  studentPhone?: string

  // Course items
  items: InvoiceItem[]

  // Payment details
  payableNow: number
  remainingAmount: number

  // Additional terms
  additionalNotes?: string
}

export interface InvoiceItem {
  level: string
  description: string
  month: string
  batch: string
  amount: number
}

export interface InvoiceGenerationOptions {
  format: 'PDF' | 'JPG'
  sendEmail?: boolean
}
