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
  const { enabled, pin } = body as { enabled?: boolean; pin?: string };

  if (typeof enabled !== "boolean") {
    return NextResponse.json(
      { error: "Parameter 'enabled' harus boolean" },
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
      { error: "PIN belum pernah diatur. Silakan buat PIN terlebih dahulu" },
      { status: 400 }
    );
  }

  // If user is disabling PIN, require verification of the current PIN
  if (!enabled) {
    if (!pin || typeof pin !== "string") {
      return NextResponse.json(
        { error: "PIN saat ini wajib diisi untuk menonaktifkan kunci" },
        { status: 400 }
      );
    }
    const valid = await bcrypt.compare(pin, user.pinHash);
    if (!valid) {
      return NextResponse.json(
        { error: "PIN salah" },
        { status: 400 }
      );
    }
  }

  await db
    .update(users)
    .set({ pinEnabled: enabled })
    .where(eq(users.id, userId));

  return NextResponse.json({ success: true, pinEnabled: enabled });
}
