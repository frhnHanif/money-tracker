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
  const { password } = body as { password?: string };

  if (!password || typeof password !== "string") {
    return NextResponse.json(
      { error: "Password akun wajib diisi" },
      { status: 400 }
    );
  }

  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Password akun salah" },
      { status: 400 }
    );
  }

  // Reset PIN (disable and remove pinHash)
  await db
    .update(users)
    .set({
      pinHash: null,
      pinEnabled: false,
    })
    .where(eq(users.id, userId));

  return NextResponse.json({
    success: true,
    message: "PIN berhasil direset",
  });
}
