import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { getAccounts } from "@/lib/db/queries";
import { getUserId } from "@/lib/session";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getAccounts(userId);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Auto-compute next sortOrder if not provided
  let sortOrder = body.sortOrder;
  if (sortOrder === undefined) {
    const existing = await getAccounts(userId);
    sortOrder = existing.length > 0 ? existing[existing.length - 1].sortOrder + 1 : 0;
  }

  const result = await db
    .insert(accounts)
    .values({
      userId,
      name: body.name,
      type: body.type || "bank",
      icon: body.icon || "wallet",
      color: body.color || "#16a34a",
      initialBalance: body.initialBalance || 0,
      currentBalance: body.initialBalance || 0,
      sortOrder,
    })
    .returning();

  return NextResponse.json(result[0]);
}
