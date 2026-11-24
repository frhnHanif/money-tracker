import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/session";

const MAX_SIZE = 1024 * 1024; // 1MB

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let file: File | null = null;
    try {
      const formData = await req.formData();
      file = formData.get("file") as File | null;
    } catch (err: unknown) {
      console.error("[Avatar Upload] FormData parse error:", err);
      return NextResponse.json({ error: "Request tidak valid" }, { status: 400 });
    }

    if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
      return NextResponse.json({ error: "File wajib diisi" }, { status: 400 });
    }

    const mimeType = file.type || "image/jpeg";
    if (!mimeType.startsWith("image/")) {
      return NextResponse.json({ error: "File harus berupa gambar" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Ukuran gambar maksimal 1MB" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let finalImageUrl: string | null = null;

    // 1. Try uploading to Vercel Blob if token is available
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const ext = mimeType.split("/")[1]?.toLowerCase() || "jpg";
        const pathname = `avatars/${userId}/${crypto.randomUUID()}.${ext}`;
        const blob = await put(pathname, file, {
          access: "public",
          contentType: mimeType,
        });
        if (blob?.url) {
          finalImageUrl = blob.url;
        }
      } catch (blobErr: unknown) {
        console.warn(
          "[Avatar Upload] Vercel Blob put failed, falling back to Base64:",
          blobErr instanceof Error ? blobErr.message : blobErr
        );
      }
    }

    // 2. Fallback to Data URL (Base64) if Vercel Blob is not configured or failed
    if (!finalImageUrl) {
      const base64 = buffer.toString("base64");
      finalImageUrl = `data:${mimeType};base64,${base64}`;
    }

    // 3. Delete previous avatar if it was stored on Vercel Blob
    const [current] = await db
      .select({ image: users.image })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (
      current?.image &&
      current.image.includes(".public.blob.vercel-storage.com") &&
      process.env.BLOB_READ_WRITE_TOKEN
    ) {
      try {
        await del(current.image);
      } catch {
        // Ignore: old avatar may already be gone
      }
    }

    // 4. Update user in database
    await db
      .update(users)
      .set({ image: finalImageUrl })
      .where(eq(users.id, userId));

    return NextResponse.json({ image: finalImageUrl });
  } catch (err: unknown) {
    console.error("[Avatar Upload] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memproses foto profil" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [current] = await db
      .select({ image: users.image })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (
      current?.image &&
      current.image.includes(".public.blob.vercel-storage.com") &&
      process.env.BLOB_READ_WRITE_TOKEN
    ) {
      try {
        await del(current.image);
      } catch {
        // Ignore: blob may already be gone
      }
    }

    await db.update(users).set({ image: null }).where(eq(users.id, userId));

    return NextResponse.json({ image: null });
  } catch (err: unknown) {
    console.error("[Avatar Delete] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menghapus foto profil" },
      { status: 500 }
    );
  }
}
