import React, { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, MapPin, Search } from "lucide-react";
import { Button } from "../../app/components/ui/button";
import { Input } from "../../app/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../app/components/ui/popover";
import { cn } from "../../app/components/ui/utils";
import { buildLocationSuggestions } from "./locationSuggestions";
export {
  buildLocationSuggestions,
  COMMON_LOCATION_OPTIONS,
} from "./locationSuggestions";

function normalizeLocationSearch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/los\s+anjeles/g, "los angeles")
    .replace(/anjeles/g, "angeles")
    .replace(/[^a-z0-9]+/g, "");
}

function matchesLocationSuggestion(option, query) {
  const normalizedQuery = normalizeLocationSearch(query);

  if (!normalizedQuery) {
    return false;
  }

  const normalizedLabel = normalizeLocationSearch(option.label);
  const normalizedValue = normalizeLocationSearch(option.value);
  const aliasLabel = normalizeLocationSearch(
    option.label.replace(/angeles/gi, "anjeles")
  );

  return (
    normalizedLabel.includes(normalizedQuery) ||
    normalizedValue.includes(normalizedQuery) ||
    aliasLabel.includes(normalizedQuery)
  );
}

export function LocationSuggestFilter({
  label,
  query = "",
  states = [],
  stateOptions = [],
  locationOptions = [],
  onQueryChange,
  onStatesChange,
  placeholder = "City or state",
  className,
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(query);
  const selectedStates = useMemo(() => new Set(states), [states]);
  const suggestions = useMemo(
    () => buildLocationSuggestions(locationOptions),
    [locationOptions]
  );
  const filteredSuggestions = useMemo(() => {
    if (!draft.trim()) {
      return [];
    }

    return suggestions
      .filter((option) => matchesLocationSuggestion(option, draft))
      .slice(0, 7);
  }, [draft, suggestions]);
  const showSuggestions = open && filteredSuggestions.length > 0;
  const summary =
    query || states.length
      ? [query, states.length ? states.join(",") : ""].filter(Boolean).join(" / ")
      : "";

  const commitQuery = (value) => {
    setDraft(value);
    onQueryChange(value);
  };

  useEffect(() => {
    if (!open) {
      setDraft(query);
    }
  }, [open, query]);

  const toggleState = (value) => {
    if (selectedStates.has(value)) {
      onStatesChange(states.filter((item) => item !== value));
      return;
    }

    onStatesChange([...states, value]);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        if (open) {
          setDraft(query);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-9 min-w-0 justify-between rounded-md border-0 bg-transparent px-2 text-xs text-foreground hover:bg-accent",
            className
          )}
          aria-expanded={open}
        >
          <span className="min-w-0 truncate text-left">
            <span
              className={
                query || states.length ? "mr-1 text-muted-foreground" : ""
              }
            >
              {label}
            </span>
            {summary}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[9999] w-[min(22rem,calc(100vw-1rem))] rounded-md border-border bg-popover p-2 shadow-xl"
      >
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={draft}
            autoFocus
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setDraft(event.target.value);
              onQueryChange(event.target.value);
            }}
            placeholder={placeholder}
            autoComplete="off"
            className="h-8 rounded-md border-border bg-background pl-8 text-xs"
          />

          {showSuggestions && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover p-1 shadow-xl">
              {filteredSuggestions.map((option) => (
                <button
                  key={`${label}-${option.label}`}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    commitQuery(option.value);
                    if (option.state && !selectedStates.has(option.state)) {
                      onStatesChange([...states, option.state]);
                    }
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-accent"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-foreground">
                      {option.label}
                    </span>
                    {option.hint && (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {option.hint}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-2 rounded-md border border-border bg-background/50 p-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              States
            </span>
            {states.length > 0 && (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.stopPropagation();
                  onStatesChange([]);
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
          <div className="grid max-h-36 grid-cols-5 gap-1 overflow-auto pr-1">
            {stateOptions.map((state) => {
              const selected = selectedStates.has(state);

              return (
                <button
                  key={`${label}-${state}`}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleState(state);
                  }}
                  className={cn(
                    "flex h-7 items-center justify-center gap-1 rounded-md border border-border text-[11px] text-foreground hover:bg-accent",
                    selected && "border-primary bg-primary text-primary-foreground"
                  )}
                >
                  {selected && <Check className="h-3 w-3" />}
                  {state}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
