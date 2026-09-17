import React, { useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "../../app/components/ui/button";

function money(value) {
  return Number(value).toLocaleString();
}

function pickupLabel(filters) {
  if (filters.pickupPreset === "today") {
    return "Pickup: Today";
  }

  if (filters.pickupPreset === "tomorrow") {
    return "Pickup: Tomorrow";
  }

  if (filters.pickupPreset === "this-week") {
    return "Pickup: This week";
  }

  if (filters.pickupPreset === "custom" && filters.pickupDate) {
    return `Pickup: ${filters.pickupDate}`;
  }

  return "";
}

function buildChips(filters) {
  const chips = [];

  if (filters.search?.trim()) {
    chips.push({ key: "search", label: `Search: ${filters.search.trim()}` });
  }

  if (filters.origin?.trim()) {
    chips.push({ key: "origin", label: `Origin: ${filters.origin.trim()}` });
  }

  if (filters.destination?.trim()) {
    chips.push({
      key: "destination",
      label: `Destination: ${filters.destination.trim()}`,
    });
  }

  filters.equipment?.forEach((value) => {
    chips.push({ key: "equipment", value, label: `Equipment: ${value}` });
  });

  filters.originState?.forEach((value) => {
    chips.push({ key: "originState", value, label: `Origin: ${value}` });
  });

  filters.destinationState?.forEach((value) => {
    chips.push({
      key: "destinationState",
      value,
      label: `Destination: ${value}`,
    });
  });

  if (filters.minRate || filters.maxRate) {
    chips.push({
      key: "rate",
      label: `Rate: ${
        filters.minRate ? `$${money(filters.minRate)}` : "Any"
      } - ${filters.maxRate ? `$${money(filters.maxRate)}` : "Any"}`,
    });
  }

  if (filters.minDistance || filters.maxDistance) {
    chips.push({
      key: "distance",
      label: `Distance: ${
        filters.minDistance ? `${money(filters.minDistance)} mi` : "Any"
      } - ${filters.maxDistance ? `${money(filters.maxDistance)} mi` : "Any"}`,
    });
  }

  if (filters.status && filters.status !== "all") {
    chips.push({ key: "status", label: `Status: ${filters.status}` });
  }

  if (filters.broker?.trim()) {
    chips.push({ key: "broker", label: `Broker: ${filters.broker.trim()}` });
  }

  const dateLabel = pickupLabel(filters);

  if (dateLabel) {
    chips.push({ key: "pickup", label: dateLabel });
  }

  return chips;
}

export function FilterChips({ filters, onRemove, onClear }) {
  const chips = useMemo(() => buildChips(filters), [filters]);

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t border-border bg-card/80 px-3 py-2 sm:px-4 md:px-5">
      {chips.map((chip) => (
        <span
          key={`${chip.key}-${chip.value || chip.label}`}
          className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground"
        >
          <span className="max-w-[220px] truncate">{chip.label}</span>
          <button
            type="button"
            onClick={() => onRemove(chip.key, chip.value)}
            className="rounded-sm p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={`Remove ${chip.label}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="h-7 rounded-md px-2 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        Clear all
      </Button>
    </div>
  );
}
