import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dues } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const dueId = parseInt(id);
  const body = await req.json();

  const existing = await db.select().from(dues).where(eq(dues.id, dueId)).limit(1);
  if (!existing[0]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.person !== undefined) update.person = String(body.person).trim();
  if (body.title !== undefined) update.title = String(body.title).trim();
  if (body.amount !== undefined) {
    if (typeof body.amount !== "number" || body.amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    update.amount = Math.round(body.amount);
  }
  if (body.status !== undefined) {
    if (!["open", "settled"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = body.status;
  }

  const [updated] = await db
    .update(dues)
    .set(update)
    .where(eq(dues.id, dueId))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.delete(dues).where(eq(dues.id, parseInt(id)));

  return NextResponse.json({ success: true });
}