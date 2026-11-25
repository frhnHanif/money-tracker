import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, dues, accounts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserId } from "@/lib/session";
import { updateAccountBalance } from "@/lib/db/queries";
import { v4 as uuidv4 } from "uuid";

interface SplitBillFriend {
  person: string;
  amount: number;
  notes?: string;
}

interface SplitBillBody {
  title?: string;
  date?: string;
  accountId: number;
  categoryId?: number | null;
  totalAmount: number;
  myShare: number;
  friends: SplitBillFriend[];
  notes?: string;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as SplitBillBody;
    const {
      title,
      date,
      accountId,
      categoryId,
      totalAmount,
      myShare,
      friends,
      notes,
    } = body;

    // 1. Validation
    if (!accountId || typeof accountId !== "number") {
      return NextResponse.json({ error: "Akun pembayar harus dipilih" }, { status: 400 });
    }

    if (!totalAmount || typeof totalAmount !== "number" || totalAmount <= 0) {
      return NextResponse.json({ error: "Total tagihan harus lebih dari 0" }, { status: 400 });
    }

    if (typeof myShare !== "number" || myShare < 0) {
      return NextResponse.json({ error: "Porsi pribadi tidak valid" }, { status: 400 });
    }

    if (!friends || !Array.isArray(friends) || friends.length === 0) {
      return NextResponse.json({ error: "Daftar teman yang ditalangi minimal 1 orang" }, { status: 400 });
    }

    const friendsSum = friends.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    if (myShare + friendsSum !== totalAmount) {
      return NextResponse.json(
        {
          error: `Jumlah porsi pribadi (Rp ${myShare.toLocaleString("id-ID")}) dan teman (Rp ${friendsSum.toLocaleString("id-ID")}) tidak sama dengan total tagihan (Rp ${totalAmount.toLocaleString("id-ID")})`,
        },
        { status: 400 }
      );
    }

    for (const f of friends) {
      if (!f.person || !f.person.trim()) {
        return NextResponse.json({ error: "Nama teman tidak boleh kosong" }, { status: 400 });
      }
      if (!f.amount || f.amount <= 0) {
        return NextResponse.json(
          { error: `Nominal tagihan untuk ${f.person} harus lebih dari 0` },
          { status: 400 }
        );
      }
    }

    // Check account ownership
    const [acc] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
      .limit(1);

    if (!acc) {
      return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
    }

    const txDate = date || new Date().toISOString().split("T")[0];
    const eventTitle = title?.trim() || "Split Bill";
    const friendNames = friends.map((f) => f.person.trim()).join(", ");

    let personalTx: typeof transactions.$inferSelect | null = null;
    let talanganTx: typeof transactions.$inferSelect | null = null;
    const talanganTotal = totalAmount - myShare;
    const splitGroupId = uuidv4();

    // 2. Insert Personal Expense (Only this enters personal category stats!)
    if (myShare > 0) {
      const [pTx] = await db
        .insert(transactions)
        .values({
          userId,
          type: "expense",
          amount: Math.round(myShare),
          accountId,
          categoryId: categoryId ? Number(categoryId) : null,
          date: txDate,
          description: title?.trim()
            ? `${eventTitle} (Porsi Saya)`
            : "Split Bill (Porsi Saya)",
          notes: notes?.trim() || "",
          splitGroupId,
          source: "split_bill",
        })
        .returning();
      personalTx = pTx;
    }

    // 3. Insert Talangan as adjustment_out (Deducts paying account, but DOES NOT inflate category stats)
    if (talanganTotal > 0) {
      const [tTx] = await db
        .insert(transactions)
        .values({
          userId,
          type: "adjustment_out",
          amount: Math.round(talanganTotal),
          accountId,
          categoryId: null,
          date: txDate,
          description: title?.trim()
            ? `${eventTitle} (Talangan: ${friendNames})`
            : `Talangan Split Bill: ${friendNames}`,
          notes: notes?.trim() || `Talangan split bill untuk ${friends.length} orang`,
          splitGroupId,
          source: "split_bill",
        })
        .returning();
      talanganTx = tTx;
    }

    // 4. Create Individual Dues (Piutang) for each friend
    const createdDues = [];
    const refTxId = talanganTx?.id ?? personalTx?.id ?? null;

    for (const f of friends) {
      const [dueRow] = await db
        .insert(dues)
        .values({
          userId,
          direction: "receivable",
          person: f.person.trim(),
          title: title?.trim()
            ? `${eventTitle} (Split Bill)`
            : "Split Bill",
          amount: Math.round(f.amount),
          transactionId: refTxId,
          status: "open",
        })
        .returning();
      createdDues.push(dueRow);
    }

    // 5. Update payer account balance
    await updateAccountBalance(userId, accountId);

    return NextResponse.json({
      success: true,
      personalTx,
      talanganTx,
      dues: createdDues,
      message: `Split bill berhasil dicatat. Porsi pribadi Rp ${myShare.toLocaleString("id-ID")} & ${createdDues.length} piutang teman tersimpan.`,
    });
  } catch (err: unknown) {
    console.error("[Split Bill Error]:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memproses split bill" },
      { status: 500 }
    );
  }
}
