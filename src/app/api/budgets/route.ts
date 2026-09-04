import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { budgets } from "@/lib/db/schema";
import { getBudgets } from "@/lib/db/queries";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getBudgets();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { categoryId, amount } = body;

  if (!categoryId || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(budgets)
    .where(eq(budgets.categoryId, parseInt(categoryId)))
    .limit(1);

  if (existing[0]) {
    const [updated] = await db
      .update(budgets)
      .set({ amount, updatedAt: new Date() })
      .where(eq(budgets.id, existing[0].id))
      .returning();
    return NextResponse.json(updated);
  }

  const [created] = await db
    .insert(budgets)
    .values({ categoryId: parseInt(categoryId), amount })
    .returning();
  return NextResponse.json(created);
}