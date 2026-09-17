import React, { useMemo, useState } from "react";
import { Building2, MapPin, PackageSearch, Search } from "lucide-react";
import { Input } from "../../app/components/ui/input";
import {
  buildLocationSuggestions,
  COMMON_LOCATION_OPTIONS,
} from "./locationSuggestions";

const EQUIPMENT_OPTIONS = [
  "Dry Van",
  "Reefer",
  "Flatbed",
  "Power Only",
  "Box Truck",
  "Other",
];

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function optionIcon(type) {
  if (type === "broker") {
    return Building2;
  }

  if (type === "equipment") {
    return PackageSearch;
  }

  return MapPin;
}

export function SearchSuggestInput({
  value,
  onChange,
  locationOptions = [],
  brokerOptions = [],
  className = "",
}) {
  const [focused, setFocused] = useState(false);
  const suggestions = useMemo(() => {
    const locationItems = buildLocationSuggestions([
      ...locationOptions,
      ...COMMON_LOCATION_OPTIONS,
    ]).map((option) => ({
      ...option,
      type: "location",
    }));
    const brokerItems = brokerOptions
      .map((broker) => broker.trim())
      .filter(Boolean)
      .slice(0, 40)
      .map((broker) => ({
        label: broker,
        value: broker,
        hint: "Broker",
        type: "broker",
      }));
    const equipmentItems = EQUIPMENT_OPTIONS.map((equipment) => ({
      label: equipment,
      value: equipment,
      hint: "Equipment",
      type: "equipment",
    }));

    return [...locationItems, ...brokerItems, ...equipmentItems];
  }, [brokerOptions, locationOptions]);
  const filtered = useMemo(() => {
    const normalizedQuery = normalize(value);

    if (!focused || !normalizedQuery) {
      return [];
    }

    return suggestions
      .filter(
        (option) =>
          normalize(option.label).includes(normalizedQuery) ||
          normalize(option.value).includes(normalizedQuery)
      )
      .slice(0, 8);
  }, [focused, suggestions, value]);

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        id="load-board-filter-search"
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 130)}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Origin, destination, broker, phone, equipment"
        autoComplete="off"
        className="h-9 rounded-md border-border bg-background pl-8 text-xs text-foreground placeholder:text-muted-foreground"
      />

      {filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-md border border-border bg-popover p-1 shadow-xl">
          {filtered.map((option) => {
            const Icon = optionIcon(option.type);

            return (
              <button
                key={`search-${option.type}-${option.label}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setFocused(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-accent"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-foreground">
                    {option.label}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {option.hint || "Suggestion"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
