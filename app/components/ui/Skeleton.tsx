"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[var(--surface-bg)] border border-[var(--surface-border)] relative overflow-hidden",
        // Shimmer effect
        "after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_2s_infinite] after:bg-gradient-to-r after:from-transparent after:via-[rgba(255,255,255,0.05)] after:to-transparent",
        className
      )}
      {...props}
    />
  );
}

// Ensure the shimmer animation is available in your CSS. 
// If not, we can rely on animate-pulse or add a global style.
