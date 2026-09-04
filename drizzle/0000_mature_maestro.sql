CREATE TYPE "public"."account_type" AS ENUM('cash', 'bank', 'ewallet');--> statement-breakpoint
CREATE TYPE "public"."category_type" AS ENUM('expense', 'income', 'both');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('expense', 'income', 'transfer_out', 'transfer_in');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "accounts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(100) NOT NULL,
	"type" "account_type" DEFAULT 'bank' NOT NULL,
	"icon" varchar(50) DEFAULT 'wallet',
	"color" varchar(7) DEFAULT '#16a34a',
	"initial_balance" integer DEFAULT 0 NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(100) NOT NULL,
	"type" "category_type" DEFAULT 'expense' NOT NULL,
	"icon" varchar(50) DEFAULT 'tag',
	"color" varchar(7) DEFAULT '#6b7280',
	"is_archived" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "transactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"type" "transaction_type" NOT NULL,
	"amount" integer NOT NULL,
	"date" date NOT NULL,
	"account_id" integer NOT NULL,
	"category_id" integer,
	"description" varchar(255) DEFAULT '',
	"notes" text DEFAULT '',
	"transfer_group_id" uuid,
	"source" varchar(50) DEFAULT 'manual',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;