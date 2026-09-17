import { cn } from "./utils";
import React from "react";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-lg bg-white/5", className)}
      {...props}
    />
  );
}

export { Skeleton };
