import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, accounts, categories } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

function parseRupiah(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[Rp\s.,]/g, "");
  return parseInt(cleaned, 10) || 0;
}

function parseDate(val: string): string {
  if (!val) return new Date().toISOString().split("T")[0];
  // Format: "1-Jun-2026" -> "2026-06-01"
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const parts = val.split("-");
  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0");
    const monthKey = parts[1].toLowerCase();
    const month = months[monthKey] || "01";
    const year = parts[2].length === 2 ? "20" + parts[2] : parts[2];
    return `${year}-${month}-${day}`;
  }
  return val;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const rows = body.data as any[];

  let imported = 0;
  let skipped = 0;

  // Get existing accounts and categories for lookup
  const existingAccounts = await db.select().from(accounts);
  const existingCategories = await db.select().from(categories);

  const accountMap = new Map(existingAccounts.map((a) => [a.name.toLowerCase(), a.id]));
  const categoryMap = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c.id]));

  for (const row of rows) {
    if (!row.date || !row.account || !row.amount) {
      skipped++;
      continue;
    }

    const date = parseDate(row.date);
    const amount = parseRupiah(row.amount);
    const accountName = (row.account || "").trim();
    const categoryName = (row.category || "Uncategorized").trim();
    const type = (row.type || "expense").toLowerCase();
    const description = (row.description || "").trim();
    const notes = (row.notes || "").trim();

    if (amount === 0) {
      skipped++;
      continue;
    }

    // Get or create account
    let accountId = accountMap.get(accountName.toLowerCase());
    if (!accountId) {
      const [newAccount] = await db
        .insert(accounts)
        .values({ name: accountName, type: "bank", icon: "wallet", color: "#16a34a" })
        .returning();
      if (newAccount) {
        accountId = newAccount.id;
        accountMap.set(accountName.toLowerCase(), accountId);
      }
    }
    if (!accountId) {
      skipped++;
      continue;
    }

    // Get or create category
    let categoryId = categoryMap.get(categoryName.toLowerCase());
    if (!categoryId) {
      const [newCategory] = await db
        .insert(categories)
        .values({ name: categoryName, type: type === "income" ? "income" : "expense", color: "#6b7280" })
        .returning();
      if (newCategory) {
        categoryId = newCategory.id;
        categoryMap.set(categoryName.toLowerCase(), categoryId);
      }
    }

    // Handle "Sisa" rows as not importing
    if (categoryName.toLowerCase() === "sisa") {
      skipped++;
      continue;
    }

    const txType = type === "income" ? "income" : "expense";

    await db.insert(transactions).values({
      type: txType,
      amount,
      date,
      accountId,
      categoryId: categoryId || null,
      description,
      notes,
      source: "csv_import",
    });

    imported++;
  }

  return NextResponse.json({ imported, skipped });
}
