'use client';

import { InvoiceList } from '@/components/invoice-list';

export default function Home() {
  return (
    <div className="relative min-h-screen p-4">
      <Workspace />
    </div>
  );
}

function Workspace() {
  return (
    <main className="container mx-auto py-8 px-4">
      <InvoiceList />
    </main>
  );
}
