import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const subId = parseInt(id);
  const body = await req.json();

  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subId))
    .limit(1);
  if (!existing[0]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) update.name = String(body.name).trim();
  if (body.notes !== undefined) update.notes = String(body.notes);
  if (body.price !== undefined) {
    if (typeof body.price !== "number" || body.price <= 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }
    update.price = Math.round(body.price);
  }
  if (body.interval !== undefined) {
    if (!["monthly", "yearly"].includes(body.interval)) {
      return NextResponse.json({ error: "Invalid interval" }, { status: 400 });
    }
    update.interval = body.interval;
  }
  if (body.billingDay !== undefined) {
    if (!Number.isInteger(body.billingDay) || body.billingDay < 1 || body.billingDay > 31) {
      return NextResponse.json({ error: "Invalid billing day" }, { status: 400 });
    }
    update.billingDay = body.billingDay;
  }
  if (body.status !== undefined) {
    if (!["active", "inactive"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = body.status;
  }
  if (body.lastPaidAt !== undefined) {
    if (body.lastPaidAt === null) {
      update.lastPaidAt = null;
    } else if (typeof body.lastPaidAt === "string" && body.lastPaidAt.length === 10) {
      update.lastPaidAt = body.lastPaidAt;
    } else {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
  }

  const [updated] = await db
    .update(subscriptions)
    .set(update)
    .where(eq(subscriptions.id, subId))
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
  await db.delete(subscriptions).where(eq(subscriptions.id, parseInt(id)));

  return NextResponse.json({ success: true });
}