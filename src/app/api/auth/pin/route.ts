import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/session";

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({
      pinEnabled: users.pinEnabled,
      hasPin: users.pinHash,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    pinEnabled: Boolean(user.pinEnabled && user.hasPin),
    hasPin: Boolean(user.hasPin),
  });
}

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

  const [user] = await db
    .select({ pinHash: users.pinHash, pinEnabled: users.pinEnabled })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || !user.pinHash) {
    return NextResponse.json(
      { error: "PIN belum diatur" },
      { status: 400 }
    );
  }

  const valid = await bcrypt.compare(pin, user.pinHash);
  if (!valid) {
    return NextResponse.json(
      { error: "PIN salah. Silakan coba lagi" },
      { status: 400 }
    );
  }

  return NextResponse.json({ valid: true });
}
