import React from "react";
import { CalendarDays } from "lucide-react";
import { Input } from "../../app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../app/components/ui/select";

export function DateFilter({ preset = "", date = "", onChange }) {
  const selectValue = preset || "all";

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Select
        value={selectValue}
        onValueChange={(value) => {
          const nextPreset = value === "all" ? "" : value;
          onChange({
            pickupPreset: nextPreset,
            pickupDate: nextPreset === "custom" ? date : "",
          });
        }}
      >
        <SelectTrigger className="h-9 min-w-[148px] rounded-md border-border bg-background text-xs text-foreground">
          <CalendarDays className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
          <SelectValue placeholder="Pickup" />
        </SelectTrigger>
        <SelectContent className="border-border bg-popover">
          <SelectItem value="all">Pickup: Any</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="tomorrow">Tomorrow</SelectItem>
          <SelectItem value="this-week">This week</SelectItem>
          <SelectItem value="custom">Custom date</SelectItem>
        </SelectContent>
      </Select>

      {selectValue === "custom" && (
        <Input
          type="date"
          value={date}
          onChange={(event) =>
            onChange({ pickupPreset: "custom", pickupDate: event.target.value })
          }
          className="h-9 w-[145px] rounded-md border-border bg-background text-xs text-foreground"
        />
      )}
    </div>
  );
}
