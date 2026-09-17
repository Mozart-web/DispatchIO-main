import React from "react";

export function Skeleton({ className = "", ...props }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/5 ${className}`}
      {...props}
    />
  );
}

export default Skeleton;
