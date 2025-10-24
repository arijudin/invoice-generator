import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { invoices, invoiceItems } from "@/lib/schema"
import { eq } from "drizzle-orm"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const invoice = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1)

    if (!invoice.length) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id))

    return NextResponse.json({ ...invoice[0], items })
  } catch (error) {
    console.error("Error fetching invoice:", error)
    return NextResponse.json({ error: "Failed to fetch invoice" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { clientName, clientAddress, issueDate, dueDate, status, items } = body

    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + Number.parseFloat(item.quantity) * Number.parseFloat(item.unitPrice)
    }, 0)

    await db
      .update(invoices)
      .set({
        clientName,
        clientAddress,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        status,
        totalAmount: totalAmount.toString(),
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id))

    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id))

    if (items && items.length > 0) {
      await db.insert(invoiceItems).values(
        items.map((item: any) => ({
          invoiceId: id,
          description: item.description,
          quantity: Number.parseInt(item.quantity),
          unitPrice: item.unitPrice,
          lineTotal: (Number.parseFloat(item.quantity) * Number.parseFloat(item.unitPrice)).toString(),
        })),
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating invoice:", error)
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    await db.delete(invoices).where(eq(invoices.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting invoice:", error)
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 })
  }
}
