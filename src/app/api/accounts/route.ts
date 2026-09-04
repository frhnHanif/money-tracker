import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { getAccounts } from "@/lib/db/queries";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getAccounts();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Auto-compute next sortOrder if not provided
  let sortOrder = body.sortOrder;
  if (sortOrder === undefined) {
    const existing = await getAccounts();
    sortOrder = existing.length > 0 ? existing[existing.length - 1].sortOrder + 1 : 0;
  }

  const result = await db
    .insert(accounts)
    .values({
      name: body.name,
      type: body.type || "bank",
      icon: body.icon || "wallet",
      color: body.color || "#16a34a",
      initialBalance: body.initialBalance || 0,
      sortOrder,
    })
    .returning();

  return NextResponse.json(result[0]);
}
