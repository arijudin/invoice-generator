"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Eye, Edit2, Printer, Search } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { formatYMDSafe } from "@/lib/utils"
import { Input } from "./ui/input"

type Invoice = {
  id: string
  invoiceNumber: string
  clientName: string
  issueDate: string
  dueDate: string
  totalAmount: string
  status: string
}

type Meta = {
  page: number
  perPage: number
  total: number
  totalPages: number
  hasPrev: boolean
  hasNext: boolean
}

type ApiResponse = { data: Invoice[]; meta: Meta }

const DEFAULT_PER_PAGE = 10

type PageItem = number | "ellipsis"
function buildPageItems(page: number, totalPages: number, siblings = 1, boundary = 1): PageItem[] {
  if (totalPages <= 0) return []
  if (totalPages <= 1 + 2 * siblings + 2 * boundary) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const start = Math.max(boundary + 1, page - siblings)
  const end = Math.min(totalPages - boundary, page + siblings)

  const items: PageItem[] = []
  for (let i = 1; i <= boundary; i++) items.push(i)
  if (start > boundary + 1) items.push("ellipsis")
  for (let i = start; i <= end; i++) items.push(i)
  if (end < totalPages - boundary) items.push("ellipsis")
  for (let i = totalPages - boundary + 1; i <= totalPages; i++) items.push(i)
  return items
}

function formatIDR(v: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v)
}

function formatYMD(ymd: string) {
  if (!ymd) return "-"
  const d = new Date(`${ymd}T00:00:00`)
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function getStatusColor(status: string) {
  switch (status) {
    case "Draft":
      return "bg-gray-100 text-gray-800"
    case "Sent":
      return "bg-blue-100 text-blue-800"
    case "Paid":
      return "bg-green-100 text-green-800"
    case "Cancelled":
    case "Overdue":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

function useDebounce<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE)
  const [query, setQuery] = useState("")

  const debouncedQuery = useDebounce(query, 400)

  useEffect(() => {
    const controller = new AbortController()
    const fetchInvoices = async () => {
      setLoading(true)
      setError(null)
      try {
        const qParam = debouncedQuery ? `&q=${encodeURIComponent(debouncedQuery)}` : ""
        const res = await fetch(`/api/invoices?page=${page}&perPage=${perPage}${qParam}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!res.ok) {
          const msg = await res.text().catch(() => "")
          throw new Error(msg || `Failed to fetch invoices (status ${res.status})`)
        }
        const json = (await res.json()) as ApiResponse
        setInvoices(json.data ?? [])
        setMeta(json.meta ?? null)
      } catch (e: any) {
        if (e.name !== "AbortError") setError(e?.message || "Unexpected error")
      } finally {
        setLoading(false)
      }
    }
    fetchInvoices()
    return () => controller.abort()
  }, [page, perPage, debouncedQuery])

  useEffect(() => {
    setPage(1)
  }, [debouncedQuery, perPage])

  const pageItems = useMemo(() => buildPageItems(meta?.page ?? 1, meta?.totalPages ?? 1), [meta])

  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 text-red-600">Error: {error}</div>
        <div className="flex justify-center">
          <button
            className="px-4 py-2 border rounded"
            onClick={() => {
              setPage((p) => p)
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h1 className="text-3xl font-bold">LIST INVOICE</h1>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search invoice # or client…"
              className="pl-8 w-[240px]"
            />
          </div>

          <Link href="/new-invoice">
            <Button variant="outline">Create New Invoice</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading invoices...</div>
      ) :
        invoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No invoices yet. Create your first invoice!</div>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Invoice Number</TableHead>
                    <TableHead className="font-semibold">Client</TableHead>
                    <TableHead className="font-semibold">Issue Date</TableHead>
                    <TableHead className="font-semibold">Due Date</TableHead>
                    <TableHead className="font-semibold">Total Amount</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.clientName}</TableCell>
                      <TableCell>{formatYMDSafe(invoice.issueDate)}</TableCell>
                      <TableCell>{formatYMDSafe(invoice.dueDate)}</TableCell>
                      <TableCell>{formatIDR(Number(invoice.totalAmount))}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-2">
                          <Link href={`/invoices/${invoice.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4 flex-none" />
                            </Button>
                          </Link>
                          <Link href={`/invoices/${invoice.id}/edit`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Edit2 className="h-4 w-4 flex-none" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => window.print()}>
                            <Printer className="h-4 w-4 flex-none" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {meta && meta.totalPages > 1 && (
              <div className="flex justify-between items-center gap-2">

                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  Rows per page:
                  <Select
                    value={perPage.toString()}
                    onValueChange={(value) => {
                      setPerPage(Number(value))
                      setPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Rows per page" />
                    </SelectTrigger>

                    <SelectContent>
                      {[5, 10, 20, 50, 100].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <div className="flex items-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => meta.hasPrev && setPage((p) => Math.max(1, p - 1))}
                    disabled={!meta.hasPrev}
                  >
                    Previous
                  </Button>

                  <div className="flex gap-1">
                    {pageItems.map((it, idx) =>
                      it === "ellipsis" ? (
                        <span key={`e-${idx}`} className="px-2">
                          …
                        </span>
                      ) : (
                        <Button
                          key={it}
                          variant={meta.page === it ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(it)}
                          className="w-8 h-8 p-0"
                        >
                          {it}
                        </Button>
                      ),
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => meta.hasNext && setPage((p) => Math.min(meta.totalPages, p + 1))}
                    disabled={!meta.hasNext}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
    </div>
  )
}
