"use client"

import { useState } from "react"
import { Plus, Trash2, Download } from "lucide-react"

interface InvoiceItem {
  description: string
  quantity: number
  rate: number
  amount: number
}

export default function CustomInvoicePage() {
  const [loading, setLoading] = useState(false)

  // From details
  const [fromName, setFromName] = useState("Deepak")
  const [fromAddress, setFromAddress] = useState("")
  const [fromEmail, setFromEmail] = useState("")
  const [fromPhone, setFromPhone] = useState("")
  const [fromTaxId, setFromTaxId] = useState("")

  // To details
  const [toName, setToName] = useState("")
  const [toAddress, setToAddress] = useState("")
  const [toEmail, setToEmail] = useState("")
  const [toPhone, setToPhone] = useState("")

  // Invoice details
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`)
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0])
  const [currency, setCurrency] = useState<"EUR" | "INR">("EUR")

  // Line items
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, rate: 0, amount: 0 }
  ])

  // Payment & tax
  const [taxRate, setTaxRate] = useState(19) // German VAT
  const [notes, setNotes] = useState("")
  const [paymentTerms, setPaymentTerms] = useState("Payment due within 30 days")

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, rate: 0, amount: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // Auto-calculate amount
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate
    }

    setItems(newItems)
  }

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
  const taxAmount = (subtotal * taxRate) / 100
  const total = subtotal + taxAmount

  const generatePDF = async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/custom-invoice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: {
            name: fromName,
            address: fromAddress,
            email: fromEmail,
            phone: fromPhone,
            taxId: fromTaxId,
          },
          to: {
            name: toName,
            address: toAddress,
            email: toEmail,
            phone: toPhone,
          },
          invoice: {
            number: invoiceNumber,
            date: invoiceDate,
            dueDate: dueDate,
            currency: currency,
          },
          items: items,
          tax: {
            rate: taxRate,
            amount: taxAmount,
          },
          subtotal: subtotal,
          total: total,
          notes: notes,
          paymentTerms: paymentTerms,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate invoice")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${invoiceNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error generating invoice:", error)
      alert("Failed to generate invoice")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Custom Invoice Generator
            </h1>
            <button
              onClick={generatePDF}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {loading ? "Generating..." : "Generate PDF"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* From Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">From (Your Details)</h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Name"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <textarea
                  placeholder="Address"
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={fromPhone}
                  onChange={(e) => setFromPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Tax ID / VAT Number"
                  value={fromTaxId}
                  onChange={(e) => setFromTaxId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            {/* To Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">To (Client Details)</h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Client Name"
                  value={toName}
                  onChange={(e) => setToName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <textarea
                  placeholder="Client Address"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <input
                  type="email"
                  placeholder="Client Email"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Client Phone"
                  value={toPhone}
                  onChange={(e) => setToPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Invoice Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Invoice #</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as "EUR" | "INR")}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Line Items</h2>
              <button
                onClick={addItem}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded flex items-center gap-1 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Description</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-700 dark:text-gray-300 w-24">Qty</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-700 dark:text-gray-300 w-32">Rate</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-700 dark:text-gray-300 w-32">Amount</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b dark:border-gray-700">
                      <td className="py-2">
                        <input
                          type="text"
                          placeholder="Item description"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </td>
                      <td className="py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border rounded text-right dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </td>
                      <td className="py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border rounded text-right dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </td>
                      <td className="py-2 text-right font-medium text-gray-900 dark:text-white">
                        {currency === "EUR" ? "€" : "₹"}{item.amount.toFixed(2)}
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-700 p-1"
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
            <div className="max-w-sm ml-auto space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Subtotal:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {currency === "EUR" ? "€" : "₹"}{subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">Tax:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1 border rounded text-right dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <span className="text-gray-700 dark:text-gray-300">%</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {currency === "EUR" ? "€" : "₹"}{taxAmount.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="border-t dark:border-gray-700 pt-2 flex justify-between text-lg font-bold">
                <span className="text-gray-900 dark:text-white">Total:</span>
                <span className="text-blue-600 dark:text-blue-400">
                  {currency === "EUR" ? "€" : "₹"}{total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Additional notes..."
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Payment Terms</label>
              <textarea
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
