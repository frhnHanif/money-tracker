export const DEFAULT_CATEGORIES = [
  { name: "Makan", type: "expense" as const, icon: "utensils", color: "#ef4444" },
  { name: "Jajan", type: "expense" as const, icon: "cookie", color: "#f97316" },
  { name: "Shopping", type: "expense" as const, icon: "shopping-bag", color: "#a855f7" },
  { name: "Laundry", type: "expense" as const, icon: "shirt", color: "#06b6d4" },
  { name: "Operasional", type: "expense" as const, icon: "car", color: "#64748b" },
  { name: "ATK/Project", type: "expense" as const, icon: "pencil", color: "#8b5cf6" },
  { name: "Sharing", type: "expense" as const, icon: "users", color: "#ec4899" },
  { name: "Talangan/Piutang", type: "expense" as const, icon: "hand", color: "#f59e0b" },
  { name: "Topup", type: "both" as const, icon: "arrow-right-left", color: "#3b82f6" },
  { name: "Gaji", type: "income" as const, icon: "briefcase", color: "#22c55e" },
  { name: "Orang Tua", type: "income" as const, icon: "heart", color: "#e11d48" },
  { name: "Invest", type: "both" as const, icon: "trending-up", color: "#14b8a6" },
  { name: "Sisa", type: "income" as const, icon: "archive", color: "#9ca3af" },
  { name: "Uncategorized", type: "expense" as const, icon: "help-circle", color: "#6b7280" },
];

export const DEFAULT_ACCOUNTS = [
  { name: "Tunai", type: "cash" as const, icon: "banknote", color: "#16a34a", initialBalance: 0, sortOrder: 0 },
  { name: "Bank", type: "bank" as const, icon: "landmark", color: "#0066ae", initialBalance: 0, sortOrder: 1 },
];
