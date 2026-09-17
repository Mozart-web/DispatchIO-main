export const COMMON_LOCATION_OPTIONS = [
  { label: "Los Angeles, CA", value: "Los Angeles", state: "CA", hint: "City" },
  {
    label: "Los Angeles County, CA",
    value: "Los Angeles",
    state: "CA",
    hint: "County",
  },
  {
    label: "Port of Los Angeles, CA",
    value: "Los Angeles",
    state: "CA",
    hint: "Port",
  },
  { label: "Long Beach, CA", value: "Long Beach", state: "CA", hint: "Port" },
  { label: "Ontario, CA", value: "Ontario", state: "CA", hint: "Inland Empire" },
  { label: "Chicago, IL", value: "Chicago", state: "IL", hint: "City" },
  { label: "Dallas, TX", value: "Dallas", state: "TX", hint: "City" },
  { label: "Atlanta, GA", value: "Atlanta", state: "GA", hint: "City" },
  { label: "Houston, TX", value: "Houston", state: "TX", hint: "City" },
  { label: "Phoenix, AZ", value: "Phoenix", state: "AZ", hint: "City" },
];

function stateFromLabel(label) {
  const match = String(label || "").match(/,\s*([A-Z]{2})\b/);
  return match?.[1] || "";
}

function valueFromLabel(label) {
  const [city] = String(label || "").split(",");
  return city.trim() || label;
}

function toLocationOption(option) {
  if (typeof option === "string") {
    const label = option.trim();
    return {
      label,
      value: valueFromLabel(label),
      state: stateFromLabel(label),
      hint: "Available lane",
    };
  }

  return option;
}

export function buildLocationSuggestions(locationOptions = []) {
  const items = new Map();

  [...locationOptions.map(toLocationOption), ...COMMON_LOCATION_OPTIONS].forEach(
    (option) => {
      if (option.label) {
        items.set(option.label.toLowerCase(), option);
      }
    }
  );

  return Array.from(items.values());
}
