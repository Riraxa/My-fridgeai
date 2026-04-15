"use client";

import { Skeleton } from "@/app/components/ui/Skeleton";

interface MenuSkeletonProps {
  count?: number;
}

export function MenuSkeleton({ count = 2 }: MenuSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="bg-[var(--surface-bg)] rounded-3xl p-6 border border-[var(--surface-border)] space-y-4"
        >
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>

          {/* Stats Bar */}
          <div className="flex gap-2 py-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>

          {/* Dishes List */}
          <div className="space-y-3 pt-2">
            <div className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              <div className="space-y-2 flex-grow">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              <div className="space-y-2 flex-grow">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </div>

          {/* Button */}
          <Skeleton className="h-12 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
