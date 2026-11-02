import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserId } from "@/lib/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const updates: Partial<{
    name: string;
    type: "expense" | "income" | "both";
    icon: string;
    color: string;
    pocket: "living" | "saving" | "playing" | "giving" | "none";
    isArchived: boolean;
  }> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.type !== undefined) updates.type = body.type;
  if (body.icon !== undefined) updates.icon = body.icon;
  if (body.color !== undefined) updates.color = body.color;
  if (body.pocket !== undefined) updates.pocket = body.pocket;
  if (body.isArchived !== undefined) updates.isArchived = body.isArchived;

  const [updated] = await db
    .update(categories)
    .set(updates)
    .where(and(eq(categories.id, parseInt(id)), eq(categories.userId, userId)))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db
    .update(categories)
    .set({ isArchived: true })
    .where(and(eq(categories.id, parseInt(id)), eq(categories.userId, userId)));

  return NextResponse.json({ success: true });
}
