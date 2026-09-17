"use client";

import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const neutralToastVariables = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--success-bg": "var(--popover)",
  "--success-text": "var(--popover-foreground)",
  "--success-border": "var(--border)",
  "--info-bg": "var(--popover)",
  "--info-text": "var(--popover-foreground)",
  "--info-border": "var(--border)",
  "--warning-bg": "var(--popover)",
  "--warning-text": "var(--popover-foreground)",
  "--warning-border": "var(--border)",
  "--error-bg": "var(--popover)",
  "--error-text": "var(--popover-foreground)",
  "--error-border": "var(--border)",
} as CSSProperties;

const neutralToastClass =
  "group toast group-[.toaster]:border-border group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:shadow-2xl group-[.toaster]:shadow-black/15";

const MAX_TOAST_DURATION = 3000;

function clampToastDuration(duration?: number) {
  return Math.min(duration ?? MAX_TOAST_DURATION, MAX_TOAST_DURATION);
}

const Toaster = ({
  toastOptions,
  style,
  duration,
  visibleToasts,
  ...props
}: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      duration={clampToastDuration(duration)}
      visibleToasts={Math.min(visibleToasts ?? 2, 2)}
      style={{ ...neutralToastVariables, ...style }}
      toastOptions={{
        ...toastOptions,
        duration: clampToastDuration(toastOptions?.duration),
        classNames: {
          toast: neutralToastClass,
          default: neutralToastClass,
          success: neutralToastClass,
          error: neutralToastClass,
          info: neutralToastClass,
          warning: neutralToastClass,
          loading: neutralToastClass,
          title: "group-[.toast]:font-semibold group-[.toast]:text-foreground",
          description: "group-[.toast]:text-muted-foreground",
          icon: "group-[.toast]:text-foreground",
          closeButton:
            "group-[.toast]:border-border group-[.toast]:bg-popover group-[.toast]:text-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
