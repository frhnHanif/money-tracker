import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { budgets } from "@/lib/db/schema";
import { getBudgets } from "@/lib/db/queries";
import { and, eq } from "drizzle-orm";
import { getUserId } from "@/lib/session";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getBudgets(userId);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { categoryId, amount } = body;

  if (!categoryId || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.categoryId, parseInt(categoryId)), eq(budgets.userId, userId)))
    .limit(1);

  if (existing[0]) {
    const [updated] = await db
      .update(budgets)
      .set({ amount, updatedAt: new Date() })
      .where(and(eq(budgets.id, existing[0].id), eq(budgets.userId, userId)))
      .returning();
    return NextResponse.json(updated);
  }

  const [created] = await db
    .insert(budgets)
    .values({ userId, categoryId: parseInt(categoryId), amount })
    .returning();
  return NextResponse.json(created);
}
