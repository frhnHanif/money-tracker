ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "monthly_salary" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "budgeting_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
UPDATE "users" SET "monthly_salary" = 8780000 WHERE "email" = 'hanif@farhanhanif.my.id';--> statement-breakpoint
UPDATE "users" SET "monthly_salary" = 5000000 WHERE "email" = 'demo@farhanhanif.my.id';
