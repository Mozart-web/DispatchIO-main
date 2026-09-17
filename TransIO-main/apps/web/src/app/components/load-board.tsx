import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Filter, Radio, RefreshCw, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "react-router";
import { LoadCard } from "./load-card";
import { Button } from "./ui/button";
import { CardSkeleton } from "../../components/ui/CardSkeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { FilterBar } from "../../components/loads/FilterBar.jsx";
import { useAppState } from "../context/app-state";
import {
  fetchLoadByFingerprint,
  fetchLoadFilterOptions,
  fetchLoadsPage,
  requestPriorityEnrich,
  type LoadQueryFilters,
  type LoadSortOption,
  type OriginRadiusFilter,
} from "../lib/api";
import { mapApiLoadToLoad, type ApiLoad, type Load } from "../data/loads";
import { supabase } from "../../lib/supabase";

const PAGE_SIZE = 150;
const QUERY_FILTER_KEYS = [
  "filter",
  "q",
  "origin",
  "radius",
  "destination",
  "equipment",
  "minRate",
  "maxRate",
  "minDistance",
  "maxDistance",
  "minWeight",
  "maxWeight",
  "status",
  "broker",
  "pickup",
  "pickupDate",
];

type StatusFilter = "all" | "available" | "booked" | "expired";
type PickupPreset = "" | "today" | "tomorrow" | "this-week" | "custom";

interface LoadBoardFilters {
  search: string;
  originRadiusFilter: OriginRadiusFilter;
  destination: string;
  equipment: string[];
  minRate: string;
  maxRate: string;
  minDistance: string;
  maxDistance: string;
  minWeight: string;
  maxWeight: string;
  status: StatusFilter;
  broker: string;
  pickupPreset: PickupPreset;
  pickupDate: string;
}

interface LoadFilterTab {
  id: string;
  label: string;
  filters: LoadBoardFilters;
  appliedFilter: LoadBoardFilters | null;
}

function createDefaultFilters(): LoadBoardFilters {
  return {
    search: "",
    originRadiusFilter: {
      location: "",
      radiusMiles: 100,
      lat: null,
      lng: null,
    },
    destination: "",
    equipment: [],
    minRate: "",
    maxRate: "",
    minDistance: "",
    maxDistance: "",
    minWeight: "",
    maxWeight: "",
    status: "all",
    broker: "",
    pickupPreset: "",
    pickupDate: "",
  };
}

function splitParam(value: string | null) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseStatus(value: string | null): StatusFilter {
  if (value === "available" || value === "booked" || value === "expired") {
    return value;
  }
  return "all";
}

function parsePickupPreset(value: string | null): PickupPreset {
  if (
    value === "today" ||
    value === "tomorrow" ||
    value === "this-week" ||
    value === "custom"
  ) {
    return value;
  }
  return "";
}

function cleanNumericInput(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  const number = Number(text);
  return Number.isFinite(number) && number >= 0 ? text : "";
}

function parseRadius(value: string | null) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 100;
}

function parseLoadFilters(
  params: URLSearchParams,
  fallbackSearch = ""
): LoadBoardFilters {
  return {
    ...createDefaultFilters(),
    search: params.get("q") || fallbackSearch,
    originRadiusFilter: {
      location: params.get("origin") || "",
      radiusMiles: parseRadius(params.get("radius")),
      lat: null,
      lng: null,
    },
    destination: params.get("destination") || "",
    equipment: splitParam(params.get("equipment")).filter(
      (item) => item.length <= 40
    ),
    minRate: params.get("minRate") || "",
    maxRate: params.get("maxRate") || "",
    minDistance: params.get("minDistance") || "",
    maxDistance: params.get("maxDistance") || "",
    minWeight: params.get("minWeight") || "",
    maxWeight: params.get("maxWeight") || "",
    status: parseStatus(params.get("status")),
    broker: params.get("broker") || "",
    pickupPreset: parsePickupPreset(params.get("pickup")),
    pickupDate: params.get("pickupDate") || "",
  };
}

