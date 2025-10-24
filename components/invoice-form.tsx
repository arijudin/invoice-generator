"use client"

import type React from "react"
import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Plus } from "lucide-react"
import { toast } from "sonner"
import { cn, toYMD } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

interface InvoiceFormProps {
  invoiceId?: string
}

const todayLocal = () => new Date().toLocaleDateString("en-CA")
const addDays = (d: string, n: number) => {
  const dt = new Date(d + "T00:00:00")
  dt.setDate(dt.getDate() + n)
  return dt.toLocaleDateString("en-CA")
}
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value)

const formattedNowForToast = () =>
  new Date().toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })

const itemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z
    .number({ invalid_type_error: "Qty must be a number" })
    .int("Qty must be an integer")
    .min(1, "Qty min 1"),
  unitPrice: z
    .number({ invalid_type_error: "Unit price must be a number" })
    .min(0, "Unit price min 0"),
})

const formSchema = z
  .object({
    invoiceNumber: z.string().optional(),
    invoiceDate: z.string().min(1, "Invoice date is required"),
    clientName: z.string().min(1, "Client name is required"),
    clientAddress: z.string().min(1, "Client address is required"),
    issueDate: z.string().min(1, "Issue date is required"),
    dueDate: z.string().min(1, "Due date is required"),
    status: z.enum(["Draft", "Sent", "Paid", "Overdue"]).default("Draft"),
    items: z.array(itemSchema).min(1, "At least 1 item"),
  })
  .refine(
    (v) => new Date(v.dueDate + "T00:00:00") >= new Date(v.issueDate + "T00:00:00"),
    { path: ["dueDate"], message: "Due date must be on or after issue date" }
  )

type FormValues = z.infer<typeof formSchema>

const statusColor = (s: string) => {
  switch (s) {
    case "Draft": return "bg-gray-100 text-gray-800"
    case "Sent": return "bg-blue-100 text-blue-800"
    case "Paid": return "bg-green-100 text-green-800"
    case "Overdue": return "bg-red-100 text-red-800"
    default: return "bg-gray-100 text-gray-800"
  }
}

