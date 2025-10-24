import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error("[CONFIG] Missing DATABASE_URL")
}
const sql = neon(DATABASE_URL ?? "")

const jsonOk = (data: unknown, init?: number) =>
  NextResponse.json(data, { status: init ?? 200 })

const jsonErr = (
  status: number,
  code: string,
  message: string,
  extras?: Record<string, unknown>,
) => NextResponse.json({ error: { code, message, ...(extras ?? {}) } }, { status })

const mapPgError = (e: any) => {
  const code = e?.code as string | undefined
  switch (code) {
    case "23505": // unique_violation
      return { status: 409, code: "UNIQUE_VIOLATION", message: "Duplicate data violates a unique constraint." }
    case "23503": // foreign_key_violation
      return { status: 422, code: "FK_VIOLATION", message: "Related record not found (foreign key violation)." }
    case "22P02": // invalid_text_representation (bad UUID/number format)
      return { status: 400, code: "INVALID_LITERAL", message: "Invalid value format for one of the fields." }
    case "23502": // not_null_violation
      return { status: 400, code: "NOT_NULL", message: "A required field is missing." }
    default:
      return { status: 500, code: "DB_ERROR", message: "Database error occurred." }
  }
}

const toCents = (v: number) => Math.round(v * 100)
const fromCents = (cents: number) => Number((cents / 100).toFixed(2))

export async function GET(request: NextRequest) {
  try {
    if (!DATABASE_URL) {
      return jsonErr(500, "CONFIG_ERROR", "DATABASE_URL is not configured.")
    }

    const { searchParams } = new URL(request.url)
    const pageParam = Number(searchParams.get("page") || "1")
    const perPageParam = Number(searchParams.get("perPage") || "10")
    const qRaw = (searchParams.get("q") || "").trim()

    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1
    const perPageRaw = Number.isFinite(perPageParam) && perPageParam > 0 ? Math.floor(perPageParam) : 10
    const perPage = Math.max(1, Math.min(100, perPageRaw))
    const offset = (page - 1) * perPage

    const hasQ = qRaw.length > 0
    const like = `%${qRaw}%`
    const where = hasQ
      ? sql`WHERE invoice_number ILIKE ${like} OR client_name ILIKE ${like}`
      : sql``

    const [countRows, data] = await Promise.all([
      sql`SELECT COUNT(*)::int AS count FROM invoices ${where}`,
      sql`
        SELECT
          id,
          invoice_number                            AS "invoiceNumber",
          client_name                               AS "clientName",
          client_address                            AS "clientAddress",
          to_char(issue_date,  'YYYY-MM-DD')        AS "issueDate",
          to_char(due_date,    'YYYY-MM-DD')        AS "dueDate",
          total_amount                               AS "totalAmount",
          status,
          to_char(created_at, 'YYYY-MM-DD')         AS "createdAt",
          to_char(updated_at, 'YYYY-MM-DD')         AS "updatedAt"
        FROM invoices
        ${where}
        ORDER BY created_at DESC
        LIMIT ${perPage} OFFSET ${offset}
      `,
    ])

    const total = (countRows as Array<{ count: number }>)[0]?.count ?? 0
    const totalPages = Math.max(1, Math.ceil(total / perPage))

    const meta = {
      page,
      perPage,
      total,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
      q: qRaw || undefined,
    }

    return jsonOk({ data, meta })
  } catch (error: any) {
    console.error("[GET /api/invoices] Error:", error)
    const mapped = mapPgError(error)
    return jsonErr(mapped.status, mapped.code, mapped.message)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientName, clientAddress, issueDate, dueDate, items, status = "Draft" } = body

    if (!clientName || !clientAddress || !issueDate || !dueDate || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing required fields or empty items." } },
        { status: 422 },
      )
    }

    const invoiceNumber = `INV-${Date.now()}`

    const itemsForJson = items.map((it: any) => {
      const quantity = Number.parseInt(String(it.quantity) || "0", 10)
      const unitPrice = Number.parseFloat(String(it.unitPrice) || "0")
      const lineTotalCents = toCents(quantity * unitPrice)

      return {
        description: String(it.description ?? ""),
        quantity,
        unit_price: fromCents(toCents(unitPrice)).toFixed(2),
        line_total: fromCents(lineTotalCents).toFixed(2),
      }
    })

    const totalAmountCents = itemsForJson.reduce(
      (sum: number, it: any) => sum + toCents(Number(it.line_total)),
      0,
    )

    const [created] = (await sql`
      WITH new_invoice AS (
        INSERT INTO invoices (
          invoice_number,
          client_name,
          client_address,
          issue_date,
          due_date,
          total_amount,
          status
        ) VALUES (
          ${invoiceNumber},
          ${clientName},
          ${clientAddress},
          ${issueDate},
          ${dueDate},
          ${fromCents(totalAmountCents).toFixed(2)},
          ${status}
        )
        RETURNING
          id,
          invoice_number as "invoiceNumber",
          client_name as "clientName",
          client_address as "clientAddress",
          issue_date as "issueDate",
          due_date as "dueDate",
          total_amount as "totalAmount",
          status,
          created_at as "createdAt",
          updated_at as "updatedAt"
      ),
      ins_items AS (
        INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, line_total)
        SELECT
          ni.id,
          i.description,
          i.quantity,
          i.unit_price::numeric,
          i.line_total::numeric
        FROM new_invoice ni,
             json_to_recordset(${JSON.stringify(itemsForJson)}::json)
             AS i(description text, quantity int, unit_price text, line_total text)
        RETURNING 1
      )
      SELECT * FROM new_invoice;
    `) as Array<{
      id: string
      invoiceNumber: string
      clientName: string
      clientAddress: string
      issueDate: string
      dueDate: string
      totalAmount: string
      status: string
      createdAt: string
      updatedAt: string
    }>

    return NextResponse.json(created, { status: 201 })
  } catch (error: any) {
    const code = error?.code as string | undefined
    const map =
      code === "23505"
        ? { status: 409, code: "UNIQUE_VIOLATION", message: "Duplicate violates a unique constraint." }
        : code === "22P02"
        ? { status: 400, code: "INVALID_LITERAL", message: "Invalid value format." }
        : { status: 500, code: "DB_ERROR", message: "Failed to create invoice." }

    console.error("[POST /api/invoices] Error:", error)
    return NextResponse.json({ error: { code: map.code, message: map.message } }, { status: map.status })
  }
}
