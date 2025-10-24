import { InvoiceForm } from "@/components/invoice-form"

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <main className="container mx-auto py-8 px-4">
      <InvoiceForm invoiceId={id} />
    </main>
  )
}
