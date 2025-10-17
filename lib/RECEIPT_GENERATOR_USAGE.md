# Receipt Generator Usage Guide

The receipt generator creates professional payment receipts in PDF or JPG format, based on the same design system as the invoice generator.

## Features

- **Professional Design**: Matches the Plan Beta branding with red header and green "PAID" indicators
- **Payment Status**: Shows PAID badge, payment method, and transaction reference
- **Balance Tracking**: Displays remaining balance if partial payment
- **Multiple Formats**: Generate both PDF and JPG receipts
- **Course Details**: Lists all course items with levels and amounts
- **Payment Summary**: Clear breakdown of total, paid, and balance

## Installation

The receipt generator uses the same dependencies as the invoice generator:
- `jspdf` - PDF generation
- `jspdf-autotable` - Table formatting
- `html2canvas` - JPG generation

These should already be installed in your project.

## Basic Usage

### 1. Import the Generator

```typescript
import {
  downloadReceipt,
  previewReceipt,
  generateReceiptJPG
} from '@/lib/receipt-generator'
import type { ReceiptData } from '@/lib/receipt-types'
```

### 2. Prepare Receipt Data

```typescript
const receiptData: ReceiptData = {
  // Receipt metadata
  receiptNumber: 'RCP-2024-001',
  date: '15 Jan 2024',
  currency: 'INR',

  // Student information
  studentName: 'John Doe',
  studentEmail: 'john@example.com',
  studentPhone: '+91 9876543210',
  studentAddress: '123 Main Street\nBangalore, Karnataka',

  // Course items
  items: [
    {
      level: 'A1',
      description: 'German Language Course - A1 Level',
      month: 'January',
      batch: 'Morning Batch',
      amount: 14000
    }
  ],

  // Payment details
  totalAmount: 14000,
  amountPaid: 7000,
  balanceRemaining: 7000,
  paymentMethod: 'UPI',
  transactionReference: 'UPI123456789',
  paymentStatus: 'PARTIAL_PAYMENT',

  // Related invoice (optional)
  invoiceNumber: 'INV-2024-001',

  // Additional notes (optional)
  additionalNotes: 'Partial payment received. Balance due before first class.'
}
```

### 3. Generate Receipt

#### Download as PDF
```typescript
// Downloads receipt as PDF
await downloadReceipt(receiptData)

// Custom filename
await downloadReceipt(receiptData, 'Receipt_Jan_2024.pdf')
```

#### Preview Receipt
```typescript
// Get data URL for preview
const dataUrl = await previewReceipt(receiptData)

// Use in iframe or img tag
<iframe src={dataUrl} />
```

#### Generate JPG
```typescript
// Downloads receipt as JPG image
await generateReceiptJPG(receiptData)
```

## Data Structure

### ReceiptData Interface

```typescript
interface ReceiptData {
  // Receipt metadata
  receiptNumber: string        // Unique receipt number
  date: string                  // Payment received date
  currency: 'EUR' | 'INR'      // Currency used

  // Student information
  studentName: string
  studentAddress?: string       // Optional
  studentEmail?: string         // Optional
  studentPhone?: string         // Optional

  // Course items
  items: ReceiptItem[]

  // Payment details
  amountPaid: number           // Amount paid in this transaction
  totalAmount: number          // Total course fee
  balanceRemaining: number     // Remaining balance (0 if paid in full)
  paymentMethod: PaymentMethod // How payment was made
  transactionReference?: string // Transaction ID (optional)
  paymentStatus: PaymentStatus // PAID_IN_FULL or PARTIAL_PAYMENT

  // Related invoice (optional)
  invoiceNumber?: string       // Original invoice number

  // Additional notes (optional)
  additionalNotes?: string
}
```

### Payment Methods

```typescript
type PaymentMethod =
  | 'UPI'
  | 'Bank Transfer'
  | 'Cash'
  | 'Card'
  | 'Other'
```

### Payment Status

```typescript
type PaymentStatus =
  | 'PAID_IN_FULL'      // Full payment received
  | 'PARTIAL_PAYMENT'   // Partial payment received
```

## Examples

### Example 1: Full Payment Receipt

```typescript
const fullPaymentReceipt: ReceiptData = {
  receiptNumber: 'RCP-2024-042',
  date: '15 Jan 2024',
  currency: 'INR',

  studentName: 'Priya Sharma',
  studentEmail: 'priya@example.com',
  studentPhone: '+91 9876543210',

  items: [{
    level: 'A1',
    description: 'German Language Course - A1 Level',
    month: 'January',
    batch: 'Evening Batch',
    amount: 14000
  }],

  totalAmount: 14000,
  amountPaid: 14000,
  balanceRemaining: 0,
  paymentMethod: 'UPI',
  transactionReference: '240115UPI123456',
  paymentStatus: 'PAID_IN_FULL',
  invoiceNumber: 'INV-2024-042'
}

await downloadReceipt(fullPaymentReceipt)
```

### Example 2: Partial Payment Receipt

