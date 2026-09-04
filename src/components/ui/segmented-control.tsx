"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SegmentedControlProps {
  options: { value: string; label: string; color?: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps) {
  return (
    <div
      className={cn(
        "relative flex rounded-full bg-muted p-1",
        className
      )}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200",
              isActive
                ? "text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
      {/* Active indicator */}
      <div
        className={cn(
          "absolute top-1 bottom-1 rounded-full transition-all duration-200 ease-out",
        )}
        style={{
          left: `${(options.findIndex((o) => o.value === value) / options.length) * 100}%`,
          width: `${100 / options.length}%`,
          backgroundColor: options.find((o) => o.value === value)?.color ?? "#f43f5e",
        }}
      />
    </div>
  );
}
