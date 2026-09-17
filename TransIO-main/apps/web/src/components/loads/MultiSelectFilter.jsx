import React, { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "../../app/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../app/components/ui/popover";
import { Input } from "../../app/components/ui/input";
import { cn } from "../../app/components/ui/utils";

function normalizeOption(option) {
  if (typeof option === "string") {
    return { label: option, value: option };
  }

  return option;
}

export function MultiSelectFilter({
  label,
  values = [],
  options = [],
  onChange,
  placeholder,
  searchable = false,
  className,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedOptions = useMemo(
    () => options.map(normalizeOption),
    [options]
  );
  const selectedSet = useMemo(() => new Set(values), [values]);
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return normalizedOptions;
    }

    return normalizedOptions.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedOptions, query]);

  const toggleValue = (value) => {
    if (selectedSet.has(value)) {
      onChange(values.filter((item) => item !== value));
      return;
    }

    onChange([...values, value]);
  };

  const summary =
    values.length === 0
      ? ""
      : values.length === 1
      ? values[0]
      : `${values.length} selected`;

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
            <span className={values.length > 0 ? "mr-1 text-muted-foreground" : ""}>
              {label}
            </span>
            {summary}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[9999] w-64 rounded-md border-border bg-popover p-2 shadow-xl"
      >
        {searchable && (
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${label.toLowerCase()}`}
              className="h-8 rounded-md border-border bg-background pl-8 text-xs"
            />
          </div>
        )}

        <div className="max-h-64 overflow-auto pr-1">
          {filteredOptions.map((option) => {
            const selected = selectedSet.has(option.value);

            return (
              <button
                key={option.value}
                type="button"
                role="menuitemcheckbox"
                aria-checked={selected}
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleValue(option.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleValue(option.value);
                  }
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-accent"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border border-border bg-background",
                    selected && "border-primary bg-primary text-primary-foreground"
                  )}
                >
                  {selected && <Check className="h-3 w-3" />}
                </span>
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {selected && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            );
          })}

          {filteredOptions.length === 0 && (
            <div className="px-2 py-4 text-center text-xs text-muted-foreground">
              No options
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
