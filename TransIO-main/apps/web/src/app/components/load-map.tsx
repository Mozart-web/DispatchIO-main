import React from "react";
import { ExternalLink, MapPinned, Maximize2, Route, X } from "lucide-react";
import { formatLoadLocation, type Load } from "../data/loads";
import { Button } from "./ui/button";

interface LoadMapProps {
  load: Load;
  inline?: boolean;
}

function hasMapLocation(location: Load["origin"]) {
  const city = String(location.city || "").trim();
  const state = String(location.state || "").trim();
  const address = String(location.address || "").trim();

  return Boolean(
    (city && city.toLowerCase() !== "unknown") ||
      state ||
      (address && address.toLowerCase() !== "unknown address")
  );
}

function formatMapLocation(location: Load["origin"]) {
  if (!hasMapLocation(location)) {
    return "-";
  }

  const cityState = formatLoadLocation(location);
  const address =
    location.address && location.address !== "Unknown address"
      ? location.address
      : "";

  if (address && address.toLowerCase() !== cityState.toLowerCase()) {
    return address;
  }

  return cityState;
}

function buildMapsRoute(load: Load) {
  const origin = formatMapLocation(load.origin);
  const destination = formatMapLocation(load.destination);

  return {
    origin,
    destination,
    embedUrl: `https://maps.google.com/maps?f=d&source=s_d&saddr=${encodeURIComponent(
      origin
    )}&daddr=${encodeURIComponent(destination)}&hl=en&z=6&output=embed`,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      origin
    )}&destination=${encodeURIComponent(destination)}&travelmode=driving`,
  };
}

export function LoadMap({ load, inline = false }: LoadMapProps) {
  const [mapOpen, setMapOpen] = React.useState(false);
  const canMap =
    hasMapLocation(load.origin) && hasMapLocation(load.destination);
  const originLabel = formatMapLocation(load.origin);
  const destinationLabel = formatMapLocation(load.destination);
  const route = canMap ? buildMapsRoute(load) : null;
  const distanceLabel =
    load.distance > 0 ? `${load.distance.toLocaleString()} mi` : "-";

  return (
    <>
      <div
        className="overflow-hidden rounded-md border border-border bg-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-2.5 py-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MapPinned className="h-3.5 w-3.5 text-primary" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground">
                Route Map
              </p>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {originLabel} to {destinationLabel} | {distanceLabel}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canMap}
            onClick={() => setMapOpen(true)}
            className="h-7 shrink-0 rounded-md border-border bg-background px-2 text-[11px] text-foreground hover:bg-accent"
          >
            <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
            View Map
          </Button>
        </div>

        {inline && route && (
          <div className="relative aspect-[16/8] min-h-[175px] w-full overflow-hidden bg-muted">
            <iframe
              title={`Route map from ${route.origin} to ${route.destination}`}
              src={route.embedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        )}

        <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
          <div className="min-w-0 px-2.5 py-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Route className="h-3 w-3" />
              Pickup
            </div>
            <p className="mt-1 truncate text-[11px] text-foreground">
              {originLabel}
            </p>
          </div>
          <div className="min-w-0 px-2.5 py-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Route className="h-3 w-3" />
              Delivery
            </div>
            <p className="mt-1 truncate text-[11px] text-foreground">
              {destinationLabel}
            </p>
          </div>
        </div>

        {inline && route && (
          <a
            href={route.directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center border-t border-border px-3 py-2 text-xs font-semibold text-primary hover:bg-accent"
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Open in Google Maps
          </a>
        )}
      </div>

      {mapOpen && route && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-3 backdrop-blur-md sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Full route map"
          onClick={() => setMapOpen(false)}
        >
          <div
            className="flex h-[82vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/50"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Route Map
                </p>
                <h3 className="truncate text-base font-semibold text-foreground">
                  {originLabel} to {destinationLabel}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {distanceLabel} | {load.trailerType}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-md border-border bg-background text-xs text-foreground hover:bg-accent"
                >
                  <a
                    href={route.directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Open in Google Maps
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setMapOpen(false)}
                  className="h-9 w-9 rounded-md hover:bg-accent"
                  aria-label="Close map"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-0 border-b border-border bg-muted/45 sm:grid-cols-2">
              <div className="min-w-0 border-b border-border px-4 py-3 sm:border-b-0 sm:border-r">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  From
                </p>
                <p className="mt-1 truncate text-sm text-foreground">
                  {route.origin}
                </p>
              </div>
              <div className="min-w-0 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  To
                </p>
                <p className="mt-1 truncate text-sm text-foreground">
                  {route.destination}
                </p>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <p className="border-b border-border bg-background px-4 py-2 text-[11px] text-muted-foreground">
                Swipe or drag on the map to explore the route.
              </p>
              <div className="min-h-0 flex-1 touch-pan-x touch-pan-y overscroll-contain">
                <iframe
                  title={`Full route map from ${route.origin} to ${route.destination}`}
                  src={route.embedUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-full w-full touch-pan-x touch-pan-y border-0"
                  style={{ touchAction: "pan-x pan-y" }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
