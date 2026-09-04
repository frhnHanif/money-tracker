"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Wallet,
  Tag,
  Target,
  Upload,
  Bell,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 ml-1 text-[11px] font-medium uppercase tracking-wide text-[#7a7a7a] dark:text-[#cccccc]">
        {label}
      </p>
      <div className="divide-y divide-[#f0f0f0] overflow-hidden rounded-lg bg-white ring-1 ring-[#f0f0f0] dark:divide-white/10 dark:bg-[#272729] dark:ring-white/10">
        {children}
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  color,
  title,
  href,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  title: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#f5f5f7] dark:hover:bg-[#2a2a2c]"
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: color + "18" }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-[#1d1d1f] dark:text-white">
        {title}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#7a7a7a] dark:text-[#cccccc]" />
    </Link>
  );
}

function ReminderRow() {
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState("20:00");

  useEffect(() => {
    const saved = localStorage.getItem("reminderEnabled");
    const savedTime = localStorage.getItem("reminderTime");
    if (saved !== null) setEnabled(saved === "true");
    if (savedTime) setTime(savedTime);
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem("reminderEnabled", String(next));
    if (next) {
      toast.success("Pengingat recap diaktifkan");
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTime(newTime);
    localStorage.setItem("reminderTime", newTime);
  };

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f59e0b]/18">
          <Bell className="h-4 w-4 text-[#f59e0b]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">
            Pengingat Recap
          </p>
          {enabled && (
            <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
              Setiap hari pukul {time}
            </p>
          )}
        </div>
        <button
          onClick={toggle}
          type="button"
          aria-label="Aktifkan pengingat"
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
            enabled ? "bg-[#0066cc]" : "bg-[#e0e0e0] dark:bg-[#3a3a3c]"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
      {enabled && (
        <div className="flex items-center justify-between px-4 py-3">
          <Label className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
            Jam pengingat (24h)
          </Label>
          <Input
            type="time"
            value={time}
            onChange={handleTimeChange}
            className="h-8 w-32 text-sm"
            step="60"
          />
        </div>
      )}
    </>
  );
}

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="space-y-6 pb-4">
        <Section label="Keuangan">
          <Row icon={Wallet} color="#0066cc" title="Akun & Rekening" href="/settings/accounts" />
          <Row icon={Tag} color="#8b5cf6" title="Kategori" href="/settings/categories" />
          <Row icon={Target} color="#f59e0b" title="Budget Bulanan" href="/settings/budgets" />
        </Section>

        <Section label="Data">
          <Row icon={Upload} color="#06b6d4" title="Import CSV" href="/settings/import" />
        </Section>

        <Section label="Lainnya">
          <ReminderRow />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
              <LogOut className="h-4 w-4 text-red-500 dark:text-red-400" />
            </div>
            <span className="text-[15px] font-medium text-red-500 dark:text-red-400">
              Keluar
            </span>
          </button>
        </Section>
      </div>
    </AppShell>
  );
}