export function InvoiceForm({ invoiceId }: InvoiceFormProps) {
  const router = useRouter()

  const defaultIssue = todayLocal()
  const defaultDue = addDays(defaultIssue, 7)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoiceNumber: "AUTO",
      invoiceDate: defaultIssue,
      clientName: "",
      clientAddress: "",
      issueDate: defaultIssue,
      dueDate: defaultDue,
      status: "Draft",
      items: [{ description: "", quantity: 1, unitPrice: 0 }],
    },
    mode: "onBlur",
    reValidateMode: "onChange",
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  })

  useEffect(() => {
    if (!invoiceId) return;
    (async () => {
      try {
        const res = await fetch(`/api/invoices/${invoiceId}`)
        const data = await res.json()

        const invDate = (data.createdAt ?? data.issueDate) as string | undefined

        reset({
          invoiceNumber: data.invoiceNumber ?? "AUTO",
          invoiceDate: toYMD(invDate) ?? defaultIssue,
          clientName: data.clientName ?? "",
          clientAddress: data.clientAddress ?? "",
          issueDate: toYMD(data.issueDate) ?? defaultIssue,
          dueDate: toYMD(data.dueDate) ?? defaultDue,
          status: data.status ?? "Draft",
          items:
            Array.isArray(data.items) && data.items.length
              ? data.items.map((i: any) => ({
                  description: String(i.description ?? ""),
                  quantity: Number(i.quantity ?? 1),
                  unitPrice: Number(i.unitPrice ?? 0),
                }))
              : [{ description: "", quantity: 1, unitPrice: 0 }],
        })
      } catch (e) {
        console.error("Error fetching invoice:", e)
      }
    })()
  }, [invoiceId, reset, defaultIssue, defaultDue])

  const items = watch("items")
  const totalAmount = useMemo(
    () =>
      (items ?? []).reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0),
    [items]
  )

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        clientName: values.clientName,
        clientAddress: values.clientAddress,
        issueDate: values.issueDate,
        dueDate: values.dueDate,
        status: values.status,
        items: values.items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      }

      const url = invoiceId ? `/api/invoices/${invoiceId}` : "/api/invoices"
      const method = invoiceId ? "PUT" : "POST"
      const toastTitle = method === "PUT" ? "Invoice has been updated." : "Invoice has been created."

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast(toastTitle, {
          description: formattedNowForToast(),
          duration: 4000,
          action: {
            label: "Back",
            onClick: () => router.push("/"),
          },
        })
        if (method === "POST") {
          setTimeout(() => router.push("/"), 4000)
        }
      } else {
        const msg = await response.text().catch(() => "")
        toast("Failed to save invoice", { description: msg || "Unexpected error" })
      }
    } catch (error) {
      console.error("Error saving invoice:", error)
      toast("Error saving invoice")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">INVOICE</h1>
          <div className="mt-4 flex items-center gap-3">
            <Select value={watch("status")} onValueChange={(v) => setValue("status", v as FormValues["status"], { shouldValidate: true })}>
              <SelectTrigger className={cn(statusColor(watch("status")), "w-[160px] focus:ring-0 uppercase")}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Sent">Sent</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {errors.status && (
            <p className="text-red-600 text-xs mt-1">{errors.status.message}</p>
          )}
        </div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-10 px-6 border-2 bg-black text-white hover:bg-gray-800"
        >
          {isSubmitting ? "Saving..." : invoiceId ? "Update Invoice" : "Generate Invoice"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6 max-w-xl">
        <div>
          <Label htmlFor="invoiceNumber" className="block mb-2 font-semibold">
            Invoice Number
          </Label>
          <Input
            id="invoiceNumber"
            disabled
            {...register("invoiceNumber")}
            className="border-2 border-black bg-gray-100"
          />
        </div>
        <div className="max-w-36">
          <Label htmlFor="invoiceDate" className="block mb-2 font-semibold">
            Invoice Date
          </Label>
          <Input
            id="invoiceDate"
            type="date"
            {...register("invoiceDate")}
            readOnly
            disabled
            className={cn(errors.invoiceDate ? "border-red-600" : "border-black", "border-2")}
            required
          />
          {errors.invoiceDate && <p className="text-red-600 text-xs mt-1">{errors.invoiceDate.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="clientName" className="block mb-2 font-semibold">
          Client Name
        </Label>
        <Input id="clientName" {...register("clientName")} className={cn(errors.clientName ? "border-red-600" : "border-black", "border-2")} />
        {errors.clientName && <p className="text-red-600 text-xs mt-1">{errors.clientName.message}</p>}
      </div>

      <div>
        <Label htmlFor="clientAddress" className="block mb-2 font-semibold">
          Client Address
        </Label>
        <Textarea id="clientAddress" {...register("clientAddress")} className={cn(errors.clientAddress ? "border-red-600" : "border-black", "border-2 min-h-24")} />
        {errors.clientAddress && <p className="text-red-600 text-xs mt-1">{errors.clientAddress.message}</p>}
      </div>

      <div className="flex gap-6">
        <div className="max-w-36">
          <Label htmlFor="issueDate" className="block mb-2 font-semibold">
            Issue Date
          </Label>
          <Input id="issueDate" type="date" {...register("issueDate")} className={cn(errors.issueDate ? "border-red-600" : "border-black", "border-2")} />
          {errors.issueDate && <p className="text-red-600 text-xs mt-1">{errors.issueDate.message}</p>}
        </div>
        <div className="max-w-36">
          <Label htmlFor="dueDate" className="block mb-2 font-semibold">
            Due Date
          </Label>
          <Input id="dueDate" type="date" {...register("dueDate")} className={cn(errors.dueDate ? "border-red-600" : "border-black", "border-2")} />
          {errors.dueDate && <p className="text-red-600 text-xs mt-1">{errors.dueDate.message}</p>}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Items</h2>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}
              className="border-2 border-black bg-transparent"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
            {fields.length > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => remove(fields.length - 1)}
                className="border-2 border-black"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Item
              </Button>
            )}
          </div>
        </div>

        <div className="border-2 border-black overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-black bg-gray-50">
                <th className="text-left py-3 px-4 font-semibold">Description</th>
                <th className="text-center py-3 px-4 font-semibold">Qty</th>
                <th className="text-right py-3 px-4 font-semibold">Unit Price</th>
                <th className="text-right py-3 px-4 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => (
                <tr key={field.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4 align-top">
                    <Input
                      placeholder="Item description"
                      className={cn(errors.items?.[index]?.description ? "border-red-600" : "border-gray-300", "border")}
                      {...register(`items.${index}.description` as const)}
                    />
                    {errors.items?.[index]?.description && (
                      <p className="text-red-600 text-xs mt-1">{errors.items[index]!.description!.message}</p>
                    )}
                  </td>
                  <td className="py-3 px-4 align-top">
                    <Input
                      type="number"
                      min={1}
                      className={cn(errors.items?.[index]?.quantity ? "border-red-600" : "border-gray-300", "border text-center")}
                      {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                    />
                    {errors.items?.[index]?.quantity && (
                      <p className="text-red-600 text-xs mt-1">{errors.items[index]!.quantity!.message}</p>
                    )}
                  </td>
                  <td className="py-3 px-4 align-top">
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      className={cn(errors.items?.[index]?.unitPrice ? "border-red-600" : "border-gray-300", "border text-right")}
                      {...register(`items.${index}.unitPrice` as const, { valueAsNumber: true })}
                    />
                    {errors.items?.[index]?.unitPrice && (
                      <p className="text-red-600 text-xs mt-1">{errors.items[index]!.unitPrice!.message}</p>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold">
                    {formatCurrency(
                      (items?.[index]?.quantity ?? 0) * (items?.[index]?.unitPrice ?? 0)
                    )}
                    {errors.items?.[index] && (
                      <p className="text-xs">&nbsp;</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="w-full max-w-xs">
          <Label className="block mb-2 font-semibold text-right">Total Amount</Label>
          <Input
            type="text"
            value={formatCurrency(totalAmount)}
            readOnly
            disabled
            className="border-2 border-black bg-white text-right font-bold text-lg"
          />
        </div>
      </div>

      <div className="flex gap-4 pt-6">
        <Button type="submit" disabled={isSubmitting} className="flex-1 h-10 bg-black text-white hover:bg-gray-800">
          {isSubmitting ? "Saving..." : invoiceId ? "Update Invoice" : "Generate Invoice"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1 h-10 border-2 border-black">
          Cancel
        </Button>
      </div>
    </form>
  )
}
