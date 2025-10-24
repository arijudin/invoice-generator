-- Pastikan extension sudah aktif
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  i INT;
  j INT;
  inv_id UUID;
  inv_number TEXT;
  client_names TEXT[] := ARRAY[
    'PT Nusantara Jaya', 'CV Makmur Sentosa', 'PT Borneo Tech', 'PT Global Niaga',
    'CV Citra Mandiri', 'PT Sejahtera Bersama', 'PT Lintas Data', 'CV Prima Abadi',
    'PT Delta Raya', 'PT Sentralindo', 'CV Multi Media', 'PT Andalan Logistik'
  ];
  addr TEXT[] := ARRAY[
    'Jl. Merdeka No.10, Jakarta',
    'Jl. Diponegoro No.15, Bandung',
    'Jl. A.Yani No.22, Surabaya',
    'Jl. S.Parman No.5, Medan',
    'Jl. Gatot Subroto No.8, Denpasar',
    'Jl. Ahmad Yani No.11, Samarinda'
  ];
  status_list TEXT[] := ARRAY['Draft', 'Sent', 'Paid', 'Overdue'];
  item_count INT;
  qty INT;
  price NUMERIC(12,2);
  total NUMERIC(12,2);
  line_total NUMERIC(12,2);
  issue DATE;
  due DATE;
  idx_client INT;
  idx_addr INT;
  idx_status INT;
BEGIN
  FOR i IN 1..40 LOOP
    inv_number := format('INV-%s-%04s', to_char(current_date, 'YYYYMMDD'), i);
    issue := current_date - (random()*30)::INT;
    due := issue + ((5 + random()*25)::INT);
    total := 0;

    -- pastikan index mulai dari 1 (bukan 0)
    idx_client := ceil(random() * array_length(client_names, 1));
    idx_addr   := ceil(random() * array_length(addr, 1));
    idx_status := ceil(random() * array_length(status_list, 1));

    INSERT INTO invoices (
      invoice_number, client_name, client_address, issue_date, due_date, total_amount, status
    ) VALUES (
      inv_number,
      client_names[idx_client],
      addr[idx_addr],
      issue,
      due,
      0,
      status_list[idx_status]
    )
    RETURNING id INTO inv_id;

    -- generate 2–5 random items per invoice
    item_count := 2 + (random()*3)::INT;

    FOR j IN 1..item_count LOOP
      qty := 1 + (random()*10)::INT;
      price := round((50000 + random()*200000)::NUMERIC, 2);
      line_total := qty * price;
      total := total + line_total;

      INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, line_total)
      VALUES (
        inv_id,
        format('Item %s-%s', i, j),
        qty,
        price,
        line_total
      );
    END LOOP;

    -- update total per invoice
    UPDATE invoices SET total_amount = total WHERE id = inv_id;
  END LOOP;
END$$;
