/**
 * Pure TypeScript PDF 1.4 Generator for Financial Reports
 * Zero external dependencies. Generates valid standard PDF binaries
 * with multi-page support, accurate Helvetica typography metrics,
 * tables, cards, and page numbering.
 */

export interface ReportCategoryItem {
  id?: number;
  name: string;
  type: "expense" | "income";
  pocket?: "living" | "saving" | "playing" | "giving" | "none" | null;
  total: number;
  percentage: number; // 0..100
  transactionCount: number;
  budgetAmount?: number | null;
  budgetUsagePercent?: number | null;
}

export interface ReportTransactionItem {
  id: number;
  date: string; // YYYY-MM-DD
  type: string;
  categoryId?: number | null;
  categoryName: string;
  categoryPocket?: string | null;
  description: string;
  accountName: string;
  notes?: string | null;
  amount: number;
}

export interface ReportFourPocketsItem {
  key: "living" | "saving" | "playing" | "giving";
  name: string;
  targetPercent: number;
  targetAmount: number;
  spentAmount: number;
  actualPercent: number;
  status: "safe" | "warning" | "exceeded";
}

export interface ReportAccountSummaryItem {
  accountName: string;
  totalIncome: number;
  totalExpense: number;
  net: number;
}

export interface FinancialReportData {
  title?: string;
  userName?: string;
  userEmail?: string;
  generatedAt: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  daysInPeriod: number;
  daysTracked: number;
  typeFilter: "all" | "expense" | "income";

  summary: {
    totalIncome: number;
    totalExpense: number;
    netAmount: number;
    totalTransactions: number;
    dailyAverageExpense: number;
    expenseToIncomeRatio: number;
  };

  fourPockets?: ReportFourPocketsItem[];
  categories: ReportCategoryItem[];
  categoryTransactions: {
    category: ReportCategoryItem;
    transactions: ReportTransactionItem[];
  }[];
  accountSummaries?: ReportAccountSummaryItem[];
}

// Standard Helvetica Font Metrics (units per 1000 em)
const HELVETICA_METRICS: Record<string, number> = {
  " ": 278, "!": 278, '"': 355, "#": 556, "$": 556, "%": 889, "&": 667, "'": 191,
  "(": 333, ")": 333, "*": 389, "+": 584, ",": 278, "-": 333, ".": 278, "/": 278,
  "0": 556, "1": 556, "2": 556, "3": 556, "4": 556, "5": 556, "6": 556, "7": 556,
  "8": 556, "9": 556, ":": 278, ";": 278, "<": 584, "=": 584, ">": 584, "?": 556,
  "@": 1015, A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722,
  I: 278, J: 500, K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778,
  R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  "[": 278, "\\": 278, "]": 278, "^": 469, _: 556, "`": 333, a: 556, b: 556,
  c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222, k: 500,
  l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278,
  u: 556, v: 500, w: 722, x: 500, y: 500, z: 500, "{": 334, "|": 260, "}": 334, "~": 584,
};

const HELVETICA_BOLD_METRICS: Record<string, number> = {
  ...HELVETICA_METRICS,
  A: 722, B: 722, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278,
  J: 556, K: 722, L: 611, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722,
  S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611, a: 556,
  b: 611, c: 556, d: 611, e: 556, f: 333, g: 611, h: 611, i: 278, j: 278,
  k: 556, l: 278, m: 889, n: 611, o: 611, p: 611, q: 611, r: 389, s: 556,
  t: 333, u: 611, v: 556, w: 778, x: 556, y: 556, z: 500,
};

function sanitizePdfText(text: string): string {
  if (!text) return "";
  return text
    .replace(/–/g, "-")
    .replace(/—/g, "--")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/•/g, "*")
    .replace(/…/g, "...")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, " ");
}

function getTextWidth(text: string, fontSize: number, isBold: boolean = false): number {
  const map = isBold ? HELVETICA_BOLD_METRICS : HELVETICA_METRICS;
  let total = 0;
  for (let i = 0; i < text.length; i++) {
    total += map[text[i]] || 556;
  }
  return (total * fontSize) / 1000;
}

function truncateToWidth(text: string, maxWidth: number, fontSize: number, isBold: boolean = false): string {
  if (getTextWidth(text, fontSize, isBold) <= maxWidth) return text;
  let s = text;
  while (s.length > 0 && getTextWidth(s + "...", fontSize, isBold) > maxWidth) {
    s = s.slice(0, -1);
  }
  return s + "...";
}

function formatRupiahSimple(num: number): string {
  const isNeg = num < 0;
  const abs = Math.abs(Math.round(num));
  const s = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (isNeg ? "-Rp " : "Rp ") + s;
}

class PdfWriter {
  pages: { stream: string[] }[] = [];
  currentPageIndex = -1;
  pageWidth = 595.28; // A4
  pageHeight = 841.89; // A4
  marginLeft = 36;
  marginRight = 36;
  marginTop = 36;
  marginBottom = 40;
  cursorY = 36;
  runningHeaderTitle = "";
  reportPeriodLabel = "";

  get contentWidth(): number {
    return this.pageWidth - this.marginLeft - this.marginRight;
  }

  get currentStream(): string[] {
    return this.pages[this.currentPageIndex].stream;
  }

