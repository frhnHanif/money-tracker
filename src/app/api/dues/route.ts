import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dues } from "@/lib/db/schema";
import { getDues } from "@/lib/db/queries";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = req.nextUrl.searchParams;
  const direction = searchParams.get("direction") as "receivable" | "payable" | null;
  const status = searchParams.get("status") as "open" | "settled" | null;

  const data = await getDues(direction || undefined, status || undefined);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { direction, person, title, amount, transactionId } = body;

  if (
    !direction ||
    !["receivable", "payable"].includes(direction) ||
    !person ||
    typeof amount !== "number" ||
    amount <= 0
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const [created] = await db
    .insert(dues)
    .values({
      direction,
      person: String(person).trim(),
      title: title ? String(title).trim() : "",
      amount: Math.round(amount),
      transactionId: transactionId ? parseInt(transactionId) : null,
      status: "open",
    })
    .returning();

  return NextResponse.json(created);
}