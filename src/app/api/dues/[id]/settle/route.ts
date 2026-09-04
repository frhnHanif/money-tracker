import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dues, settlements } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const dueId = parseInt(id);
  const body = await req.json();
  const { amount, transactionId } = body;

  if (typeof amount !== "number" || amount <= 0 || !transactionId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await db.select().from(dues).where(eq(dues.id, dueId)).limit(1);
  if (!existing[0]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [settlement] = await db
    .insert(settlements)
    .values({ dueId, transactionId: parseInt(transactionId), amount: Math.round(amount) })
    .returning();

  const sum = await db
    .select({ total: sql<number>`COALESCE(SUM(${settlements.amount}), 0)::int` })
    .from(settlements)
    .where(eq(settlements.dueId, dueId));

  const settledSum = Number(sum[0]?.total) || 0;
  const newStatus = settledSum >= existing[0].amount ? "settled" : "open";

  const [updated] = await db
    .update(dues)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(dues.id, dueId))
    .returning();

  return NextResponse.json({ settlement, due: updated, settledSum });
}