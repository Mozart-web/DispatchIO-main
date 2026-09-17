import React from "react";
import { Skeleton } from "./Skeleton";

export function CardSkeleton({ rows = 3, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/[0.03] p-4 ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-3 w-24 rounded-lg" />
          <Skeleton className="h-7 w-36 rounded-lg" />
          {Array.from({ length: rows }).map((_, index) => (
            <Skeleton
              key={index}
              className={`h-3 rounded-lg ${
                index === rows - 1 ? "w-2/3" : "w-full"
              }`}
            />
          ))}
        </div>
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
      </div>
    </div>
  );
}

export default CardSkeleton;
