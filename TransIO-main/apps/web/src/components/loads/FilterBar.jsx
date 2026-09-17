import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, MapPin, Plus, SlidersHorizontal, X } from "lucide-react";
import { Button } from "../../app/components/ui/button";
import { Input } from "../../app/components/ui/input";
import { cn } from "../../app/components/ui/utils";
import { US_CITIES } from "../../app/data/us-cities";
import { buildLocationSuggestions } from "./locationSuggestions";

const EQUIPMENT_OPTIONS = [
  "Dry Van",
  "Reefer",
  "Flatbed",
  "Power Only",
  "Lowboy or RGN",
  "Box Truck",
  "Other",
];

const RADIUS_OPTIONS = [
  { value: "25", label: "25 mi" },
  { value: "50", label: "50 mi" },
  { value: "100", label: "100 mi" },
  { value: "150", label: "150 mi" },
  { value: "200", label: "200 mi" },
  { value: "250", label: "250 mi" },
  { value: "custom", label: "Custom" },
];

const PICKUP_OPTIONS = [
  { value: "", label: "Any pickup date" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "this-week", label: "This week" },
  { value: "custom", label: "Custom date" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All status" },
  { value: "available", label: "Available" },
  { value: "booked", label: "Booked" },
  { value: "expired", label: "Expired" },
];

const LOCAL_CITY_OPTIONS = US_CITIES.map(
  (location) => `${location.city}, ${location.state}`
);

function useDismissableDropdown(open, onClose) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  return ref;
}

function Field({ label, children, className }) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function normalizeLocationSearch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/los\s+anjeles/g, "los angeles")
    .replace(/anjeles/g, "angeles")
    .replace(/[^a-z0-9]+/g, "");
}

function selectedLocationValue(option) {
  return [option.value, option.state].filter(Boolean).join(", ") || option.label;
}

