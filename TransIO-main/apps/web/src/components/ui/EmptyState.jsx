import React from "react";

function renderIcon(Icon) {
  if (!Icon) {
    return null;
  }

  if (React.isValidElement(Icon)) {
    return Icon;
  }

  return React.createElement(Icon, { className: "h-5 w-5" });
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon,
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-8 text-center shadow-sm">
      {Icon ? (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-foreground">
          {renderIcon(Icon)}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export default EmptyState;
