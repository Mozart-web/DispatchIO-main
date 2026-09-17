import { useMemo, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Filter, MapPin } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React from "react";

interface FilterPanelProps {
  onFilter: (filters: any) => void;
  locationOptions?: string[];
}

interface LocationSuggestion {
  label: string;
  value: string;
  hint?: string;
}

const COMMON_LOCATION_OPTIONS: LocationSuggestion[] = [
  { label: "Los Angeles, CA", value: "Los Angeles", hint: "City" },
  { label: "Los Angeles County, CA", value: "Los Angeles", hint: "County" },
  { label: "Port of Los Angeles, CA", value: "Los Angeles", hint: "Port" },
  { label: "Long Beach, CA", value: "Long Beach", hint: "Nearby port" },
  { label: "Ontario, CA", value: "Ontario", hint: "Inland Empire" },
  { label: "Chicago, IL", value: "Chicago", hint: "City" },
  { label: "Dallas, TX", value: "Dallas", hint: "City" },
  { label: "Atlanta, GA", value: "Atlanta", hint: "City" },
  { label: "Houston, TX", value: "Houston", hint: "City" },
  { label: "Phoenix, AZ", value: "Phoenix", hint: "City" },
];

function normalizeLocationSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/los\s+anjeles/g, "los angeles")
    .replace(/anjeles/g, "angeles")
    .replace(/[^a-z0-9]+/g, "");
}

