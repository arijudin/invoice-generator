# 🧾 Invoice Manager — Next.js + Neon + Shadcn UI

A lightweight full-stack invoice management app built with **Next.js (App Router)**, **Neon Serverless Postgres**, and **Shadcn UI**.
It includes CRUD features, pagination, live search, and form validation with **React Hook Form + Zod**.

---

## 🚀 Tech Stack

- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript
- **UI Library:** Shadcn/UI (Radix primitives + Tailwind CSS)
- **Form Validation:** React Hook Form + Zod
- **Database:** Neon Serverless Postgres
- **ORM/Query:** `@neondatabase/serverless` (SQL tagged template)
- **Notifications:** `sonner` toast
- **Icons:** Lucide React

---

## 🧑‍💻 Installation & Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Run the dev server
pnpm dev

# 3. App runs on
http://localhost:3000
```

---

## 📦 Features

### ✅ Invoice Management

- Create, edit, delete invoices
- Add multiple invoice items dynamically
- Auto-calculate totals and line items

### ✅ Data Validation

- Real-time validation via **Zod + React Hook Form**
- Prevent invalid date ranges (due date < issue date)

### ✅ List & Pagination

- Server-side pagination with `LIMIT + OFFSET`
- Adjustable “rows per page” via **Shadcn `<Select>`**
- Total pages, prev/next navigation, ellipsis pagination

### ✅ Search

- Instant search by **invoice number** or **client name**
- Debounced to avoid excessive requests
- Fully integrated with pagination

### ✅ Status Control

- Editable status: `Draft`, `Sent`, `Paid`, `Overdue`

### ✅ Toast Notifications

- Non-blocking alerts for create/update/delete actions

---

## 🌐 API Endpoints

### **GET** `/api/invoices`

List invoices with pagination and optional search.

| Param     | Type   | Default | Description                             |
| --------- | ------ | ------- | --------------------------------------- |
| `page`    | number | 1       | Page number                             |
| `perPage` | number | 10      | Items per page                          |
| `q`       | string | ""      | Search by invoice number or client name |

---

### **POST** `/api/invoices`

Create a new invoice.

#### Request Body

```json
{
  "clientName": "PT Nusantara",
  "clientAddress": "Jl. Sudirman No. 10, Jakarta",
  "issueDate": "2025-10-01",
  "dueDate": "2025-10-08",
  "status": "Draft",
  "items": [
    {
      "description": "Consulting Service",
      "quantity": 2,
      "unitPrice": 1500000
    },
    { "description": "UI Design", "quantity": 1, "unitPrice": 2500000 }
  ]
}
```

---

### **GET** `/api/invoices/:id`

Retrieve invoice detail (with items).

---

### **PUT** `/api/invoices/:id`

Update invoice data & items.

---

### **DELETE** `/api/invoices/:id`

Delete invoice and all related items.

---

## 🧠 Author

**Muhammad Arijuddin**
Full-Stack Developer — [@arijuddin\_](https://github.com/arijuddin)

---
