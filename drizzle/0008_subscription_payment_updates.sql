ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "last_transaction_id" integer REFERENCES "transactions"("id") ON DELETE SET NULL;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "next_due_date" date;
