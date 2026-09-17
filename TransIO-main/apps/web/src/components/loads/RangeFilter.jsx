import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "../../app/components/ui/button";
import { Input } from "../../app/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../app/components/ui/popover";
import { cn } from "../../app/components/ui/utils";

function formatRangeValue(value, prefix, suffix) {
  if (value === "" || value === undefined || value === null) {
    return "";
  }

  return `${prefix}${Number(value).toLocaleString()}${suffix}`;
}

function rangeSummary(minValue, maxValue, prefix, suffix) {
  const minLabel = formatRangeValue(minValue, prefix, suffix);
  const maxLabel = formatRangeValue(maxValue, prefix, suffix);

  if (minLabel && maxLabel) {
    return `${minLabel} - ${maxLabel}`;
  }

  if (minLabel) {
    return `Min ${minLabel}`;
  }

  if (maxLabel) {
    return `Max ${maxLabel}`;
  }

  return "";
}

export function RangeFilter({
  label,
  minValue = "",
  maxValue = "",
  onChange,
  minPlaceholder = "Min",
  maxPlaceholder = "Max",
  prefix = "",
  suffix = "",
  className,
}) {
  const [open, setOpen] = useState(false);
  const hasValue = minValue !== "" || maxValue !== "";
  const summary = hasValue
    ? rangeSummary(minValue, maxValue, prefix, suffix)
    : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-9 min-w-0 justify-between rounded-md border-border bg-background px-2.5 text-xs text-foreground hover:bg-accent",
            className
          )}
          aria-expanded={open}
        >
          <span className="min-w-0 truncate text-left">
            <span className={hasValue ? "mr-1 text-muted-foreground" : ""}>
              {label}
            </span>
            {summary}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[9999] w-64 rounded-md border-border bg-popover p-3 shadow-xl"
      >
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Min
            </label>
            <Input
              type="number"
              min="0"
              value={minValue}
              placeholder={minPlaceholder}
              onChange={(event) =>
                onChange({ min: event.target.value, max: maxValue })
              }
              className="h-8 rounded-md border-border bg-background text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Max
            </label>
            <Input
              type="number"
              min="0"
              value={maxValue}
              placeholder={maxPlaceholder}
              onChange={(event) =>
                onChange({ min: minValue, max: event.target.value })
              }
              className="h-8 rounded-md border-border bg-background text-xs"
            />
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange({ min: "", max: "" })}
          className="mt-2 h-8 w-full rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          Clear range
        </Button>
      </PopoverContent>
    </Popover>
  );
}
