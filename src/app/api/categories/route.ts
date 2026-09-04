import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { getCategories } from "@/lib/db/queries";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getCategories();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Auto-compute next sortOrder if not provided
  let sortOrder = body.sortOrder;
  if (sortOrder === undefined) {
    const existing = await getCategories();
    sortOrder = existing.length > 0 ? existing[existing.length - 1].sortOrder + 1 : 0;
  }

  const result = await db
    .insert(categories)
    .values({
      name: body.name,
      type: body.type || "expense",
      icon: body.icon || "tag",
      color: body.color || "#6b7280",
      sortOrder,
    })
    .returning();

  return NextResponse.json(result[0]);
}