function LocationSuggestionInput({
  value,
  onChange,
  locationOptions = [],
  placeholder = "City or State",
}) {
  const [focused, setFocused] = useState(false);
  const suggestions = useMemo(
    () => buildLocationSuggestions([...LOCAL_CITY_OPTIONS, ...locationOptions]),
    [locationOptions]
  );
  const filteredSuggestions = useMemo(() => {
    const query = normalizeLocationSearch(value);

    if (!focused || !query) {
      return [];
    }

    return suggestions.filter(
      (option) =>
        normalizeLocationSearch(option.label).includes(query) ||
        normalizeLocationSearch(option.value).includes(query)
    );
  }, [focused, suggestions, value]);

  return (
    <div className="relative min-w-0 overflow-visible">
      <Input
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setFocused(false);
          }
        }}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="h-7 rounded border-border bg-background px-2 text-xs"
      />

      {filteredSuggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-[9999] mt-1 max-h-52 overflow-auto rounded-md border border-border bg-popover p-0.5 shadow-2xl">
          {filteredSuggestions.map((option) => (
            <button
              key={option.label}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(selectedLocationValue(option));
                setFocused(false);
              }}
              className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left hover:bg-accent"
            >
              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-foreground">
                  {option.label}
                </span>
                {option.hint && (
                  <span className="block truncate text-[10px] text-muted-foreground">
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

function CustomSelect({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useDismissableDropdown(open, () => setOpen(false));
  const selection =
    options.find((option) => option.value === value)?.label || label;

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-7 w-full items-center justify-between rounded border border-border bg-background px-2 text-left text-xs text-foreground transition hover:bg-accent"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{selection}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-[9999] mt-1 overflow-hidden rounded-md border border-border bg-popover p-0.5 shadow-2xl"
        >
          {options.map((option) => (
            <button
              key={option.value || "any"}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-accent",
                value === option.value && "bg-accent"
              )}
              role="option"
              aria-selected={value === option.value}
            >
              {option.label}
              {value === option.value && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EquipmentDropdown({ values, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useDismissableDropdown(open, () => setOpen(false));
  const selected = new Set(values);
  const label =
    values.length === 0
      ? "Any equipment"
      : values.length === 1
      ? values[0]
      : `${values.length} selected`;

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-7 w-full items-center justify-between rounded border border-border bg-background px-2 text-left text-xs text-foreground transition hover:bg-accent"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-[9999] mt-1 rounded-md border border-border bg-popover p-0.5 shadow-2xl">
          {EQUIPMENT_OPTIONS.map((equipment) => {
            const checked = selected.has(equipment);
            return (
              <button
                key={equipment}
                type="button"
                onClick={() =>
                  onChange(
                    checked
                      ? values.filter((value) => value !== equipment)
                      : [...values, equipment]
                  )
                }
                className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-accent"
              >
                <span
                  className={cn(
                    "flex h-3.5 w-3.5 items-center justify-center rounded border border-border",
                    checked && "border-primary bg-primary text-primary-foreground"
                  )}
                >
                  {checked && <Check className="h-2.5 w-2.5" />}
                </span>
                {equipment}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RangeFields({ minValue, maxValue, onChange, prefix = "", suffix = "" }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <div className="relative">
        {prefix && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          type="number"
          min="0"
          value={minValue}
          onChange={(event) => onChange({ min: event.target.value, max: maxValue })}
          placeholder="Min"
          className={cn("h-7 rounded border-border bg-background px-2 text-xs", prefix && "pl-5")}
        />
      </div>
      <div className="relative">
        <Input
          type="number"
          min="0"
          value={maxValue}
          onChange={(event) => onChange({ min: minValue, max: event.target.value })}
          placeholder="Max"
          className={cn("h-7 rounded border-border bg-background px-2 text-xs", suffix && "pr-7")}
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function summaryChips(filter) {
  if (!filter) {
    return [];
  }

  const chips = [];
  const origin = filter.originRadiusFilter;

  if (origin.location.trim()) {
    chips.push(`Origin: ${origin.location.trim()}`);
    if (origin.radiusMiles) {
      chips.push(`Radius: ${origin.radiusMiles} mi`);
    }
  }
  if (filter.destination.trim()) {
    chips.push(`Destination: ${filter.destination.trim()}`);
  }
  filter.equipment.forEach((equipment) => chips.push(`Equipment: ${equipment}`));
  if (filter.minRate || filter.maxRate) {
    chips.push(
      `Rate: ${filter.minRate ? `$${Number(filter.minRate).toLocaleString()}+` : `up to $${Number(filter.maxRate).toLocaleString()}`}`
    );
  }
  if (filter.minDistance || filter.maxDistance) {
    chips.push(`Trip: ${filter.minDistance || "0"}-${filter.maxDistance || "any"} mi`);
  }
  if (filter.minWeight || filter.maxWeight) {
    chips.push(`Weight: ${filter.minWeight || "0"}-${filter.maxWeight || "any"} lbs`);
  }
  if (filter.broker.trim()) {
    chips.push(`Broker: ${filter.broker.trim()}`);
  }
  if (filter.status !== "all") {
    chips.push(`Status: ${filter.status}`);
  }

  return chips;
}

function tabSummary(tab) {
  const filter = tab.filters;
  const origin = filter.originRadiusFilter.location.trim();
  const destination = filter.destination.trim();

  if (origin || destination) {
    return `${origin || "Any origin"} to ${destination || "Any destination"}`;
  }

  if (filter.search.trim()) {
    return filter.search.trim();
  }

  if (filter.equipment.length > 0) {
    return filter.equipment.join(", ");
  }

  return tab.appliedFilter ? "All loads" : "Not applied";
}

export function FilterBar({
  draftFilter,
  activeFilter,
  filterTabs = [],
  activeFilterTabId,
  isOpen,
  onToggle,
  onChange,
  onApply,
  onReset,
  onAddFilterTab,
  onSelectFilterTab,
  onCloseFilterTab,
  isLoading = false,
  resultCount = 0,
  locationOptions = [],
}) {
  const chips = useMemo(() => summaryChips(activeFilter), [activeFilter]);
  const radiusValue = RADIUS_OPTIONS.some(
    (option) => option.value === String(draftFilter.originRadiusFilter.radiusMiles)
  )
    ? String(draftFilter.originRadiusFilter.radiusMiles)
    : "custom";

  return (
    <section className="shrink-0 overflow-visible border-b border-border bg-card/95 shadow-sm backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-1.5 sm:px-3 md:px-4">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-controls="load-filter-panel"
            className="h-7 rounded border-border bg-background px-2 text-[11px] font-semibold"
          >
            <SlidersHorizontal className="mr-1.5 h-3 w-3" />
            {isOpen ? "Hide Filters" : "Show Filters"}
          </Button>
          {!activeFilter && (
            <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              New Filter
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            onClick={onAddFilterTab}
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <Plus className="mr-1 h-3 w-3" />
            New Filter
          </Button>
          <div className="rounded border border-border bg-background px-2 py-0.5 text-right">
            <p className="text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
              Results
            </p>
            <p className="text-[11px] font-semibold leading-4 text-foreground">
              {!activeFilter ? "-" : isLoading ? "Updating" : resultCount.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {filterTabs.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto border-t border-border px-2.5 py-1 sm:px-3 md:px-4">
          {filterTabs.map((tab) => {
            const selected = tab.id === activeFilterTabId;

            return (
              <div
                key={tab.id}
                className={cn(
                  "flex min-w-[146px] max-w-[230px] items-center rounded border text-left transition",
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:bg-accent"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectFilterTab(tab.id)}
                  className="min-w-0 flex-1 px-2 py-1 text-left"
                >
                  <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    <span
                      className={cn(
                        "h-1 w-1 rounded-full",
                        tab.appliedFilter ? "bg-emerald-500" : "bg-muted-foreground"
                      )}
                    />
                    {tab.label}
                  </span>
                  <span className="block truncate text-[11px] font-medium leading-4 text-foreground">
                    {tabSummary(tab)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onCloseFilterTab(tab.id)}
                  className="mr-0.5 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label={`Close ${tab.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {isOpen && (
        <div id="load-filter-panel" className="overflow-visible border-t border-border px-2.5 py-2 sm:px-3 md:px-4">
          <div className="mb-2">
            <h2 className="text-xs font-semibold text-foreground">Filter Builder</h2>
            <p className="text-[10px] text-muted-foreground">
              Set a lane search, then apply it to load results.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <div className="rounded border border-border bg-background/45 p-2 md:col-span-2 lg:col-span-2">
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">
                Origin Radius
              </p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[minmax(0,1fr)_128px]">
                <LocationSuggestionInput
                  value={draftFilter.originRadiusFilter.location}
                  locationOptions={locationOptions}
                  onChange={(location) =>
                    onChange({
                      originRadiusFilter: {
                        ...draftFilter.originRadiusFilter,
                        location,
                      },
                    })
                  }
                  placeholder="City, ST"
                />
                <div className="space-y-1.5">
                  <CustomSelect
                    label="Radius"
                    value={radiusValue}
                    options={RADIUS_OPTIONS}
                    onChange={(value) =>
                      onChange({
                        originRadiusFilter: {
                          ...draftFilter.originRadiusFilter,
                          radiusMiles: value === "custom" ? null : Number(value),
                        },
                      })
                    }
                  />
                  {radiusValue === "custom" && (
                    <Input
                      type="number"
                      min="1"
                      value={draftFilter.originRadiusFilter.radiusMiles ?? ""}
                      onChange={(event) =>
                        onChange({
                          originRadiusFilter: {
                            ...draftFilter.originRadiusFilter,
                            radiusMiles: event.target.value
                              ? Number(event.target.value)
                              : null,
                          },
                        })
                      }
                      placeholder="Custom miles"
                      className="h-7 rounded border-border bg-background px-2 text-xs"
                    />
                  )}
                </div>
              </div>
              <p className="mt-1 truncate text-[9px] leading-3 text-muted-foreground">
                Deadhead is calculated locally from city/state coordinates.
              </p>
            </div>

            <Field label="Destination">
              <LocationSuggestionInput
                value={draftFilter.destination}
                locationOptions={locationOptions}
                onChange={(destination) => onChange({ destination })}
                placeholder="City, ST"
              />
            </Field>

            <Field label="Equipment">
              <EquipmentDropdown
                values={draftFilter.equipment}
                onChange={(equipment) => onChange({ equipment })}
              />
            </Field>

            <Field label="Rate">
              <RangeFields
                minValue={draftFilter.minRate}
                maxValue={draftFilter.maxRate}
                prefix="$"
                onChange={({ min, max }) => onChange({ minRate: min, maxRate: max })}
              />
            </Field>

            <Field label="Trip Distance">
              <RangeFields
                minValue={draftFilter.minDistance}
                maxValue={draftFilter.maxDistance}
                suffix="mi"
                onChange={({ min, max }) =>
                  onChange({ minDistance: min, maxDistance: max })
                }
              />
            </Field>

            <Field label="Pickup Date">
              <div className="space-y-1.5">
                <CustomSelect
                  label="Any pickup date"
                  value={draftFilter.pickupPreset}
                  options={PICKUP_OPTIONS}
                  onChange={(pickupPreset) =>
                    onChange({
                      pickupPreset,
                      pickupDate: pickupPreset === "custom" ? draftFilter.pickupDate : "",
                    })
                  }
                />
                {draftFilter.pickupPreset === "custom" && (
                  <Input
                    type="date"
                    value={draftFilter.pickupDate}
                    onChange={(event) => onChange({ pickupDate: event.target.value })}
                    className="h-7 rounded border-border bg-background px-2 text-xs"
                  />
                )}
              </div>
            </Field>

            <Field label="Broker">
              <Input
                value={draftFilter.broker}
                onChange={(event) => onChange({ broker: event.target.value })}
                placeholder="Broker name"
                className="h-7 rounded border-border bg-background px-2 text-xs"
              />
            </Field>

            <Field label="Weight">
              <RangeFields
                minValue={draftFilter.minWeight}
                maxValue={draftFilter.maxWeight}
                suffix="lb"
                onChange={({ min, max }) => onChange({ minWeight: min, maxWeight: max })}
              />
            </Field>

            <Field label="Status">
              <CustomSelect
                label="All status"
                value={draftFilter.status}
                options={STATUS_OPTIONS}
                onChange={(status) => onChange({ status })}
              />
            </Field>

            <Field label="Keyword Search" className="md:col-span-2 lg:col-span-2">
              <Input
                value={draftFilter.search}
                onChange={(event) => onChange({ search: event.target.value })}
                placeholder="Reference, broker, phone, lane..."
                className="h-7 rounded border-border bg-background px-2 text-xs"
              />
            </Field>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border pt-2">
            <Button type="button" onClick={onApply} className="h-7 rounded px-3 text-xs font-semibold">
              Apply Filter
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onReset}
              className="h-7 rounded border-border bg-background px-3 text-xs"
            >
              Reset
            </Button>
          </div>
        </div>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 border-t border-border px-2.5 py-1 sm:px-3 md:px-4">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground"
            >
              {chip}
            </span>
          ))}
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="mr-1 h-3 w-3" />
            Clear filter
          </button>
        </div>
      )}
    </section>
  );
}