```typescript
const partialPaymentReceipt: ReceiptData = {
  receiptNumber: 'RCP-2024-043',
  date: '16 Jan 2024',
  currency: 'INR',

  studentName: 'Rahul Verma',
  studentEmail: 'rahul@example.com',
  studentPhone: '+91 9876543211',

  items: [{
    level: 'B1',
    description: 'German Language Course - B1 Level',
    month: 'February',
    batch: 'Morning Batch',
    amount: 18000
  }],

  totalAmount: 18000,
  amountPaid: 9000,
  balanceRemaining: 9000,
  paymentMethod: 'Bank Transfer',
  transactionReference: 'NEFT240116001',
  paymentStatus: 'PARTIAL_PAYMENT',
  invoiceNumber: 'INV-2024-043',
  additionalNotes: 'First installment received. Balance due by Feb 10, 2024.'
}

await downloadReceipt(partialPaymentReceipt)
```

### Example 3: Multiple Course Levels

```typescript
const comboCourseReceipt: ReceiptData = {
  receiptNumber: 'RCP-2024-044',
  date: '17 Jan 2024',
  currency: 'EUR',

  studentName: 'Sarah Johnson',
  studentEmail: 'sarah@example.com',
  studentPhone: '+49 123 456789',
  studentAddress: 'Berlin, Germany',

  items: [
    {
      level: 'A1',
      description: 'German Language Course - A1 Level',
      month: 'January',
      batch: 'Evening Batch',
      amount: 134
    },
    {
      level: 'A2',
      description: 'German Language Course - A2 Level',
      month: 'March',
      batch: 'Evening Batch',
      amount: 156
    }
  ],

  totalAmount: 290,
  amountPaid: 290,
  balanceRemaining: 0,
  paymentMethod: 'Card',
  transactionReference: 'CARD240117ABC',
  paymentStatus: 'PAID_IN_FULL',
  invoiceNumber: 'INV-2024-044'
}

await downloadReceipt(comboCourseReceipt)
```

### Example 4: Cash Payment

```typescript
const cashReceipt: ReceiptData = {
  receiptNumber: 'RCP-2024-045',
  date: '18 Jan 2024',
  currency: 'INR',

  studentName: 'Amit Patel',
  studentEmail: 'amit@example.com',
  studentPhone: '+91 9876543212',

  items: [{
    level: 'Spoken German',
    description: 'Spoken German Course',
    month: 'January',
    batch: 'Weekend Batch',
    amount: 12000
  }],

  totalAmount: 12000,
  amountPaid: 12000,
  balanceRemaining: 0,
  paymentMethod: 'Cash',
  paymentStatus: 'PAID_IN_FULL',
  invoiceNumber: 'INV-2024-045',
  additionalNotes: 'Cash payment received in person.'
}

await downloadReceipt(cashReceipt)
```

## Design Features

### Visual Elements

1. **Header**: Red branded header with Plan Beta logo and school info
2. **PAID Badge**: Green "PAID" badge next to receipt title
3. **Payment Info Box**: Green bordered box showing payment method and transaction details
4. **Status Indicator**:
   - Green "✓ PAID IN FULL" for complete payments
   - Red "Balance Due" for partial payments
5. **Course Table**: Color-coded level badges matching invoice design
6. **Acknowledgment Box**: Green success box confirming payment received

### Color Scheme

- **Brand Red**: `#d2302c` - Header, footer, invoice references
- **Success Green**: `#16a34a` - PAID status, payment confirmations
- **Light Green**: `#dcfce7` - Background for payment boxes
- **Text Colors**: Dark gray for content, light gray for secondary info

## Integration with Invoice System

The receipt generator is designed to work seamlessly with the invoice generator:

```typescript
// Generate invoice
const invoiceData = { /* ... */ }
await downloadInvoice(invoiceData)

// Later, when payment is received, generate receipt
const receiptData: ReceiptData = {
  receiptNumber: generateReceiptNumber(),
  date: new Date().toLocaleDateString(),
  currency: invoiceData.currency,
  studentName: invoiceData.studentName,
  studentEmail: invoiceData.studentEmail,
  studentPhone: invoiceData.studentPhone,
  items: invoiceData.items,
  totalAmount: invoiceData.payableNow + invoiceData.remainingAmount,
  amountPaid: 7000, // Actual payment received
  balanceRemaining: 7000,
  paymentMethod: 'UPI',
  transactionReference: 'UPI123456',
  paymentStatus: 'PARTIAL_PAYMENT',
  invoiceNumber: invoiceData.invoiceNumber
}

await downloadReceipt(receiptData)
```

## Best Practices

1. **Receipt Numbers**: Use a consistent numbering scheme (e.g., `RCP-YYYY-NNN`)
2. **Transaction References**: Always include transaction reference for digital payments
3. **Balance Display**: Always show balance remaining, even if zero
4. **Payment Method**: Be specific (e.g., "UPI - PhonePe" instead of just "UPI")
5. **Notes**: Add payment-specific notes for clarity
6. **Invoice Link**: Always reference the original invoice number if available

## Error Handling

```typescript
try {
  await downloadReceipt(receiptData)
  console.log('Receipt generated successfully')
} catch (error) {
  console.error('Failed to generate receipt:', error)
  // Handle error appropriately
}
```

## Browser Compatibility

The receipt generator works in all modern browsers that support:
- Canvas API (for JPG generation)
- Blob API (for downloads)
- jsPDF library

## Notes

- Receipts are generated client-side in the browser
- No data is sent to external servers
- Logo image must be available at `/blogo.png`
- Bank details are loaded from `lib/pricing.ts`
- All currency formatting is handled automatically
