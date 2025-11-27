import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import jsPDF from "jspdf"
import "jspdf-autotable"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Only FOUNDER can use custom invoice generator
    if (!session || session.user.role !== "FOUNDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()

    const doc = new jsPDF()
    const currencySymbol = data.invoice.currency === "EUR" ? "€" : "₹"

    // Colors
    const primaryColor: [number, number, number] = [37, 99, 235] // Blue
    const textDark: [number, number, number] = [31, 41, 55]
    const textGray: [number, number, number] = [107, 114, 128]

    // Header
    doc.setFillColor(...primaryColor)
    doc.rect(0, 0, 210, 40, "F")

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont("helvetica", "bold")
    doc.text("INVOICE", 15, 25)

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`#${data.invoice.number}`, 15, 33)

    // From section (right side of header)
    doc.setFontSize(9)
    const fromLines = [
      data.from.name,
      ...data.from.address.split('\n'),
      data.from.email,
      data.from.phone,
      data.from.taxId ? `Tax ID: ${data.from.taxId}` : null,
    ].filter(Boolean)

    let yPos = 50
    doc.setTextColor(...textDark)
    doc.setFont("helvetica", "bold")
    doc.text("FROM:", 15, yPos)
    doc.setFont("helvetica", "normal")
    yPos += 5
    fromLines.forEach((line) => {
      doc.text(line, 15, yPos)
      yPos += 4
    })

    // To section
    yPos = 50
    doc.setFont("helvetica", "bold")
    doc.text("BILL TO:", 120, yPos)
    doc.setFont("helvetica", "normal")
    yPos += 5
    const toLines = [
      data.to.name,
      ...data.to.address.split('\n'),
      data.to.email,
      data.to.phone,
    ].filter(Boolean)
    toLines.forEach((line) => {
      doc.text(line, 120, yPos)
      yPos += 4
    })

    // Invoice details
    yPos = Math.max(yPos, 50 + fromLines.length * 4) + 10
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text(`Date: `, 120, yPos)
    doc.setFont("helvetica", "normal")
    doc.text(new Date(data.invoice.date).toLocaleDateString(), 150, yPos)
    yPos += 5
    doc.setFont("helvetica", "bold")
    doc.text(`Due Date: `, 120, yPos)
    doc.setFont("helvetica", "normal")
    doc.text(new Date(data.invoice.dueDate).toLocaleDateString(), 150, yPos)

    // Items table
    yPos += 15
    const tableData = data.items.map((item: any) => [
      item.description,
      item.quantity.toString(),
      `${currencySymbol}${item.rate.toFixed(2)}`,
      `${currencySymbol}${item.amount.toFixed(2)}`,
    ])

    ;(doc as any).autoTable({
      startY: yPos,
      head: [["Description", "Qty", "Rate", "Amount"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 30, halign: "right" },
        2: { cellWidth: 35, halign: "right" },
        3: { cellWidth: 35, halign: "right" },
      },
    })

    // Get final Y position after table
    yPos = (doc as any).lastAutoTable.finalY + 10

    // Totals
    const totalsX = 120
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)

    doc.text("Subtotal:", totalsX, yPos)
    doc.text(`${currencySymbol}${data.subtotal.toFixed(2)}`, 185, yPos, { align: "right" })
    yPos += 6

    doc.text(`Tax (${data.tax.rate}%):`, totalsX, yPos)
    doc.text(`${currencySymbol}${data.tax.amount.toFixed(2)}`, 185, yPos, { align: "right" })
    yPos += 8

    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(...primaryColor)
    doc.text("TOTAL:", totalsX, yPos)
    doc.text(`${currencySymbol}${data.total.toFixed(2)}`, 185, yPos, { align: "right" })

    // Notes
    if (data.notes) {
      yPos += 15
      doc.setFontSize(9)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...textDark)
      doc.text("Notes:", 15, yPos)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...textGray)
      yPos += 5
      const notesLines = doc.splitTextToSize(data.notes, 180)
      doc.text(notesLines, 15, yPos)
      yPos += notesLines.length * 4
    }

    // Payment terms
    if (data.paymentTerms) {
      yPos += 8
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...textDark)
      doc.text("Payment Terms:", 15, yPos)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...textGray)
      yPos += 5
      const termsLines = doc.splitTextToSize(data.paymentTerms, 180)
      doc.text(termsLines, 15, yPos)
    }

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(...textGray)
    doc.text("Thank you for your business!", 105, 285, { align: "center" })

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"))

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${data.invoice.number}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating custom invoice:", error)
    return NextResponse.json(
      { error: "Failed to generate invoice" },
      { status: 500 }
    )
  }
}
