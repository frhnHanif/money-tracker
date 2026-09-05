import type { InferSelectModel } from "drizzle-orm";
import {
  pgTable,
  varchar,
  integer,
  timestamp,
  boolean,
  uuid,
  date,
  text,
  pgEnum,
} from "drizzle-orm/pg-core";

export const accountTypeEnum = pgEnum("account_type", [
  "cash",
  "bank",
  "ewallet",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "expense",
  "income",
  "transfer_out",
  "transfer_in",
  "adjustment_in",
  "adjustment_out",
]);

export const categoryTypeEnum = pgEnum("category_type", [
  "expense",
  "income",
  "both",
]);

export const accounts = pgTable("accounts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  type: accountTypeEnum("type").notNull().default("bank"),
  icon: varchar("icon", { length: 50 }).default("wallet"),
  color: varchar("color", { length: 7 }).default("#16a34a"),
  initialBalance: integer("initial_balance").notNull().default(0),
  isArchived: boolean("is_archived").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  type: categoryTypeEnum("type").notNull().default("expense"),
  icon: varchar("icon", { length: 50 }).default("tag"),
  color: varchar("color", { length: 7 }).default("#6b7280"),
  isArchived: boolean("is_archived").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  type: transactionTypeEnum("type").notNull(),
  amount: integer("amount").notNull(),
  date: date("date").notNull(),
  accountId: integer("account_id")
    .references(() => accounts.id)
    .notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  description: varchar("description", { length: 255 }).default(""),
  notes: text("notes").default(""),
  transferGroupId: uuid("transfer_group_id"),
  source: varchar("source", { length: 50 }).default("manual"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const budgets = pgTable("budgets", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  categoryId: integer("category_id")
    .references(() => categories.id)
    .notNull()
    .unique(),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const dueDirectionEnum = pgEnum("due_direction", [
  "receivable",
  "payable",
]);

export const dueStatusEnum = pgEnum("due_status", ["open", "settled"]);

export const dues = pgTable("dues", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  direction: dueDirectionEnum("direction").notNull(),
  person: varchar("person", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull().default(""),
  amount: integer("amount").notNull(),
  transactionId: integer("transaction_id")
    .references(() => transactions.id, { onDelete: "cascade" }),
  status: dueStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const settlements = pgTable("settlements", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  dueId: integer("due_id")
    .references(() => dues.id, { onDelete: "cascade" })
    .notNull(),
  transactionId: integer("transaction_id")
    .references(() => transactions.id, { onDelete: "cascade" })
    .notNull(),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptionIntervalEnum = pgEnum("subscription_interval", [
  "monthly",
  "yearly",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "inactive",
]);

export const subscriptions = pgTable("subscriptions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  price: integer("price").notNull(),
  interval: subscriptionIntervalEnum("interval").notNull().default("monthly"),
  billingDay: integer("billing_day").notNull().default(1),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  lastPaidAt: date("last_paid_at"),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Account = InferSelectModel<typeof accounts>;
export type Category = InferSelectModel<typeof categories>;
export type Transaction = InferSelectModel<typeof transactions>;
export type Budget = InferSelectModel<typeof budgets>;
export type Due = InferSelectModel<typeof dues>;
export type Settlement = InferSelectModel<typeof settlements>;
export type Subscription = InferSelectModel<typeof subscriptions>;
