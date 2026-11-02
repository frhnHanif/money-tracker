export const DEFAULT_CATEGORIES = [
  { name: "Makan", type: "expense" as const, icon: "utensils", color: "#ef4444", pocket: "living" as const },
  { name: "Jajan", type: "expense" as const, icon: "cookie", color: "#f97316", pocket: "playing" as const },
  { name: "Shopping", type: "expense" as const, icon: "shopping-bag", color: "#a855f7", pocket: "playing" as const },
  { name: "Laundry", type: "expense" as const, icon: "shirt", color: "#06b6d4", pocket: "living" as const },
  { name: "Operasional", type: "expense" as const, icon: "car", color: "#64748b", pocket: "living" as const },
  { name: "ATK/Project", type: "expense" as const, icon: "pencil", color: "#8b5cf6", pocket: "living" as const },
  { name: "Sharing", type: "expense" as const, icon: "users", color: "#ec4899", pocket: "giving" as const },
  { name: "Talangan/Piutang", type: "expense" as const, icon: "hand", color: "#f59e0b", pocket: "none" as const },
  { name: "Topup", type: "both" as const, icon: "arrow-right-left", color: "#3b82f6", pocket: "none" as const },
  { name: "Gaji", type: "income" as const, icon: "briefcase", color: "#22c55e", pocket: "none" as const },
  { name: "Orang Tua", type: "income" as const, icon: "heart", color: "#e11d48", pocket: "none" as const },
  { name: "Invest", type: "both" as const, icon: "trending-up", color: "#14b8a6", pocket: "saving" as const },
  { name: "Sisa", type: "income" as const, icon: "archive", color: "#9ca3af", pocket: "none" as const },
  { name: "Uncategorized", type: "expense" as const, icon: "help-circle", color: "#6b7280", pocket: "none" as const },
];

export const DEFAULT_ACCOUNTS = [
  { name: "Tunai", type: "cash" as const, icon: "banknote", color: "#16a34a", initialBalance: 0, sortOrder: 0 },
  { name: "Bank", type: "bank" as const, icon: "landmark", color: "#0066ae", initialBalance: 0, sortOrder: 1 },
];
