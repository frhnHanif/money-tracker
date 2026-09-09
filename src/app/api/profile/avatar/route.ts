import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/session";

const MAX_SIZE = 1024 * 1024; // 1MB

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Blob storage belum dikonfigurasi" },
      { status: 500 }
    );
  }

  let file: File | null = null;
  try {
    const formData = await req.formData();
    file = formData.get("file") as File | null;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "File wajib diisi" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File harus berupa gambar" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Ukuran gambar maksimal 1MB" },
      { status: 400 }
    );
  }

  const ext = file.type.split("/")[1]?.toLowerCase() || "jpg";
  const pathname = `avatars/${userId}/${crypto.randomUUID()}.${ext}`;

  const blob = await put(pathname, file, {
    access: "public",
    contentType: file.type,
  });

  // Delete previous avatar (if any) from the blob store
  const [current] = await db
    .select({ image: users.image })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (current?.image) {
    try {
      await del(current.image);
    } catch {
      // Ignore: old avatar may already be gone
    }
  }

  await db.update(users).set({ image: blob.url }).where(eq(users.id, userId));

  return NextResponse.json({ image: blob.url });
}

export async function DELETE() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [current] = await db
    .select({ image: users.image })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (current?.image) {
    try {
      await del(current.image);
    } catch {
      // Ignore: blob may already be gone
    }
  }

  await db.update(users).set({ image: null }).where(eq(users.id, userId));

  return NextResponse.json({ image: null });
}
