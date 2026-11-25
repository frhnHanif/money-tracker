ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "split_group_id" uuid;
CREATE INDEX IF NOT EXISTS "transactions_split_group_id_idx" ON "transactions" ("split_group_id");
