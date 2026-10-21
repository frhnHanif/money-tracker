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
  const { currentPin, newPin } = body as {
    currentPin?: string;
    newPin?: string;
  };

  if (!currentPin || typeof currentPin !== "string") {
    return NextResponse.json(
      { error: "PIN saat ini wajib diisi" },
      { status: 400 }
    );
  }

  if (!newPin || typeof newPin !== "string" || !/^\d{6}$/.test(newPin)) {
    return NextResponse.json(
      { error: "PIN baru harus berupa 6 digit angka" },
      { status: 400 }
    );
  }

  const [user] = await db
    .select({ pinHash: users.pinHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || !user.pinHash) {
    return NextResponse.json(
      { error: "PIN belum diatur" },
      { status: 400 }
    );
  }

  const valid = await bcrypt.compare(currentPin, user.pinHash);
  if (!valid) {
    return NextResponse.json(
      { error: "PIN saat ini salah" },
      { status: 400 }
    );
  }

  const newHash = await bcrypt.hash(newPin, 12);

  await db
    .update(users)
    .set({ pinHash: newHash, pinEnabled: true })
    .where(eq(users.id, userId));

  return NextResponse.json({ success: true });
}
