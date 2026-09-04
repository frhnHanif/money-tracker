import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "secondary" | "destructive" | "outline";
}) {
  const variants: Record<string, string> = {
    default: "bg-[#0066cc]/10 text-[#0066cc] border-[#0066cc]/20",
    secondary: "bg-[#f5f5f7] text-[#333333] border-[#f0f0f0] dark:bg-[#2a2a2c] dark:text-[#cccccc] dark:border-white/10",
    destructive: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
    outline: "text-foreground border-border",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