  addPage(): void {
    this.pages.push({ stream: [] });
    this.currentPageIndex = this.pages.length - 1;
    this.cursorY = this.marginTop;

    if (this.pages.length > 1) {
      // Draw running header on subsequent pages
      this.drawRunningHeader();
    }
  }

  drawRunningHeader(): void {
    this.setStrokeColor(0.88, 0.88, 0.88);
    this.setLineWidth(0.5);
    this.drawLine(this.marginLeft, 26, this.pageWidth - this.marginRight, 26);

    const title = this.runningHeaderTitle || "Money Tracker - Laporan Keuangan";
    const sub = this.reportPeriodLabel ? `Periode: ${this.reportPeriodLabel}` : "";

    this.drawText(title, this.marginLeft, 15, {
      font: "F2",
      size: 7.5,
      color: [0.35, 0.35, 0.37],
    });

    if (sub) {
      this.drawText(sub, this.pageWidth - this.marginRight, 15, {
        font: "F1",
        size: 7.5,
        color: [0.45, 0.45, 0.47],
        align: "right",
      });
    }

    this.cursorY = 38;
  }

  ensureSpace(neededHeight: number): void {
    if (this.cursorY + neededHeight > this.pageHeight - this.marginBottom) {
      this.addPage();
    }
  }

  raw(cmd: string): void {
    this.currentStream.push(cmd);
  }

  setFillColor(r: number, g: number, b: number): void {
    this.raw(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
  }

  setStrokeColor(r: number, g: number, b: number): void {
    this.raw(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
  }

  setLineWidth(w: number): void {
    this.raw(`${w.toFixed(2)} w`);
  }

  drawRect(x: number, y: number, w: number, h: number, fill = true, stroke = false): void {
    const pdfY = this.pageHeight - y - h;
    const op = fill && stroke ? "B" : fill ? "f" : "S";
    this.raw(`${x.toFixed(2)} ${pdfY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${op}`);
  }

  drawLine(x1: number, y1: number, x2: number, y2: number): void {
    const pdfY1 = this.pageHeight - y1;
    const pdfY2 = this.pageHeight - y2;
    this.raw(`${x1.toFixed(2)} ${pdfY1.toFixed(2)} m ${x2.toFixed(2)} ${pdfY2.toFixed(2)} l S`);
  }

  drawText(
    text: string,
    x: number,
    y: number,
    options: {
      font?: "F1" | "F2" | "F3";
      size?: number;
      color?: [number, number, number];
      align?: "left" | "right" | "center";
      maxWidth?: number;
    } = {}
  ): void {
    const font = options.font || "F1";
    const size = options.size || 9;
    const isBold = font === "F2";
    const align = options.align || "left";
    const color = options.color || [0.11, 0.11, 0.12];

    let rawText = sanitizePdfText(text);
    if (options.maxWidth && options.maxWidth > 0) {
      rawText = truncateToWidth(rawText, options.maxWidth, size, isBold);
    }

    const textWidth = getTextWidth(rawText, size, isBold);
    let drawX = x;
    if (align === "right") {
      drawX = x - textWidth;
    } else if (align === "center") {
      drawX = x - textWidth / 2;
    }

    this.setFillColor(color[0], color[1], color[2]);
    const baselineY = this.pageHeight - (y + size * 0.82);
    this.raw(`BT /${font} ${size} Tf ${drawX.toFixed(2)} ${baselineY.toFixed(2)} Td (${rawText}) Tj ET`);
  }

  drawPill(
    text: string,
    x: number,
    y: number,
    bgColor: [number, number, number],
    textColor: [number, number, number],
    size: number = 7.5
  ): number {
    const padX = 5;
    const h = size + 5;
    const cleanText = sanitizePdfText(text);
    const w = getTextWidth(cleanText, size, true) + padX * 2;

    this.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    this.drawRect(x, y, w, h, true, false);

    this.drawText(cleanText, x + padX, y + 2, {
      font: "F2",
      size,
      color: textColor,
      align: "left",
    });

    return w;
  }

  build(generatedAt: string): Uint8Array {
    const totalPages = this.pages.length;

    // Draw footers on every page
    for (let i = 0; i < totalPages; i++) {
      this.currentPageIndex = i;
      this.setStrokeColor(0.88, 0.88, 0.88);
      this.setLineWidth(0.5);
      this.drawLine(
        this.marginLeft,
        this.pageHeight - 28,
        this.pageWidth - this.marginRight,
        this.pageHeight - 28
      );

      this.drawText("Money Tracker • Laporan Keuangan Resmi", this.marginLeft, this.pageHeight - 21, {
        font: "F1",
        size: 7.5,
        color: [0.5, 0.5, 0.5],
      });

      this.drawText(`Dicetak: ${sanitizePdfText(generatedAt)}`, this.pageWidth / 2, this.pageHeight - 21, {
        font: "F1",
        size: 7.5,
        color: [0.55, 0.55, 0.55],
        align: "center",
      });

      this.drawText(`Halaman ${i + 1} dari ${totalPages}`, this.pageWidth - this.marginRight, this.pageHeight - 21, {
        font: "F1",
        size: 7.5,
        color: [0.5, 0.5, 0.5],
        align: "right",
      });
    }

    // Assemble PDF
    const catalogObj = "<< /Type /Catalog /Pages 2 0 R >>";
    const kids = this.pages.map((_, i) => `${3 + i * 2} 0 R`).join(" ");
    const pagesObj = `<< /Type /Pages /Kids [${kids}] /Count ${totalPages} >>`;

    const font1 = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    const font2 = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
    const font3 = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>";

    const font1Idx = 3 + totalPages * 2;
    const font2Idx = font1Idx + 1;
    const font3Idx = font1Idx + 2;

    const objects: string[] = [catalogObj, pagesObj];

    for (let i = 0; i < totalPages; i++) {
      const pageIndex = 3 + i * 2;
      const contentIndex = pageIndex + 1;
      const pageObj = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] /Contents ${contentIndex} 0 R /Resources << /Font << /F1 ${font1Idx} 0 R /F2 ${font2Idx} 0 R /F3 ${font3Idx} 0 R >> >> >>`;
      const streamContent = this.pages[i].stream.join("\n");
      const streamLen = new TextEncoder().encode(streamContent).length;
      const contentObj = `<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream`;
      objects.push(pageObj);
      objects.push(contentObj);
    }

    objects.push(font1);
    objects.push(font2);
    objects.push(font3);

    let output = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
    const offsets: number[] = [];

    const encoder = new TextEncoder();
    let currentByteLen = encoder.encode(output).length;

    for (let i = 0; i < objects.length; i++) {
      offsets.push(currentByteLen);
      const objStr = `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
      output += objStr;
      currentByteLen += encoder.encode(objStr).length;
    }

    const startXref = currentByteLen;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) {
      xref += `${String(off).padStart(10, "0")} 00000 n \n`;
    }
    xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

    output += xref;

    // Convert string to Uint8Array safely for binary latin1 output
    const binary = new Uint8Array(output.length);
    for (let i = 0; i < output.length; i++) {
      binary[i] = output.charCodeAt(i) & 0xff;
    }
    return binary;
  }
}

