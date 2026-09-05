CREATE TYPE "public"."subscription_interval" AS ENUM('monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subscriptions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(100) NOT NULL,
	"price" integer NOT NULL,
	"interval" "subscription_interval" DEFAULT 'monthly' NOT NULL,
	"billing_day" integer DEFAULT 1 NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"last_paid_at" date,
	"notes" text DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