function sanitizeFilters(filters: LoadBoardFilters): LoadBoardFilters {
  const radiusMiles = Number(filters.originRadiusFilter.radiusMiles);
  return {
    ...createDefaultFilters(),
    ...filters,
    search: String(filters.search || "").slice(0, 90),
    originRadiusFilter: {
      location: String(filters.originRadiusFilter?.location || "").slice(0, 90),
      radiusMiles:
        Number.isFinite(radiusMiles) && radiusMiles > 0 ? radiusMiles : null,
      lat: null,
      lng: null,
    },
    destination: String(filters.destination || "").slice(0, 90),
    equipment: Array.from(new Set(filters.equipment || []))
      .map((item) => String(item || "").trim())
      .filter((item) => item && item.length <= 40),
    minRate: cleanNumericInput(filters.minRate),
    maxRate: cleanNumericInput(filters.maxRate),
    minDistance: cleanNumericInput(filters.minDistance),
    maxDistance: cleanNumericInput(filters.maxDistance),
    minWeight: cleanNumericInput(filters.minWeight),
    maxWeight: cleanNumericInput(filters.maxWeight),
    status: parseStatus(filters.status),
    broker: String(filters.broker || "").slice(0, 90),
    pickupPreset: parsePickupPreset(filters.pickupPreset),
    pickupDate:
      filters.pickupPreset === "custom" ? String(filters.pickupDate || "") : "",
  };
}

