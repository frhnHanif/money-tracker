"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { toast } from "sonner";

/**
 * Normalize PapaParse headers: trim whitespace, lowercase.
 * Returns a map from normalized key -> original key.
 */
function normalizeHeaders(results: any) {
  const headerMap = new Map<string, string>();
  if (results.meta.fields) {
    for (const field of results.meta.fields) {
      headerMap.set(field.trim().toLowerCase(), field);
    }
  }
  return headerMap;
}

/** Get value from row using case-insensitive, whitespace-trimmed header match. */
function getField(row: any, headerMap: Map<string, string>, key: string): string {
  const original = headerMap.get(key);
  return original ? (row[original] || "").trim() : "";
}

function parseRows(results: any) {
  const headerMap = normalizeHeaders(results);

  return results.data
    .filter((row: any) => {
      const dateVal = getField(row, headerMap, "date");
      return dateVal.length > 0;
    })
    .map((row: any) => ({
      date: getField(row, headerMap, "date"),
      type: getField(row, headerMap, "type"),
      category: getField(row, headerMap, "category") || "Uncategorized",
      description: getField(row, headerMap, "expenses"),
      notes: getField(row, headerMap, "notes"),
      account: getField(row, headerMap, "account"),
      amount: getField(row, headerMap, "ammount"),
    }));
}

/**
 * Google Sheets exports often have a "title" row (e.g. "Input Data,,,,,,,Recap,,,")
 * before the actual header row. Find the real header and skip everything before it.
 */
async function getCleanCsvText(f: File): Promise<string> {
  const text = await f.text();
  const lines = text.split(/\r?\n/);
  const headerIdx = lines.findIndex((line) => /^Date[,;]/.test(line.trim()));
  if (headerIdx > 0) {
    return lines.slice(headerIdx).join("\n");
  }
  return text;
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setParseError(null);

    const Papa = (await import("papaparse")).default;
    const csvText = await getCleanCsvText(f);
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = parseRows(results);
        setPreview(data.slice(0, 10));
      },
      error: (err: Error) => {
        setParseError("Gagal membaca CSV: " + err.message);
        setPreview([]);
      },
    });
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);

    const Papa = (await import("papaparse")).default;
    const csvText = await getCleanCsvText(file);
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = parseRows(results);

        const res = await fetch("/api/transactions/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        });

        if (res.ok) {
          const result = await res.json();
          toast.success(
            `Import selesai: ${result.imported} berhasil, ${result.skipped} dilewati`
          );
          setFile(null);
          setPreview([]);
        } else {
          toast.error("Import gagal");
        }
        setLoading(false);
      },
      error: () => {
        toast.error("Gagal membaca file CSV");
        setLoading(false);
      },
    });
  };

  return (
    <AppShell>
      <div className="space-y-4 pb-4">
        <p className="text-sm text-[#7a7a7a] dark:text-[#cccccc]">
          Import histori dari Google Sheets (format kolom: Date, Type,
          Category, Expenses, Notes, Account, Ammount). Baris "Sisa" dan kolom
          rekap otomatis dilewati.
        </p>

        <div className="space-y-3 rounded-lg bg-white p-4 ring-1 ring-[#f0f0f0] dark:bg-[#272729] dark:ring-white/10">
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="text-sm"
          />
          {parseError && (
            <p className="rounded bg-red-50 p-2 text-xs text-red-500 dark:bg-red-950">
              {parseError}
            </p>
          )}
          {preview.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-1 text-left">Date</th>
                    <th className="p-1 text-left">Type</th>
                    <th className="p-1 text-left">Category</th>
                    <th className="p-1 text-left">Desc</th>
                    <th className="p-1 text-left">Account</th>
                    <th className="p-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row: any, i: number) => (
                    <tr key={i} className="border-t">
                      <td className="p-1">{row.date}</td>
                      <td className="p-1">{row.type}</td>
                      <td className="p-1">{row.category}</td>
                      <td className="p-1">{row.description}</td>
                      <td className="p-1">{row.account}</td>
                      <td className="p-1 text-right">{row.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {file && (
            <Button onClick={handleImport} disabled={loading} className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              {loading ? "Mengimpor..." : `Import CSV (${preview.length}+ baris)`}
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}