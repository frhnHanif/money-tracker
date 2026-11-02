import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { getCategories } from "@/lib/db/queries";
import { getUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = (req.nextUrl.searchParams.get("status") as "active" | "archived" | "all") || "active";
  const data = await getCategories(userId, status);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Auto-compute next sortOrder if not provided
  let sortOrder = body.sortOrder;
  if (sortOrder === undefined) {
    const existing = await getCategories(userId);
    sortOrder = existing.length > 0 ? existing[existing.length - 1].sortOrder + 1 : 0;
  }

  const result = await db
    .insert(categories)
    .values({
      userId,
      name: body.name,
      type: body.type || "expense",
      icon: body.icon || "tag",
      color: body.color || "#6b7280",
      pocket: body.pocket || "none",
      sortOrder,
    })
    .returning();

  return NextResponse.json(result[0]);
}
