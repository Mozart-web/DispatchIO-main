import { Package, Calendar, MapPin } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { useAppState } from "../context/app-state";
import React from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatLoadLocation } from "../data/loads";

export function MyLoads() {
  const { bookedLoads } = useAppState();

  return (
    <div className="min-h-full space-y-6 bg-background p-4 sm:p-6 lg:p-8">
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          My Loads
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Track and manage your booked loads
        </p>
        <div className="mt-4 inline-flex rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground">
          {bookedLoads.length} booked loads
        </div>
      </div>

      <div className="grid max-w-5xl gap-3">
        {bookedLoads.length === 0 ? (
          <EmptyState
            title="No booked loads"
            description='Click "Book Now" on the Load Board page to add active freight opportunities here.'
            icon={Package}
          />
        ) : (
          bookedLoads.map((load, index) => (
            <Card
              key={load.id}
              className="rounded-lg border border-border bg-card p-4 transition-all hover:border-foreground/25 hover:bg-accent/35 sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="w-full flex-1 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Package className="h-5 w-5 flex-shrink-0 text-primary" />
                    <h3 className="text-base text-foreground sm:text-lg">
                      Load #{load.referenceId}
                    </h3>
                    <Badge
                      className={
                        index === 0
                          ? "rounded-md border-border bg-muted text-foreground"
                          : "rounded-md border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300"
                      }
                    >
                      {index === 0 ? "In Transit" : "Confirmed"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {formatLoadLocation(load.origin)} to{" "}
                      {formatLoadLocation(load.destination)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>
                      Pickup:{" "}
                      {new Date(load.pickupDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <div className="w-full rounded-md border border-border bg-background px-4 py-3 text-left sm:w-auto sm:min-w-[170px] sm:text-right">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    Revenue
                  </p>
                  <div className="text-xl font-bold text-primary sm:text-2xl">
                    ${load.rate.toLocaleString()}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
