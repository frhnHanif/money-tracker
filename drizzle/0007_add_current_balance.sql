ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "current_balance" integer DEFAULT 0 NOT NULL;

-- Inisialisasi current_balance dari initial_balance + transaksi yang sudah ada
UPDATE "accounts" a
SET "current_balance" = a.initial_balance + COALESCE((
  SELECT SUM(
    CASE
      WHEN t.type = 'income' THEN t.amount
      WHEN t.type = 'transfer_in' THEN t.amount
      WHEN t.type = 'adjustment_in' THEN t.amount
      WHEN t.type = 'expense' THEN -t.amount
      WHEN t.type = 'transfer_out' THEN -t.amount
      WHEN t.type = 'adjustment_out' THEN -t.amount
      ELSE 0
    END
  )
  FROM "transactions" t
  WHERE t.account_id = a.id AND t.user_id = a.user_id
), 0);
