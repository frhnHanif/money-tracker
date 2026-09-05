"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, ChevronRight, EyeOff } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { NotificationItem } from "@/app/api/notifications/route";

const READ_KEY = "notificationRead";

const toneStyles = {
  danger: {
    bg: "#ef4444",
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
  },
  warning: {
    bg: "#f59e0b",
    dot: "bg-amber-500",
    text: "text-[#b45309] dark:text-[#fbbf24]",
  },
  info: {
    bg: "#0066cc",
    dot: "bg-[#0066cc] dark:bg-[#2997ff]",
    text: "text-[#0066cc] dark:text-[#2997ff]",
  },
} as const;

interface NotificationsResponse {
  count: number;
  items: NotificationItem[];
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]"));
    } catch {
      return new Set();
    }
  });

  const reminderEnabled =
    typeof window !== "undefined" &&
    localStorage.getItem("reminderEnabled") === "true";

  const { data } = useQuery<NotificationsResponse>({
    queryKey: ["notifications"],
    queryFn: () =>
      fetch(`/api/notifications?reminderEnabled=${reminderEnabled ? "1" : "0"}`).then(
        (r) => r.json()
      ),
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  const markAsRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      if (typeof window !== "undefined") {
        localStorage.setItem(READ_KEY, JSON.stringify([...next]));
      }
      return next;
    });
  };

  const items = (data?.items ?? []).filter((i) => !readIds.has(i.id));
  const count = items.length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Perlu perhatian"
        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#7a7a7a] ring-1 ring-[#e0e0e0] dark:bg-[#2a2a2c] dark:text-[#cccccc] dark:ring-white/10"
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="flex h-[75vh] flex-col rounded-t-3xl border-0 p-0 [&>button]:hidden"
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-[#e0e0e0] dark:bg-[#3a3a3c]" />
          </div>
          <SheetHeader className="px-5 pb-3 text-left">
            <SheetTitle className="text-base">Perlu Perhatian</SheetTitle>
          </SheetHeader>
          <div className="h-px bg-[#f0f0f0] dark:bg-white/10" />
          <div className="flex-1 overflow-y-auto px-5 py-3 pb-8">
            {count === 0 ? (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-[#16a34a]/10 dark:bg-[#4ade80]/15">
                  <CheckCircle2 className="h-6 w-6 text-[#16a34a] dark:text-[#4ade80]" />
                </div>
                <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                  Semua beres
                </p>
                <p className="text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                  Tidak ada yang perlu perhatian saat ini
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => {
                  const tone = toneStyles[item.tone];
                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setOpen(false);
                        if (item.href) router.push(item.href);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setOpen(false);
                          if (item.href) router.push(item.href);
                        }
                      }}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-[#f5f5f7] dark:hover:bg-[#2a2a2c]"
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: tone.bg + "1a" }}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${tone.dot}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium text-[#1d1d1f] dark:text-white">
                          {item.title}
                        </p>
                        <p className="truncate text-xs text-[#7a7a7a] dark:text-[#cccccc]">
                          {item.description}
                        </p>
                      </div>
                      {item.href && (
                        <ChevronRight className="h-4 w-4 shrink-0 text-[#7a7a7a] dark:text-[#cccccc]" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(item.id);
                        }}
                        aria-label="Tandai sudah dibaca"
                        title="Tandai sudah dibaca"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#7a7a7a] hover:bg-[#f0f0f0] hover:text-[#16a34a] dark:text-[#cccccc] dark:hover:bg-[#3a3a3c] dark:hover:text-[#4ade80]"
                      >
                        <EyeOff className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}