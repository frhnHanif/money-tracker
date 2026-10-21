import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/session";

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { pin } = body as { pin?: string };

  if (!pin || typeof pin !== "string" || !/^\d{6}$/.test(pin)) {
    return NextResponse.json(
      { error: "PIN harus berupa 6 digit angka" },
      { status: 400 }
    );
  }

  const pinHash = await bcrypt.hash(pin, 12);

  await db
    .update(users)
    .set({
      pinHash,
      pinEnabled: true,
    })
    .where(eq(users.id, userId));

  return NextResponse.json({
    success: true,
    pinEnabled: true,
  });
}
