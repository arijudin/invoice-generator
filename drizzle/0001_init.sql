-- Optional
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabel: invoices
CREATE TABLE IF NOT EXISTS invoices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number varchar(50) NOT NULL UNIQUE,
  client_name    varchar(255) NOT NULL,
  client_address text NOT NULL,
  issue_date     date NOT NULL,
  due_date       date NOT NULL,
  total_amount   numeric(12,2) NOT NULL DEFAULT 0,
  status         varchar(50) NOT NULL DEFAULT 'Draft',
  created_at     timestamp NOT NULL DEFAULT now(),
  updated_at     timestamp NOT NULL DEFAULT now()
);

-- Tabel: invoice_items
CREATE TABLE IF NOT EXISTS invoice_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description varchar(255) NOT NULL,
  quantity    integer NOT NULL,
  unit_price  numeric(12,2) NOT NULL,
  line_total  numeric(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id
  ON invoice_items (invoice_id);