function matchesLocationSuggestion(option: LocationSuggestion, query: string) {
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

function LocationSuggestInput({
  id,
  label,
  placeholder,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  options: LocationSuggestion[];
  onChange: (value: string) => void;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const suggestions = useMemo(() => {
    if (!value.trim()) {
      return [];
    }

    return options
      .filter((option) => matchesLocationSuggestion(option, value))
      .slice(0, 6);
  }, [options, value]);
  const showSuggestions = isFocused && suggestions.length > 0;

  return (
    <div className="relative space-y-1.5">
      <Label htmlFor={id} className="text-xs text-foreground sm:text-sm">
        {label}
      </Label>
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        onFocus={() => setIsFocused(true)}
        onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        className="h-9 rounded-md border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground"
      />

      {showSuggestions && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover p-1 shadow-xl">
          {suggestions.map((option) => (
            <button
              key={`${id}-${option.label}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option.value);
                setIsFocused(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-accent"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground">
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
  );
}

export function FilterPanel({ onFilter, locationOptions = [] }: FilterPanelProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    origin: "",
    destination: "",
    pickupDate: "",
    trailerType: "all",
    minRate: "",
    maxRate: "",
    maxDistance: "",
    maxWeight: "",
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const applyFilters = () => {
    onFilter({
      ...filters,
      minRate: filters.minRate ? Number(filters.minRate) : undefined,
      maxRate: filters.maxRate ? Number(filters.maxRate) : undefined,
      maxDistance: filters.maxDistance
        ? Number(filters.maxDistance)
        : undefined,
      maxWeight: filters.maxWeight ? Number(filters.maxWeight) : undefined,
    });
  };

  const clearFilters = () => {
    const emptyFilters = {
      origin: "",
      destination: "",
      pickupDate: "",
      trailerType: "all",
      minRate: "",
      maxRate: "",
      maxDistance: "",
      maxWeight: "",
    };
    setFilters(emptyFilters);
    onFilter({});
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === "trailerType") {
      return value !== "all";
    }

    return String(value).trim() !== "";
  }).length;
  const suggestions = useMemo<LocationSuggestion[]>(() => {
    const items = new Map<string, LocationSuggestion>();

    locationOptions.forEach((option) => {
      const label = option.trim();

      if (!label) {
        return;
      }

      items.set(label.toLowerCase(), {
        label,
        value: label,
        hint: "Available lane",
      });
    });

    COMMON_LOCATION_OPTIONS.forEach((option) => {
      items.set(option.label.toLowerCase(), option);
    });

    return Array.from(items.values());
  }, [locationOptions]);

  return (
    <div className="border-b border-border bg-card/85">
      <div className="px-3 py-2 sm:px-4 md:px-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-foreground hover:bg-accent hover:text-foreground"
        >
          <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {showFilters ? "Hide Filters" : "Show Filters"}
          {activeFilterCount > 0 && (
            <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="overflow-visible"
          >
            <div className="px-3 pb-3 sm:px-4 md:px-5">
              <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                  <p className="text-sm font-semibold text-foreground">
                    Filters
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Origin, destination, date, trailer, and rate
                  </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <LocationSuggestInput
                    id="origin"
                    label="Origin"
                    placeholder="City or State"
                    value={filters.origin}
                    options={suggestions}
                    onChange={(value) => handleFilterChange("origin", value)}
                  />

                  <LocationSuggestInput
                    id="destination"
                    label="Destination"
                    placeholder="City or State"
                    value={filters.destination}
                    options={suggestions}
                    onChange={(value) =>
                      handleFilterChange("destination", value)
                    }
                  />

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="pickupDate"
                      className="text-xs sm:text-sm text-foreground"
                    >
                      Pickup Date
                    </Label>
                    <Input
                      id="pickupDate"
                      type="date"
                      value={filters.pickupDate}
                      onChange={(e) =>
                        handleFilterChange("pickupDate", e.target.value)
                      }
                      className="h-9 rounded-md border-border bg-input-background text-sm text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="trailerType"
                      className="text-xs sm:text-sm text-foreground"
                    >
                      Trailer Type
                    </Label>
                    <Select
                      value={filters.trailerType}
                      onValueChange={(value) =>
                        handleFilterChange("trailerType", value)
                      }
                    >
                      <SelectTrigger className="h-9 rounded-md border-border bg-input-background text-sm text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-border bg-popover">
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Dry Van">Dry Van</SelectItem>
                        <SelectItem value="Reefer">Reefer</SelectItem>
                        <SelectItem value="Flatbed">Flatbed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="minRate" className="text-xs sm:text-sm text-foreground">
                      Min Rate ($)
                    </Label>
                    <Input
                      id="minRate"
                      type="number"
                      placeholder="0"
                      value={filters.minRate}
                      onChange={(e) => handleFilterChange("minRate", e.target.value)}
                      className="h-9 rounded-md border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="maxRate" className="text-xs sm:text-sm text-foreground">
                      Max Rate ($)
                    </Label>
                    <Input
                      id="maxRate"
                      type="number"
                      placeholder="10000"
                      value={filters.maxRate}
                      onChange={(e) => handleFilterChange("maxRate", e.target.value)}
                      className="h-9 rounded-md border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="maxDistance"
                      className="text-xs sm:text-sm text-foreground"
                    >
                      Max Distance (mi)
                    </Label>
                    <Input
                      id="maxDistance"
                      type="number"
                      placeholder="1000"
                      value={filters.maxDistance}
                      onChange={(e) =>
                        handleFilterChange("maxDistance", e.target.value)
                      }
                      className="h-9 rounded-md border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="maxWeight"
                      className="text-xs sm:text-sm text-foreground"
                    >
                      Max Weight (lbs)
                    </Label>
                    <Input
                      id="maxWeight"
                      type="number"
                      placeholder="50000"
                      value={filters.maxWeight}
                      onChange={(e) =>
                        handleFilterChange("maxWeight", e.target.value)
                      }
                      className="h-9 rounded-md border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={applyFilters}
                    className="h-9 rounded-md bg-primary text-sm text-primary-foreground hover:bg-primary/90"
                  >
                    Apply Filters
                  </Button>
                  <Button
                    onClick={clearFilters}
                    variant="outline"
                    className="h-9 rounded-md border-border text-sm text-foreground hover:bg-accent"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
