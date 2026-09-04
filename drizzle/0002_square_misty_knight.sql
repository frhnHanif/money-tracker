CREATE TYPE "public"."due_direction" AS ENUM('receivable', 'payable');--> statement-breakpoint
CREATE TYPE "public"."due_status" AS ENUM('open', 'settled');--> statement-breakpoint
CREATE TABLE "dues" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "dues_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"direction" "due_direction" NOT NULL,
	"person" varchar(100) NOT NULL,
	"title" varchar(255) DEFAULT '' NOT NULL,
	"amount" integer NOT NULL,
	"transaction_id" integer,
	"status" "due_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "settlements_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"due_id" integer NOT NULL,
	"transaction_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dues" ADD CONSTRAINT "dues_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_due_id_dues_id_fk" FOREIGN KEY ("due_id") REFERENCES "public"."dues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;