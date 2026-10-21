ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pin_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pin_enabled" boolean DEFAULT false NOT NULL;