function createFilterTab(
  index: number,
  filters = createDefaultFilters(),
  applied = false
): LoadFilterTab {
  return {
    id: `filter-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
    label: `Filter ${index}`,
    filters: sanitizeFilters(filters),
    appliedFilter: applied ? sanitizeFilters(filters) : null,
  };
}

function hasUrlFilter(params: URLSearchParams) {
  return QUERY_FILTER_KEYS.some((key) => params.has(key));
}

function buildSearchParams(filters: LoadBoardFilters) {
  const params = new URLSearchParams();
  params.set("filter", "1");
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.originRadiusFilter.location.trim()) {
    params.set("origin", filters.originRadiusFilter.location.trim());
    if (filters.originRadiusFilter.radiusMiles) {
      params.set("radius", String(filters.originRadiusFilter.radiusMiles));
    }
  }
  if (filters.destination.trim()) {
    params.set("destination", filters.destination.trim());
  }
  if (filters.equipment.length > 0) {
    params.set("equipment", filters.equipment.join(","));
  }
  if (filters.minRate) params.set("minRate", filters.minRate);
  if (filters.maxRate) params.set("maxRate", filters.maxRate);
  if (filters.minDistance) params.set("minDistance", filters.minDistance);
  if (filters.maxDistance) params.set("maxDistance", filters.maxDistance);
  if (filters.minWeight) params.set("minWeight", filters.minWeight);
  if (filters.maxWeight) params.set("maxWeight", filters.maxWeight);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.broker.trim()) params.set("broker", filters.broker.trim());
  if (filters.pickupPreset) params.set("pickup", filters.pickupPreset);
  if (filters.pickupPreset === "custom" && filters.pickupDate) {
    params.set("pickupDate", filters.pickupDate);
  }
  return params;
}

function toLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function pickupRange(filters: LoadBoardFilters) {
  const today = new Date();
  if (filters.pickupPreset === "today") {
    const date = toLocalDate(today);
    return { from: date, to: date };
  }
  if (filters.pickupPreset === "tomorrow") {
    const date = toLocalDate(addDays(today, 1));
    return { from: date, to: date };
  }
  if (filters.pickupPreset === "this-week") {
    const daysUntilSunday = (7 - today.getDay()) % 7;
    return {
      from: toLocalDate(today),
      to: toLocalDate(addDays(today, daysUntilSunday)),
    };
  }
  if (filters.pickupPreset === "custom" && filters.pickupDate) {
    return { from: filters.pickupDate, to: filters.pickupDate };
  }
  return { from: undefined, to: undefined };
}

function numberFilter(value: string) {
  if (!value) {
    return undefined;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function mergeUpdatedLoad(current: Load[], updatedLoad: Load) {
  let didUpdate = false;
  const nextLoads = current.map((load) => {
    if (load.id !== updatedLoad.id) {
      return load;
    }

    didUpdate = true;
    return {
      ...updatedLoad,
      computedDeadheadMiles: load.computedDeadheadMiles,
    };
  });

  return didUpdate ? nextLoads : current;
}

function shouldPollDetail(load: Load | null | undefined) {
  return (
    load?.detailStatus === "list_only" ||
    load?.detailStatus === "pending" ||
    load?.detailStatus === "retrying" ||
    load?.detailStatus === "enriching"
  );
}

function appendUniqueLoads(current: Load[], nextLoads: Load[]) {
  const existing = new Set(current.map((load) => load.id));

  return [
    ...current,
    ...nextLoads.filter((load) => !existing.has(load.id)),
  ];
}

function shouldApplyRealtimeUpdate(load: Load) {
  return load.detailStatus === "enriched" || load.detailStatus === "failed";
}

function notifyExtensionPriorityEnrich(fingerprint: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.postMessage(
    {
      source: "transio-web",
      type: "TRANSIO_PRIORITY_ENRICH",
      fingerprint,
    },
    window.location.origin
  );
}

export function LoadBoard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { searchQuery, setSearchQuery } = useAppState();
  const initialFilterRef = useRef(
    sanitizeFilters(parseLoadFilters(searchParams, searchQuery))
  );
  const initiallyAppliedRef = useRef(hasUrlFilter(searchParams));
  const initialSearchSyncRef = useRef(initialFilterRef.current.search);
  const [draftFilter, setDraftFilter] = useState<LoadBoardFilters>(
    initialFilterRef.current
  );
  const [activeFilter, setActiveFilter] = useState<LoadBoardFilters | null>(
    initiallyAppliedRef.current ? initialFilterRef.current : null
  );
  const [filterTabs, setFilterTabs] = useState<LoadFilterTab[]>(() =>
    initiallyAppliedRef.current
      ? [
          {
            ...createFilterTab(1, initialFilterRef.current, true),
            id: "filter-1",
          },
        ]
      : []
  );
  const [activeFilterTabId, setActiveFilterTabId] = useState<string | null>(
    initiallyAppliedRef.current ? "filter-1" : null
  );
  const tabCounterRef = useRef(initiallyAppliedRef.current ? 1 : 0);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLoadId, setExpandedLoadId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<LoadSortOption>("date");
  const [loads, setLoads] = useState<Load[]>([]);
  const [totalLoads, setTotalLoads] = useState(0);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isBoardLoading, setIsBoardLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [boardError, setBoardError] = useState("");
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const requestIdRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreTargetRef = useRef<HTMLDivElement | null>(null);
  const expandedLoad = useMemo(
    () => loads.find((load) => load.id === expandedLoadId) || null,
    [expandedLoadId, loads]
  );
  const expandedDetailStatus = expandedLoad?.detailStatus || "";
  const shouldPollExpandedDetail = shouldPollDetail(expandedLoad);

  useEffect(() => {
    if (!initialSearchSyncRef.current) {
      return;
    }
    setSearchQuery(initialSearchSyncRef.current);
    initialSearchSyncRef.current = "";
  }, [setSearchQuery]);

  useEffect(() => {
    setDraftFilter((current) => {
      if (current.search === searchQuery) {
        return current;
      }
      return { ...current, search: searchQuery };
    });
  }, [searchQuery]);

  useEffect(() => {
    if (!showFilters) {
      return undefined;
    }

    let cancelled = false;
    void fetchLoadFilterOptions()
      .then((options) => {
        if (!cancelled) {
          setLocationOptions(options.locations);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLocationOptions([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [showFilters]);

  const queryFilters = useMemo<LoadQueryFilters | null>(() => {
    if (!activeFilter) {
      return null;
    }
    const range = pickupRange(activeFilter);
    return {
      search: activeFilter.search,
      originRadiusFilter: activeFilter.originRadiusFilter,
      destination: activeFilter.destination,
      equipment: activeFilter.equipment,
      minRate: numberFilter(activeFilter.minRate),
      maxRate: numberFilter(activeFilter.maxRate),
      minDistance: numberFilter(activeFilter.minDistance),
      maxDistance: numberFilter(activeFilter.maxDistance),
      minWeight: numberFilter(activeFilter.minWeight),
      maxWeight: numberFilter(activeFilter.maxWeight),
      status: activeFilter.status,
      broker: activeFilter.broker,
      pickupDateFrom: range.from,
      pickupDateTo: range.to,
    };
  }, [activeFilter]);

  const loadBoardPage = useCallback(
    async (page: number, mode: "reset" | "append") => {
      if (!activeFilter || !queryFilters) {
        return;
      }
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      try {
        mode === "reset" ? setIsBoardLoading(true) : setIsLoadingMore(true);
        setBoardError("");
        const result = await fetchLoadsPage({
          filters: queryFilters,
          page,
          pageSize: PAGE_SIZE,
          sortBy,
        });
        if (requestId !== requestIdRef.current) {
          return;
        }
        setLoads((current) => {
          if (mode === "reset") {
            return result.loads;
          }
          return appendUniqueLoads(current, result.loads);
        });
        setTotalLoads(result.count);
        setHasMore(page * PAGE_SIZE < result.count && result.loads.length > 0);
        setNextPage(page + 1);
      } catch (error) {
        if (requestId === requestIdRef.current) {
          setBoardError(
            error instanceof Error ? error.message : "Loads could not be loaded from Supabase"
          );
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsBoardLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [activeFilter, queryFilters, sortBy]
  );

  useEffect(() => {
    requestIdRef.current += 1;
    setLoads([]);
    setTotalLoads(0);
    setHasMore(false);
    setNextPage(1);
    setExpandedLoadId(null);
    if (!activeFilter) {
      setIsBoardLoading(false);
      setIsLoadingMore(false);
      setBoardError("");
      return;
    }
    void loadBoardPage(1, "reset");
  }, [activeFilter, loadBoardPage]);

  const loadMore = useCallback(() => {
    if (!activeFilter || !hasMore || isBoardLoading || isLoadingMore) {
      return;
    }
    void loadBoardPage(nextPage, "append");
  }, [activeFilter, hasMore, isBoardLoading, isLoadingMore, loadBoardPage, nextPage]);

  useEffect(() => {
    const root = scrollContainerRef.current;
    const target = loadMoreTargetRef.current;
    if (!root || !target || !activeFilter) {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { root, rootMargin: "220px", threshold: 0.01 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [activeFilter, loadMore]);

  useEffect(() => {
    if (!supabase || !activeFilter) {
      return undefined;
    }

    const channel = supabase
      .channel("load-board-detail-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "loads" },
        (payload) => {
          const updatedLoad = mapApiLoadToLoad(payload.new as ApiLoad);

          if (shouldApplyRealtimeUpdate(updatedLoad)) {
            setLoads((current) => mergeUpdatedLoad(current, updatedLoad));
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeFilter]);

  useEffect(() => {
    if (!expandedLoadId || !shouldPollExpandedDetail) {
      return undefined;
    }

    let cancelled = false;

    const refreshExpandedLoad = async () => {
      try {
        const updatedLoad = await fetchLoadByFingerprint(expandedLoadId);

        if (!cancelled && updatedLoad) {
          setLoads((current) => mergeUpdatedLoad(current, updatedLoad));
        }
      } catch (error) {
        console.warn("Expanded load detail refresh failed", error);
      }
    };

    void refreshExpandedLoad();
    const intervalId = window.setInterval(refreshExpandedLoad, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [expandedLoadId, expandedDetailStatus, shouldPollExpandedDetail]);

  const updateDraft = useCallback(
    (patch: Partial<LoadBoardFilters>) => {
      const next = sanitizeFilters({ ...draftFilter, ...patch });

      if (Object.prototype.hasOwnProperty.call(patch, "search")) {
        setSearchQuery(next.search);
      }
      setDraftFilter(next);

      if (activeFilterTabId) {
        setFilterTabs((current) =>
          current.map((tab) =>
            tab.id === activeFilterTabId ? { ...tab, filters: next } : tab
          )
        );
      }
    },
    [activeFilterTabId, draftFilter, setSearchQuery]
  );

  const applyFilter = useCallback(() => {
    const applied = sanitizeFilters(draftFilter);

    if (activeFilterTabId) {
      setFilterTabs((current) =>
        current.map((tab) =>
          tab.id === activeFilterTabId
            ? { ...tab, filters: applied, appliedFilter: applied }
            : tab
        )
      );
    } else {
      tabCounterRef.current += 1;
      const newTab = createFilterTab(tabCounterRef.current, applied, true);
      setFilterTabs((current) => [...current, newTab]);
      setActiveFilterTabId(newTab.id);
    }

    setActiveFilter(applied);
    setSearchParams(buildSearchParams(applied), { replace: true });
    setShowFilters(false);
  }, [activeFilterTabId, draftFilter, setSearchParams]);

  const resetFilter = useCallback(() => {
    const emptyFilter = createDefaultFilters();
    requestIdRef.current += 1;
    setDraftFilter(emptyFilter);
    setActiveFilter(null);
    setFilterTabs((current) =>
      current.map((tab) =>
        tab.id === activeFilterTabId
          ? { ...tab, filters: emptyFilter, appliedFilter: null }
          : tab
      )
    );
    setLoads([]);
    setTotalLoads(0);
    setHasMore(false);
    setNextPage(1);
    setBoardError("");
    setExpandedLoadId(null);
    setSearchQuery("");
    setSearchParams(new URLSearchParams(), { replace: true });
    setShowFilters(true);
  }, [activeFilterTabId, setSearchParams, setSearchQuery]);

  const addFilterTab = useCallback(() => {
    const emptyFilter = createDefaultFilters();
    tabCounterRef.current += 1;
    const nextTab = createFilterTab(tabCounterRef.current, emptyFilter);

    setFilterTabs((current) => [...current, nextTab]);
    setActiveFilterTabId(nextTab.id);
    setDraftFilter(emptyFilter);
    setActiveFilter(null);
    setSearchQuery("");
    setSearchParams(new URLSearchParams(), { replace: true });
    setShowFilters(true);
  }, [setSearchParams, setSearchQuery]);

  const selectFilterTab = useCallback(
    (tabId: string) => {
      const tab = filterTabs.find((item) => item.id === tabId);

      if (!tab) {
        return;
      }

      setActiveFilterTabId(tab.id);
      setDraftFilter(tab.filters);
      setActiveFilter(tab.appliedFilter);
      setSearchQuery(tab.filters.search);
      setSearchParams(
        tab.appliedFilter
          ? buildSearchParams(tab.appliedFilter)
          : new URLSearchParams(),
        { replace: true }
      );
    },
    [filterTabs, setSearchParams, setSearchQuery]
  );

  const closeFilterTab = useCallback(
    (tabId: string) => {
      const index = filterTabs.findIndex((tab) => tab.id === tabId);

      if (index < 0) {
        return;
      }

      const nextTabs = filterTabs.filter((tab) => tab.id !== tabId);
      setFilterTabs(nextTabs);

      if (tabId !== activeFilterTabId) {
        return;
      }

      const nextActive =
        nextTabs[Math.min(index, nextTabs.length - 1)] || null;
      const nextFilters = nextActive?.filters || createDefaultFilters();

      setActiveFilterTabId(nextActive?.id || null);
      setDraftFilter(nextFilters);
      setActiveFilter(nextActive?.appliedFilter || null);
      setSearchQuery(nextFilters.search);
      setSearchParams(
        nextActive?.appliedFilter
          ? buildSearchParams(nextActive.appliedFilter)
          : new URLSearchParams(),
        { replace: true }
      );
    },
    [activeFilterTabId, filterTabs, setSearchParams, setSearchQuery]
  );

  const handleRefresh = useCallback(() => {
    if (activeFilter) {
      void loadBoardPage(1, "reset");
    }
  }, [activeFilter, loadBoardPage]);

  const prioritizeOpenedLoad = useCallback((loadId: string) => {
    notifyExtensionPriorityEnrich(loadId);

    void requestPriorityEnrich(loadId)
      .then((updatedLoad) => {
        if (updatedLoad) {
          setLoads((current) => mergeUpdatedLoad(current, updatedLoad));
        }
      })
      .catch((error) => {
        console.warn("Priority detail enrichment request failed", error);
      });
  }, []);

  const handleToggleLoad = useCallback((loadId: string) => {
    setExpandedLoadId((current) => {
      const nextLoadId = current === loadId ? null : loadId;

      if (nextLoadId) {
        prioritizeOpenedLoad(nextLoadId);
      }

      return nextLoadId;
    });
  }, [prioritizeOpenedLoad]);

  const emptyTitle = activeFilter ? "No matching loads" : "Create a filter to start viewing loads";
  const emptyDescription = activeFilter
    ? "No freight loads match this filter. Adjust the lane, radius, equipment, or rate and apply again."
    : "Choose an origin radius and any additional criteria, then apply your filter to view available loads.";

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="shrink-0 border-b border-border bg-card/95 px-3 py-2 backdrop-blur-xl sm:px-4 md:px-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <div>
              <h1 className="text-base font-semibold text-foreground sm:text-lg">Load Board</h1>
              <p className="text-[11px] text-muted-foreground">
                Build a lane filter before viewing available freight
              </p>
            </div>
            <div className="rounded border border-border bg-background px-2 py-1">
              <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                <Radio className="h-3 w-3 text-emerald-600 dark:text-emerald-300" />
                {activeFilter ? "Active Filter" : "Filter Required"}
              </div>
              <p className="text-xs font-semibold text-foreground">
                {activeFilter ? `${totalLoads.toLocaleString()} matches` : "New Filter"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={!activeFilter}
              className="h-7 rounded border-border bg-background px-2 text-[11px] text-foreground"
            >
              <RefreshCw className={cnRefresh(isBoardLoading)} />
              {isBoardLoading ? "Refreshing..." : "Refresh Loads"}
            </Button>
            <label className="flex h-7 items-center rounded border border-border bg-background px-2 text-[11px] text-foreground">
              <span className="mr-2 text-muted-foreground">Sort</span>
              <select
                value={sortBy}
                disabled={!activeFilter}
                onChange={(event) => setSortBy(event.target.value as LoadSortOption)}
                className="bg-transparent outline-none disabled:opacity-50"
              >
                <option value="date">Pickup Date</option>
                <option value="rate-high">Rate: High to Low</option>
                <option value="rate-low">Rate: Low to High</option>
                <option value="distance">Distance</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <FilterBar
        draftFilter={draftFilter}
        activeFilter={activeFilter}
        filterTabs={filterTabs}
        activeFilterTabId={activeFilterTabId}
        isOpen={showFilters}
        onToggle={() => setShowFilters((current) => !current)}
        onChange={updateDraft}
        onApply={applyFilter}
        onReset={resetFilter}
        onAddFilterTab={addFilterTab}
        onSelectFilterTab={selectFilterTab}
        onCloseFilterTab={closeFilterTab}
        isLoading={isBoardLoading}
        resultCount={totalLoads}
        locationOptions={locationOptions}
      />

      <div ref={scrollContainerRef} className="flex-1 overflow-auto bg-background p-2 sm:p-2.5 md:p-3">
        <motion.div className="mx-auto max-w-7xl space-y-1.5">
          {boardError && activeFilter && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-center">
              <p className="text-sm text-destructive">{boardError}</p>
            </div>
          )}

          {!activeFilter ? (
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
              actionLabel="New Filter"
              onAction={addFilterTab}
              icon={SlidersHorizontal}
            />
          ) : isBoardLoading && loads.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <CardSkeleton key={index} rows={2} />
              ))}
            </div>
          ) : loads.length === 0 ? (
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
              actionLabel="Show Filters"
              onAction={() => setShowFilters(true)}
              icon={Filter}
            />
          ) : (
            <>
              <div className="sticky top-0 z-30 hidden rounded-lg border border-white/10 bg-background/55 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground shadow-[0_8px_28px_rgba(0,0,0,0.28)] ring-1 ring-white/5 backdrop-blur-xl backdrop-saturate-150 lg:grid lg:grid-cols-[126px_minmax(180px,1fr)_108px_96px_128px]">
                <span>Reference</span>
                <span>Lane / Broker</span>
                <span>Pickup</span>
                <span className="text-right">Rate</span>
                <span className="text-right">Action</span>
              </div>
              <div className={isBoardLoading ? "opacity-70" : ""}>
                {loads.map((load) => (
                  <LoadCard
                    key={load.id}
                    load={load}
                    isExpanded={expandedLoadId === load.id}
                    onToggle={() => handleToggleLoad(load.id)}
                  />
                ))}
              </div>
              <div
                ref={loadMoreTargetRef}
                className="flex min-h-10 items-center justify-center rounded-md border border-border bg-card px-2.5 py-2 text-xs text-muted-foreground"
              >
                {isLoadingMore
                  ? "Loading more loads..."
                  : hasMore
                  ? `Showing ${loads.length.toLocaleString()} of ${totalLoads.toLocaleString()}`
                  : `All ${totalLoads.toLocaleString()} matching loads loaded`}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function cnRefresh(isLoading: boolean) {
  return `mr-1.5 h-3 w-3 ${isLoading ? "animate-spin" : ""}`;
}
