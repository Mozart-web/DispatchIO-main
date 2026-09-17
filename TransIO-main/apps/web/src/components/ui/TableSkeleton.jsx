import React from "react";
import { Skeleton } from "./Skeleton";

export function TableSkeleton({ columns = 4, rows = 5, className = "" }) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] ${className}`}
    >
      <div
        className="grid gap-3 border-b border-white/10 px-4 py-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-3 rounded-lg" />
        ))}
      </div>
      <div className="divide-y divide-white/10">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-3 px-4 py-3"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: columns }).map((_, columnIndex) => (
              <Skeleton
                key={columnIndex}
                className={`h-4 rounded-lg ${
                  columnIndex === columns - 1 ? "w-2/3" : "w-full"
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TableSkeleton;