/**
 * Generate binary PDF data for a financial report
 */
export function generateFinancialReportPdf(data: FinancialReportData): Uint8Array {
  const doc = new PdfWriter();
  doc.runningHeaderTitle = "Money Tracker • Laporan Keuangan & Rincian Kategori";
  doc.reportPeriodLabel = data.periodLabel;

  doc.addPage();

  // ==========================================
  // 1. TOP HEADER & BRANDING
  // ==========================================
  // Header background banner
  doc.setFillColor(0.97, 0.98, 1.0);
  doc.setStrokeColor(0.85, 0.89, 0.95);
  doc.setLineWidth(0.75);
  doc.drawRect(doc.marginLeft, doc.cursorY, doc.contentWidth, 68, true, true);

  // Left side: Title
  doc.drawText("MONEY TRACKER", doc.marginLeft + 12, doc.cursorY + 10, {
    font: "F2",
    size: 8,
    color: [0.0, 0.4, 0.8],
  });

  doc.drawText("Laporan Keuangan & Statistik", doc.marginLeft + 12, doc.cursorY + 22, {
    font: "F2",
    size: 15,
    color: [0.1, 0.1, 0.12],
  });

  doc.drawText(`Periode: ${data.periodLabel} (${data.startDate} s/d ${data.endDate})`, doc.marginLeft + 12, doc.cursorY + 41, {
    font: "F1",
    size: 9,
    color: [0.35, 0.35, 0.38],
  });

  doc.drawText(
    `Keaktifan: ${data.daysTracked} hari dari ${data.daysInPeriod} hari dalam siklus`,
    doc.marginLeft + 12,
    doc.cursorY + 53,
    {
      font: "F3",
      size: 7.5,
      color: [0.5, 0.5, 0.52],
    }
  );

  // Right side: Metadata box
  const rightX = doc.pageWidth - doc.marginRight - 12;
  doc.drawText("INFO PENGGUNA", rightX, doc.cursorY + 10, {
    font: "F2",
    size: 7.5,
    color: [0.45, 0.45, 0.48],
    align: "right",
  });

  const userName = data.userName || "Pengguna";
  doc.drawText(userName, rightX, doc.cursorY + 22, {
    font: "F2",
    size: 10,
    color: [0.11, 0.11, 0.12],
    align: "right",
  });

  if (data.userEmail) {
    doc.drawText(data.userEmail, rightX, doc.cursorY + 35, {
      font: "F1",
      size: 8,
      color: [0.45, 0.45, 0.48],
      align: "right",
    });
  }

  doc.drawText(`Dicetak: ${data.generatedAt}`, rightX, doc.cursorY + 51, {
    font: "F1",
    size: 7.5,
    color: [0.5, 0.5, 0.53],
    align: "right",
  });

  doc.cursorY += 76;

  // ==========================================
  // 2. EXECUTIVE SUMMARY STAT CARDS (4 Boxes)
  // ==========================================
  doc.drawText("RINGKASAN EKSEKUTIF", doc.marginLeft, doc.cursorY, {
    font: "F2",
    size: 10.5,
    color: [0.11, 0.11, 0.12],
  });
  doc.cursorY += 15;

  const cardGap = 8;
  const numCards = 4;
  const cardW = (doc.contentWidth - cardGap * (numCards - 1)) / numCards;
  const cardH = 46;

  // Card 1: Pemasukan
  let cx = doc.marginLeft;
  doc.setFillColor(0.96, 0.99, 0.97);
  doc.setStrokeColor(0.78, 0.91, 0.82);
  doc.setLineWidth(0.5);
  doc.drawRect(cx, doc.cursorY, cardW, cardH, true, true);
  doc.drawText("Total Pemasukan", cx + 7, doc.cursorY + 6, { font: "F1", size: 7.5, color: [0.1, 0.55, 0.25] });
  doc.drawText(formatRupiahSimple(data.summary.totalIncome), cx + 7, doc.cursorY + 18, {
    font: "F2",
    size: 9.5,
    color: [0.08, 0.5, 0.2],
  });
  doc.drawText("Arus kas masuk", cx + 7, doc.cursorY + 33, { font: "F1", size: 6.5, color: [0.4, 0.6, 0.45] });

  // Card 2: Pengeluaran
  cx += cardW + cardGap;
  doc.setFillColor(0.99, 0.96, 0.96);
  doc.setStrokeColor(0.95, 0.82, 0.82);
  doc.drawRect(cx, doc.cursorY, cardW, cardH, true, true);
  doc.drawText("Total Pengeluaran", cx + 7, doc.cursorY + 6, { font: "F1", size: 7.5, color: [0.8, 0.2, 0.2] });
  doc.drawText(formatRupiahSimple(data.summary.totalExpense), cx + 7, doc.cursorY + 18, {
    font: "F2",
    size: 9.5,
    color: [0.75, 0.15, 0.15],
  });
  doc.drawText(
    `${data.summary.expenseToIncomeRatio > 0 ? data.summary.expenseToIncomeRatio.toFixed(1) + "% dari pemasukan" : "Total belanja"}`,
    cx + 7,
    doc.cursorY + 33,
    { font: "F1", size: 6.5, color: [0.65, 0.4, 0.4] }
  );

  // Card 3: Arus Kas Bersih (Net)
  cx += cardW + cardGap;
  const isNetPositive = data.summary.netAmount >= 0;
  doc.setFillColor(isNetPositive ? 0.95 : 0.99, isNetPositive ? 0.97 : 0.95, isNetPositive ? 1.0 : 0.95);
  doc.setStrokeColor(isNetPositive ? 0.78 : 0.93, isNetPositive ? 0.85 : 0.75, isNetPositive ? 0.96 : 0.75);
  doc.drawRect(cx, doc.cursorY, cardW, cardH, true, true);
  doc.drawText("Arus Kas Bersih (Net)", cx + 7, doc.cursorY + 6, {
    font: "F1",
    size: 7.5,
    color: isNetPositive ? [0.0, 0.4, 0.8] : [0.75, 0.15, 0.15],
  });
  doc.drawText(formatRupiahSimple(data.summary.netAmount), cx + 7, doc.cursorY + 18, {
    font: "F2",
    size: 9.5,
    color: isNetPositive ? [0.0, 0.35, 0.75] : [0.75, 0.15, 0.15],
  });
  doc.drawText(isNetPositive ? "Surplus periode" : "Defisit periode", cx + 7, doc.cursorY + 33, {
    font: "F1",
    size: 6.5,
    color: [0.45, 0.45, 0.5],
  });

  // Card 4: Rata-rata Harian & Transaksi
  cx += cardW + cardGap;
  doc.setFillColor(0.97, 0.97, 0.98);
  doc.setStrokeColor(0.88, 0.88, 0.9);
  doc.drawRect(cx, doc.cursorY, cardW, cardH, true, true);
  doc.drawText("Rata-rata Pengeluaran", cx + 7, doc.cursorY + 6, { font: "F1", size: 7.5, color: [0.35, 0.35, 0.4] });
  doc.drawText(formatRupiahSimple(data.summary.dailyAverageExpense) + "/hari", cx + 7, doc.cursorY + 18, {
    font: "F2",
    size: 9.0,
    color: [0.2, 0.2, 0.25],
  });
  doc.drawText(`Total ${data.summary.totalTransactions} transaksi`, cx + 7, doc.cursorY + 33, {
    font: "F1",
    size: 6.5,
    color: [0.5, 0.5, 0.55],
  });

  doc.cursorY += cardH + 16;

  // ==========================================
  // 3. FOUR POCKETS OVERVIEW (If available)
  // ==========================================
  if (data.fourPockets && data.fourPockets.length > 0) {
    doc.ensureSpace(80);
    doc.drawText("ALOKASI 4 KANTONG (METODE BUDGETING)", doc.marginLeft, doc.cursorY, {
      font: "F2",
      size: 10,
      color: [0.11, 0.11, 0.12],
    });
    doc.cursorY += 12;

    // Four Pockets Table Header
    const colP = [
      { name: "Kantong", w: 110, align: "left" },
      { name: "Target %", w: 60, align: "right" },
      { name: "Target Nominal", w: 95, align: "right" },
      { name: "Realisasi (Rp)", w: 95, align: "right" },
      { name: "Realisasi %", w: 75, align: "right" },
      { name: "Status", w: doc.contentWidth - (110 + 60 + 95 + 95 + 75), align: "center" },
    ];

    // Table Header
    doc.setFillColor(0.93, 0.94, 0.96);
    doc.setStrokeColor(0.85, 0.85, 0.88);
    doc.drawRect(doc.marginLeft, doc.cursorY, doc.contentWidth, 16, true, true);

    let hx = doc.marginLeft;
    for (const c of colP) {
      const tx = c.align === "right" ? hx + c.w - 6 : c.align === "center" ? hx + c.w / 2 : hx + 6;
      doc.drawText(c.name, tx, doc.cursorY + 3.5, { font: "F2", size: 7.5, color: [0.25, 0.25, 0.28], align: c.align as "left" | "right" | "center" });
      hx += c.w;
    }
    doc.cursorY += 16;

    // Pocket rows
    data.fourPockets.forEach((p, idx) => {
      doc.ensureSpace(16);
      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 1.0 : 0.98, isEven ? 1.0 : 0.98, isEven ? 1.0 : 0.99);
      doc.setStrokeColor(0.9, 0.9, 0.92);
      doc.drawRect(doc.marginLeft, doc.cursorY, doc.contentWidth, 15, true, true);

      let rx = doc.marginLeft;
      // 1. Name
      doc.drawText(p.name, rx + 6, doc.cursorY + 3, { font: "F2", size: 8, color: [0.15, 0.15, 0.18] });
      rx += colP[0].w;

      // 2. Target %
      doc.drawText(`${p.targetPercent.toFixed(1)}%`, rx + colP[1].w - 6, doc.cursorY + 3, { font: "F1", size: 8, align: "right" });
      rx += colP[1].w;

      // 3. Target Nominal
      doc.drawText(formatRupiahSimple(p.targetAmount), rx + colP[2].w - 6, doc.cursorY + 3, { font: "F1", size: 8, align: "right" });
      rx += colP[2].w;

      // 4. Realisasi
      doc.drawText(formatRupiahSimple(p.spentAmount), rx + colP[3].w - 6, doc.cursorY + 3, { font: "F2", size: 8, align: "right" });
      rx += colP[3].w;

      // 5. Realisasi %
      const isExceeded = p.status === "exceeded" || (p.key !== "saving" && p.spentAmount > p.targetAmount && p.targetAmount > 0);
      const isSavingReached = p.key === "saving" && p.spentAmount >= p.targetAmount && p.targetAmount > 0;
      const pctColor: [number, number, number] = isExceeded ? [0.8, 0.2, 0.2] : [0.1, 0.55, 0.25];
      doc.drawText(`${p.actualPercent.toFixed(1)}%`, rx + colP[4].w - 6, doc.cursorY + 3, {
        font: "F2",
        size: 8,
        color: pctColor,
        align: "right",
      });
      rx += colP[4].w;

      // 6. Status text
      const statusLabel = isSavingReached
        ? "Tercapai"
        : isExceeded
        ? "Over Budget"
        : p.status === "warning"
        ? "Waspada"
        : "Terkendali";
      const statusColor: [number, number, number] = isExceeded
        ? [0.8, 0.2, 0.2]
        : p.status === "warning"
        ? [0.8, 0.5, 0.1]
        : [0.1, 0.55, 0.25];
      doc.drawText(statusLabel, rx + colP[5].w / 2, doc.cursorY + 3, {
        font: "F2",
        size: 7.5,
        color: statusColor,
        align: "center",
      });

      doc.cursorY += 15;
    });

    // Total row for 4 Pockets
    doc.ensureSpace(16);
    doc.setFillColor(0.95, 0.95, 0.97);
    doc.setStrokeColor(0.85, 0.85, 0.88);
    doc.drawRect(doc.marginLeft, doc.cursorY, doc.contentWidth, 15, true, true);

    const totTargetNominal = data.fourPockets.reduce((acc, p) => acc + p.targetAmount, 0);
    const totSpentNominal = data.fourPockets.reduce((acc, p) => acc + p.spentAmount, 0);
    const totTargetPct = data.fourPockets.reduce((acc, p) => acc + p.targetPercent, 0);
    const totActualPct = totTargetNominal > 0 ? (totSpentNominal / totTargetNominal) * 100 : 0;

    let fx = doc.marginLeft;
    doc.drawText("Total Terencana", fx + 6, doc.cursorY + 3, { font: "F2", size: 8, color: [0.15, 0.15, 0.18] });
    fx += colP[0].w;

    doc.drawText(`${totTargetPct.toFixed(1)}%`, fx + colP[1].w - 6, doc.cursorY + 3, { font: "F2", size: 8, align: "right" });
    fx += colP[1].w;

    doc.drawText(formatRupiahSimple(totTargetNominal), fx + colP[2].w - 6, doc.cursorY + 3, { font: "F2", size: 8, align: "right" });
    fx += colP[2].w;

    doc.drawText(formatRupiahSimple(totSpentNominal), fx + colP[3].w - 6, doc.cursorY + 3, { font: "F2", size: 8, align: "right" });
    fx += colP[3].w;

    const totPctColor: [number, number, number] = totSpentNominal > totTargetNominal && totTargetNominal > 0 ? [0.8, 0.2, 0.2] : [0.1, 0.55, 0.25];
    doc.drawText(`${totActualPct.toFixed(1)}%`, fx + colP[4].w - 6, doc.cursorY + 3, { font: "F2", size: 8, color: totPctColor, align: "right" });
    fx += colP[4].w;

    doc.drawText("-", fx + colP[5].w / 2, doc.cursorY + 3, { font: "F2", size: 7.5, color: [0.45, 0.45, 0.48], align: "center" });
    doc.cursorY += 15;

    doc.cursorY += 14;
  }

  // ==========================================
  // 4. CATEGORY BREAKDOWN TABLE (STATISTIK KATEGORI)
  // ==========================================
  doc.ensureSpace(70);
  doc.drawText("RINGKASAN STATISTIK PER KATEGORI", doc.marginLeft, doc.cursorY, {
    font: "F2",
    size: 10,
    color: [0.11, 0.11, 0.12],
  });
  doc.cursorY += 12;

  const colC = [
    { name: "No", w: 22, align: "center" },
    { name: "Nama Kategori", w: 135, align: "left" },
    { name: "Tipe", w: 55, align: "center" },
    { name: "Kantong", w: 60, align: "left" },
    { name: "Jml Tx", w: 45, align: "center" },
    { name: "Total (Rp)", w: 95, align: "right" },
    { name: "Porsi %", w: 45, align: "right" },
    { name: "Budget Bulanan", w: doc.contentWidth - (22 + 135 + 55 + 60 + 45 + 95 + 45), align: "right" },
  ];

  function drawCategoryTableHeader() {
    doc.setFillColor(0.93, 0.94, 0.96);
    doc.setStrokeColor(0.85, 0.85, 0.88);
    doc.drawRect(doc.marginLeft, doc.cursorY, doc.contentWidth, 16, true, true);

    let hx = doc.marginLeft;
    for (const c of colC) {
      const tx = c.align === "right" ? hx + c.w - 5 : c.align === "center" ? hx + c.w / 2 : hx + 5;
      doc.drawText(c.name, tx, doc.cursorY + 3.5, { font: "F2", size: 7.5, color: [0.25, 0.25, 0.28], align: c.align as "left" | "right" | "center" });
      hx += c.w;
    }
    doc.cursorY += 16;
  }

  drawCategoryTableHeader();

  data.categories.forEach((cat, idx) => {
    doc.ensureSpace(16);
    // If a page break occurred in ensureSpace, re-draw table header
    if (doc.cursorY === 38) {
      drawCategoryTableHeader();
    }

    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 1.0 : 0.98, isEven ? 1.0 : 0.98, isEven ? 1.0 : 0.99);
    doc.setStrokeColor(0.9, 0.9, 0.92);
    doc.drawRect(doc.marginLeft, doc.cursorY, doc.contentWidth, 15, true, true);

    let rx = doc.marginLeft;

    // No
    doc.drawText(String(idx + 1), rx + colC[0].w / 2, doc.cursorY + 3.5, { font: "F1", size: 7.5, color: [0.4, 0.4, 0.4], align: "center" });
    rx += colC[0].w;

    // Category Name
    doc.drawText(cat.name, rx + 5, doc.cursorY + 3.5, { font: "F2", size: 8, color: [0.15, 0.15, 0.18], maxWidth: colC[1].w - 8 });
    rx += colC[1].w;

    // Tipe
    const isIncome = cat.type === "income";
    doc.drawText(isIncome ? "Masuk" : "Keluar", rx + colC[2].w / 2, doc.cursorY + 3.5, {
      font: "F1",
      size: 7.5,
      color: isIncome ? [0.08, 0.5, 0.2] : [0.75, 0.15, 0.15],
      align: "center",
    });
    rx += colC[2].w;

    // Kantong
    doc.drawText(cat.pocket && cat.pocket !== "none" ? cat.pocket.toUpperCase() : "-", rx + 5, doc.cursorY + 3.5, {
      font: "F1",
      size: 7.5,
      color: [0.45, 0.45, 0.48],
    });
    rx += colC[3].w;

    // Tx Count
    doc.drawText(`${cat.transactionCount}`, rx + colC[4].w / 2, doc.cursorY + 3.5, { font: "F1", size: 7.5, align: "center" });
    rx += colC[4].w;

    // Total Rp
    doc.drawText(formatRupiahSimple(cat.total), rx + colC[5].w - 5, doc.cursorY + 3.5, {
      font: "F2",
      size: 8,
      color: isIncome ? [0.08, 0.5, 0.2] : [0.15, 0.15, 0.18],
      align: "right",
    });
    rx += colC[5].w;

    // Porsi %
    doc.drawText(`${cat.percentage.toFixed(1)}%`, rx + colC[6].w - 5, doc.cursorY + 3.5, { font: "F1", size: 7.5, align: "right" });
    rx += colC[6].w;

    // Budget
    const budgetStr = cat.budgetAmount && cat.budgetAmount > 0 ? formatRupiahSimple(cat.budgetAmount) : "-";
    doc.drawText(budgetStr, rx + colC[7].w - 5, doc.cursorY + 3.5, { font: "F1", size: 7.5, color: [0.45, 0.45, 0.48], align: "right" });

    doc.cursorY += 15;
  });

  doc.cursorY += 16;

  // ==========================================
  // 5. RINCIAN TRANSAKSI TIAP KATEGORI (ITEMIZED DETAILS)
  // ==========================================
  if (data.categoryTransactions && data.categoryTransactions.length > 0) {
    doc.ensureSpace(60);
    doc.drawText("RINCIAN TRANSAKSI TIAP KATEGORI", doc.marginLeft, doc.cursorY, {
      font: "F2",
      size: 10,
      color: [0.11, 0.11, 0.12],
    });
    doc.cursorY += 12;

    const colTx = [
      { name: "No", w: 22, align: "center" },
      { name: "Tanggal", w: 58, align: "left" },
      { name: "Deskripsi Transaksi", w: 165, align: "left" },
      { name: "Akun / Dompet", w: 85, align: "left" },
      { name: "Catatan", w: 100, align: "left" },
      { name: "Jumlah (Rp)", w: doc.contentWidth - (22 + 58 + 165 + 85 + 100), align: "right" },
    ];

    data.categoryTransactions.forEach((group) => {
      const cat = group.category;
      const txList = group.transactions;
      if (txList.length === 0) return;

      doc.ensureSpace(55);

      // Category Header Banner
      doc.setFillColor(0.95, 0.96, 0.98);
      doc.setStrokeColor(0.85, 0.87, 0.92);
      doc.drawRect(doc.marginLeft, doc.cursorY, doc.contentWidth, 18, true, true);

      // Category Name & Pocket
      let bx = doc.marginLeft + 8;
      doc.drawText(cat.name.toUpperCase(), bx, doc.cursorY + 4, {
        font: "F2",
        size: 8.5,
        color: [0.0, 0.35, 0.75],
      });
      bx += getTextWidth(cat.name.toUpperCase(), 8.5, true) + 8;

      if (cat.pocket && cat.pocket !== "none") {
        doc.drawText(`[${cat.pocket.toUpperCase()}]`, bx, doc.cursorY + 4.5, {
          font: "F1",
          size: 7,
          color: [0.5, 0.5, 0.55],
        });
      }

      // Category Subtotal and count on right
      const summaryText = `${txList.length} Transaksi  •  Total: ${formatRupiahSimple(cat.total)} (${cat.percentage.toFixed(1)}%)`;
      doc.drawText(summaryText, doc.pageWidth - doc.marginRight - 8, doc.cursorY + 4, {
        font: "F2",
        size: 8,
        color: cat.type === "income" ? [0.08, 0.5, 0.2] : [0.2, 0.2, 0.22],
        align: "right",
      });

      doc.cursorY += 18;

      // Sub-table header
      doc.setFillColor(0.97, 0.98, 0.99);
      doc.setStrokeColor(0.88, 0.9, 0.93);
      doc.drawRect(doc.marginLeft, doc.cursorY, doc.contentWidth, 14, true, true);

      let hx = doc.marginLeft;
      for (const c of colTx) {
        const tx = c.align === "right" ? hx + c.w - 5 : c.align === "center" ? hx + c.w / 2 : hx + 5;
        doc.drawText(c.name, tx, doc.cursorY + 2.5, { font: "F2", size: 7, color: [0.35, 0.35, 0.38], align: c.align as "left" | "right" | "center" });
        hx += c.w;
      }
      doc.cursorY += 14;

      // Transaction Rows
      txList.forEach((tx, tIdx) => {
        doc.ensureSpace(15);
        if (doc.cursorY === 38) {
          // Re-draw subheader if broken onto new page
          doc.drawText(`(Lanjutan) ${cat.name}`, doc.marginLeft, doc.cursorY, { font: "F2", size: 8, color: [0.0, 0.35, 0.75] });
          doc.cursorY += 12;
        }

        const isEven = tIdx % 2 === 0;
        doc.setFillColor(isEven ? 1.0 : 0.985, isEven ? 1.0 : 0.985, isEven ? 1.0 : 0.99);
        doc.setStrokeColor(0.92, 0.92, 0.94);
        doc.drawRect(doc.marginLeft, doc.cursorY, doc.contentWidth, 14, true, true);

        let rx = doc.marginLeft;

        // No
        doc.drawText(String(tIdx + 1), rx + colTx[0].w / 2, doc.cursorY + 3, {
          font: "F1",
          size: 7,
          color: [0.45, 0.45, 0.48],
          align: "center",
        });
        rx += colTx[0].w;

        // Tanggal
        doc.drawText(tx.date, rx + 5, doc.cursorY + 3, { font: "F1", size: 7.5, color: [0.3, 0.3, 0.35] });
        rx += colTx[1].w;

        // Deskripsi
        const descText = tx.description || "Transaksi";
        doc.drawText(descText, rx + 5, doc.cursorY + 3, {
          font: "F1",
          size: 7.5,
          color: [0.12, 0.12, 0.14],
          maxWidth: colTx[2].w - 8,
        });
        rx += colTx[2].w;

        // Rekening / Akun
        doc.drawText(tx.accountName || "Umum", rx + 5, doc.cursorY + 3, {
          font: "F1",
          size: 7,
          color: [0.4, 0.4, 0.45],
          maxWidth: colTx[3].w - 8,
        });
        rx += colTx[3].w;

        // Catatan
        doc.drawText(tx.notes || "-", rx + 5, doc.cursorY + 3, {
          font: "F3",
          size: 7,
          color: [0.5, 0.5, 0.55],
          maxWidth: colTx[4].w - 8,
        });
        rx += colTx[4].w;

        // Jumlah (Rp)
        doc.drawText(formatRupiahSimple(tx.amount), rx + colTx[5].w - 5, doc.cursorY + 3, {
          font: "F2",
          size: 7.5,
          color: tx.type === "income" ? [0.08, 0.5, 0.2] : [0.15, 0.15, 0.18],
          align: "right",
        });

        doc.cursorY += 14;
      });

      // Subtotal footer row for category
      doc.ensureSpace(16);
      doc.setFillColor(0.96, 0.96, 0.97);
      doc.setStrokeColor(0.85, 0.85, 0.88);
      doc.drawRect(doc.marginLeft, doc.cursorY, doc.contentWidth, 15, true, true);

      doc.drawText(`Subtotal ${cat.name}:`, doc.pageWidth - doc.marginRight - colTx[5].w - 10, doc.cursorY + 3.5, {
        font: "F2",
        size: 7.5,
        color: [0.25, 0.25, 0.28],
        align: "right",
      });

      doc.drawText(formatRupiahSimple(cat.total), doc.pageWidth - doc.marginRight - 5, doc.cursorY + 3.5, {
        font: "F2",
        size: 8,
        color: cat.type === "income" ? [0.08, 0.5, 0.2] : [0.1, 0.1, 0.12],
        align: "right",
      });

      doc.cursorY += 21;
    });
  }

  // ==========================================
  // 6. RINGKASAN AKUN / REKENING (If available)
  // ==========================================
  if (data.accountSummaries && data.accountSummaries.length > 0) {
    doc.ensureSpace(65);
    doc.drawText("RINGKASAN PER AKUN / REKENING", doc.marginLeft, doc.cursorY, {
      font: "F2",
      size: 10,
      color: [0.11, 0.11, 0.12],
    });
    doc.cursorY += 12;

    const colA = [
      { name: "Nama Rekening / Akun", w: 180, align: "left" },
      { name: "Pemasukan (Rp)", w: 110, align: "right" },
      { name: "Pengeluaran (Rp)", w: 110, align: "right" },
      { name: "Arus Kas Bersih (Rp)", w: doc.contentWidth - (180 + 110 + 110), align: "right" },
    ];

    doc.setFillColor(0.93, 0.94, 0.96);
    doc.setStrokeColor(0.85, 0.85, 0.88);
    doc.drawRect(doc.marginLeft, doc.cursorY, doc.contentWidth, 16, true, true);

    let hx = doc.marginLeft;
    for (const c of colA) {
      const tx = c.align === "right" ? hx + c.w - 6 : hx + 6;
      doc.drawText(c.name, tx, doc.cursorY + 3.5, { font: "F2", size: 7.5, color: [0.25, 0.25, 0.28], align: c.align as "left" | "right" | "center" });
      hx += c.w;
    }
    doc.cursorY += 16;

    data.accountSummaries.forEach((acc, idx) => {
      doc.ensureSpace(15);
      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 1.0 : 0.98, isEven ? 1.0 : 0.98, isEven ? 1.0 : 0.99);
      doc.setStrokeColor(0.9, 0.9, 0.92);
      doc.drawRect(doc.marginLeft, doc.cursorY, doc.contentWidth, 15, true, true);

      let rx = doc.marginLeft;
      // Akun Name
      doc.drawText(acc.accountName, rx + 6, doc.cursorY + 3.5, { font: "F2", size: 8, color: [0.15, 0.15, 0.18] });
      rx += colA[0].w;

      // Pemasukan
      doc.drawText(formatRupiahSimple(acc.totalIncome), rx + colA[1].w - 6, doc.cursorY + 3.5, {
        font: "F1",
        size: 8,
        color: [0.08, 0.5, 0.2],
        align: "right",
      });
      rx += colA[1].w;

      // Pengeluaran
      doc.drawText(formatRupiahSimple(acc.totalExpense), rx + colA[2].w - 6, doc.cursorY + 3.5, {
        font: "F1",
        size: 8,
        color: [0.75, 0.15, 0.15],
        align: "right",
      });
      rx += colA[2].w;

      // Net
      const isNetPos = acc.net >= 0;
      doc.drawText(formatRupiahSimple(acc.net), rx + colA[3].w - 6, doc.cursorY + 3.5, {
        font: "F2",
        size: 8,
        color: isNetPos ? [0.0, 0.35, 0.75] : [0.75, 0.15, 0.15],
        align: "right",
      });

      doc.cursorY += 15;
    });

    doc.cursorY += 16;
  }

  return doc.build(data.generatedAt);
}

/**
 * Trigger client-side download of the financial report PDF
 */
export function downloadFinancialReportPdf(data: FinancialReportData, filename?: string): void {
  const binary = generateFinancialReportPdf(data);
  const blob = new Blob([binary as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const cleanPeriod = (data.periodLabel || "Report").replace(/[^a-zA-Z0-9_-]/g, "-");
  const finalFilename = filename || `Laporan-Keuangan-${cleanPeriod}.pdf`;

  const link = document.createElement("a");
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
