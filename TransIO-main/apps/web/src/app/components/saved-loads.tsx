import { Bookmark } from "lucide-react";
import { useAppState } from "../context/app-state";
import { LoadCard } from "./load-card";
import { useState } from "react";
import React from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatLoadLocation } from "../data/loads";

export function SavedLoads() {
  const [expandedLoadId, setExpandedLoadId] = useState<string | null>(null);
  const { savedLoads, searchQuery } = useAppState();

  const visibleLoads = savedLoads.filter((load) =>
    [
      load.id,
      formatLoadLocation(load.origin),
      formatLoadLocation(load.destination),
      load.broker,
      ...load.tags,
    ]
      .join(" ")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-full space-y-6 bg-background p-4 sm:p-6 lg:p-8">
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Saved Loads
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Access your bookmarked loads
        </p>
        <div className="mt-4 inline-flex rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground">
          {visibleLoads.length} saved loads
        </div>
      </div>

      {visibleLoads.length === 0 ? (
        <EmptyState
          title={searchQuery.trim() ? "No saved search results" : "No saved loads"}
          description={
            searchQuery.trim()
              ? "No saved loads match the current search. Try another lane, broker, or load reference."
              : "Click the bookmark icon on any load card to save freight opportunities for later."
          }
          icon={Bookmark}
        />
      ) : (
        <div className="space-y-3">
          {visibleLoads.map((load) => (
            <LoadCard
              key={load.id}
              load={load}
              isExpanded={expandedLoadId === load.id}
              onToggle={() =>
                setExpandedLoadId(expandedLoadId === load.id ? null : load.id)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
