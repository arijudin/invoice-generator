import { InvoiceDetail } from "@/components/invoice-detail"

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <main className="container mx-auto py-8 px-4">
      <InvoiceDetail invoiceId={id} />
    </main>
  )
}
