import { supabase } from "../../lib/supabase";
import { type ApiLoad, type Load, mapApiLoadToLoad } from "../data/loads";
import {
  calculateDeadheadMiles,
  cityStateKey,
  findCityCoordinates,
  matchesCityState,
  parseCityState,
  type CityState,
  type Coordinates,
} from "./origin-radius";

export interface AdminStats {
  totalLoads: number;
  totalUsers: number;
  activeSubscriptions: number;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.API_BASE_URL ||
  "https://transio-t20l.onrender.com";
const LOAD_RETENTION_HOURS = 3;
const RADIUS_CANDIDATE_BATCH_SIZE = 1000;

export type LoadSortOption = "rate-high" | "rate-low" | "distance" | "date";

export interface OriginRadiusFilter {
  location: string;
  radiusMiles: number | null;
  lat: null;
  lng: null;
}

export interface LoadQueryFilters {
  search?: string;
  origin?: string;
  originRadiusFilter?: OriginRadiusFilter;
  destination?: string;
  equipment?: string[];
  originState?: string[];
  destinationState?: string[];
  minRate?: number;
  maxRate?: number;
  minDistance?: number;
  maxDistance?: number;
  minWeight?: number;
  maxWeight?: number;
  status?: string;
  broker?: string;
  pickupDateFrom?: string;
  pickupDateTo?: string;
}

export interface FetchLoadsPageParams {
  filters?: LoadQueryFilters;
  page?: number;
  pageSize?: number;
  sortBy?: LoadSortOption;
}

export interface FetchLoadsPageResult {
  loads: Load[];
  count: number;
  page: number;
  pageSize: number;
}

export interface LoadFilterOptions {
  equipment: string[];
  originStates: string[];
  destinationStates: string[];
  brokers: string[];
  locations: string[];
}

function getLoadExpiryCutoff() {
  return new Date(
    Date.now() - LOAD_RETENTION_HOURS * 60 * 60 * 1000
  ).toISOString();
}

function cleanList(values: string[] | undefined) {
  return Array.from(
    new Set((values || []).map((value) => value.trim()).filter(Boolean))
  );
}

function cleanStateList(values: string[] | undefined) {
  return cleanList(values)
    .map((value) => value.toUpperCase())
    .filter((value) => /^[A-Z]{2}$/.test(value));
}

function sanitizeSearchTerm(value: string | undefined) {
  return String(value || "")
    .trim()
    .replace(/[,%(){}"']/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 90);
}

function sanitizePatternTerm(value: string | undefined) {
  return sanitizeSearchTerm(value).replace(/[%*_]/g, " ").trim();
}

function containsPattern(value: string) {
  return `%${value}%`;
}

function locationPatternClauses(column: "origin" | "destination", value: string) {
  const pattern = containsPattern(value);

  return [
    `${column}->>city.ilike.${pattern}`,
    `${column}->>state.ilike.${pattern}`,
    `${column}->>address.ilike.${pattern}`,
  ].join(",");
}

function parseCityStateLocation(value: string) {
  const text = sanitizePatternTerm(value);
  const cityStateMatch = text.match(/^(.+?)\s+([a-z]{2})$/i);
  const stateOnlyMatch = text.match(/^([a-z]{2})$/i);

  if (cityStateMatch) {
    return {
      city: cityStateMatch[1].trim(),
      state: cityStateMatch[2].toUpperCase(),
    };
  }

  if (stateOnlyMatch) {
    return { city: "", state: stateOnlyMatch[1].toUpperCase() };
  }

  return { city: text, state: "" };
}

function applyLocationFilter(
  query: any,
  column: "origin" | "destination",
  value: string
) {
  const location = parseCityStateLocation(value);

  if (!location.city && !location.state) {
    return query;
  }

  if (location.city) {
    query = query.ilike(`${column}->>city`, containsPattern(location.city));
  }

  if (location.state) {
    query = query.eq(`${column}->>state`, location.state);
  }

  return query;
}

function toNumber(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }

  return value;
}

function cleanOptionText(value: unknown) {
  return String(value ?? "").trim();
}

function addStateOption(target: Set<string>, value: unknown) {
  const state = cleanOptionText(value).toUpperCase();

  if (/^[A-Z]{2}$/.test(state)) {
    target.add(state);
  }
}

function addLocationOption(target: Set<string>, location: ApiLoad["origin"]) {
  const city = cleanOptionText(location?.city);
  const state = cleanOptionText(location?.state).toUpperCase();
  const address = cleanOptionText(location?.address);

  if (city && /^[A-Z]{2}$/.test(state)) {
    target.add(`${city}, ${state}`);
    return;
  }

  if (address) {
    target.add(address);
  }
}

interface OriginRadiusContext {
  origin: CityState;
  coordinates: Coordinates | null;
  radiusMiles: number;
}

function getOriginRadiusContext(
  filters: LoadQueryFilters = {}
): OriginRadiusContext | null {
  const location = filters.originRadiusFilter?.location.trim();
  const radiusMiles = filters.originRadiusFilter?.radiusMiles;

  if (
    !location ||
    typeof radiusMiles !== "number" ||
    !Number.isFinite(radiusMiles) ||
    radiusMiles <= 0
  ) {
    return null;
  }

  const origin = parseCityState(location);

  return origin.city && origin.state
    ? {
        origin,
        coordinates: findCityCoordinates(origin.city, origin.state),
        radiusMiles,
      }
    : null;
}

function applyLoadFilters(
  query: any,
  filters: LoadQueryFilters = {},
  options: { skipOriginConstraints?: boolean } = {}
) {
  const search = sanitizePatternTerm(filters.search);
  const origin = options.skipOriginConstraints
    ? ""
    : filters.originRadiusFilter?.location || sanitizePatternTerm(filters.origin);
  const destination = sanitizePatternTerm(filters.destination);
  const equipment = cleanList(filters.equipment);
  const originState = options.skipOriginConstraints
    ? []
    : cleanStateList(filters.originState);
  const destinationState = cleanStateList(filters.destinationState);
  const minRate = toNumber(filters.minRate);
  const maxRate = toNumber(filters.maxRate);
  const minDistance = toNumber(filters.minDistance);
  const maxDistance = toNumber(filters.maxDistance);
  const minWeight = toNumber(filters.minWeight);
  const maxWeight = toNumber(filters.maxWeight);
  const broker = sanitizePatternTerm(filters.broker);
  const status =
    filters.status && filters.status !== "all" ? filters.status : "";

  if (search) {
    const pattern = containsPattern(search);
    query = query.or(
      [
        `origin->>city.ilike.${pattern}`,
        `origin->>state.ilike.${pattern}`,
        `origin->>address.ilike.${pattern}`,
        `destination->>city.ilike.${pattern}`,
        `destination->>state.ilike.${pattern}`,
        `destination->>address.ilike.${pattern}`,
        `broker.ilike.${pattern}`,
        `contact->>phone.ilike.${pattern}`,
        `trailer_type.ilike.${pattern}`,
      ].join(",")
    );
  }

  if (origin) {
    query = applyLocationFilter(query, "origin", origin);
  }

  if (destination) {
    query = applyLocationFilter(query, "destination", destination);
  }

  if (equipment.length > 0) {
    query = query.in("trailer_type", equipment);
  }

  if (originState.length > 0) {
    query = query.in("origin->>state", originState);
  }

  if (destinationState.length > 0) {
    query = query.in("destination->>state", destinationState);
  }

  if (minRate !== undefined) {
    query = query.gte("rate", minRate);
  }

  if (maxRate !== undefined) {
    query = query.lte("rate", maxRate);
  }

  if (minDistance !== undefined) {
    query = query.gte("distance", minDistance);
  }

  if (maxDistance !== undefined) {
    query = query.lte("distance", maxDistance);
  }

  if (minWeight !== undefined) {
    query = query.gte("weight", minWeight);
  }

  if (maxWeight !== undefined) {
    query = query.lte("weight", maxWeight);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (broker) {
    query = query.ilike("broker", containsPattern(broker));
  }

  if (filters.pickupDateFrom) {
    query = query.gte("pickup_date", filters.pickupDateFrom);
  }

  if (filters.pickupDateTo) {
    query = query.lte("pickup_date", filters.pickupDateTo);
  }

  return query;
}

const missingCityCoordinateWarnings = new Set<string>();

function warnMissingCityCoordinates(origin: Load["origin"]) {
  const key = cityStateKey(origin.city, origin.state);

  if (missingCityCoordinateWarnings.has(key)) {
    return;
  }

  missingCityCoordinateWarnings.add(key);
  console.warn("Missing city coordinates", origin);
}

function matchOriginRadius(load: Load, context: OriginRadiusContext) {
  const loadOrigin = {
    city: load.origin.city,
    state: load.origin.state,
  };

  if (!context.coordinates) {
    return matchesCityState(context.origin, loadOrigin)
      ? { ...load, computedDeadheadMiles: null }
      : null;
  }

  const loadCoordinates = findCityCoordinates(loadOrigin.city, loadOrigin.state);

  if (!loadCoordinates) {
    warnMissingCityCoordinates(load.origin);
    return null;
  }

  const deadheadMiles = calculateDeadheadMiles(
    context.origin,
    loadOrigin,
    context.coordinates,
    loadCoordinates
  );

  if (deadheadMiles === null || deadheadMiles > context.radiusMiles) {
    return null;
  }

  return { ...load, computedDeadheadMiles: Math.round(deadheadMiles) };
}

function applyLoadSort(query: any, sortBy: LoadSortOption) {
  switch (sortBy) {
    case "rate-high":
      return query.order("rate", { ascending: false, nullsFirst: false });
    case "rate-low":
      return query.order("rate", { ascending: true, nullsFirst: false });
    case "distance":
      return query.order("distance", { ascending: true, nullsFirst: false });
    case "date":
    default:
      return query
        .order("pickup_date", { ascending: true, nullsFirst: false })
        .order("received_at", { ascending: false });
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  userId?: string | null
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { "x-user-id": userId } : {}),
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "API request failed");
  }

  return payload as T;
}

export async function fetchLoads(): Promise<Load[]> {
  if (!supabase) {
    throw new Error("Supabase env variables are missing.");
  }

  const { data, error } = await supabase
    .from("loads")
    .select("*")
    .gte("received_at", getLoadExpiryCutoff())
    .order("received_at", { ascending: false });

  if (error) {
    throw new Error("Loads could not be loaded from Supabase");
  }

  return (data as ApiLoad[]).map(mapApiLoadToLoad);
}

export async function fetchLoadByFingerprint(
  fingerprint: string
): Promise<Load | null> {
  if (!supabase) {
    throw new Error("Supabase env variables are missing.");
  }

  const { data, error } = await supabase
    .from("loads")
    .select("*")
    .eq("fingerprint", fingerprint)
    .maybeSingle();

  if (error) {
    throw new Error("Load detail could not be loaded from Supabase");
  }

  return data ? mapApiLoadToLoad(data as ApiLoad) : null;
}

export async function requestPriorityEnrich(
  fingerprint: string
): Promise<Load | null> {
  const safeFingerprint = String(fingerprint || "").trim();

  if (!safeFingerprint) {
    return null;
  }

  const payload = await apiRequest<{ data?: ApiLoad }>(
    `/api/loads/${encodeURIComponent(safeFingerprint)}/priority-enrich`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );

  return payload.data ? mapApiLoadToLoad(payload.data) : null;
}

export async function fetchLoadsPage({
  filters = {},
  page = 1,
  pageSize = 25,
  sortBy = "date",
}: FetchLoadsPageParams = {}): Promise<FetchLoadsPageResult> {
  if (!supabase) {
    throw new Error("Supabase env variables are missing.");
  }

  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;
  const originRadius = getOriginRadiusContext(filters);

  if (originRadius) {
    const matchingLoads: Load[] = [];
    const expiryCutoff = getLoadExpiryCutoff();
    let offset = 0;

    while (true) {
      let radiusQuery = supabase
        .from("loads")
        .select("*")
        .gte("received_at", expiryCutoff);

      radiusQuery = applyLoadFilters(radiusQuery, filters, {
        skipOriginConstraints: true,
      });
      radiusQuery = applyLoadSort(radiusQuery, sortBy);

      const { data, error } = await radiusQuery.range(
        offset,
        offset + RADIUS_CANDIDATE_BATCH_SIZE - 1
      );

      if (error) {
        throw new Error("Loads could not be loaded from Supabase");
      }

      const candidates = (data as ApiLoad[]).map(mapApiLoadToLoad);
      candidates.forEach((load) => {
        const match = matchOriginRadius(load, originRadius);

        if (match) {
          matchingLoads.push(match);
        }
      });

      if (candidates.length < RADIUS_CANDIDATE_BATCH_SIZE) {
        break;
      }

      offset += RADIUS_CANDIDATE_BATCH_SIZE;
    }

    return {
      loads: matchingLoads.slice(from, to + 1),
      count: matchingLoads.length,
      page: safePage,
      pageSize: safePageSize,
    };
  }

  let query = supabase
    .from("loads")
    .select("*", { count: "exact" })
    .gte("received_at", getLoadExpiryCutoff());

  query = applyLoadFilters(query, filters);
  query = applyLoadSort(query, sortBy);

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw new Error("Loads could not be loaded from Supabase");
  }

  return {
    loads: (data as ApiLoad[]).map(mapApiLoadToLoad),
    count: count ?? 0,
    page: safePage,
    pageSize: safePageSize,
  };
}

export async function fetchLoadFilterOptions(): Promise<LoadFilterOptions> {
  if (!supabase) {
    throw new Error("Supabase env variables are missing.");
  }

  const { data, error } = await supabase
    .from("loads")
    .select("origin,destination,trailer_type,broker")
    .gte("received_at", getLoadExpiryCutoff())
    .order("received_at", { ascending: false })
    .limit(1000);

  if (error) {
    throw new Error("Load filter options could not be loaded from Supabase");
  }

  const equipment = new Set<string>();
  const originStates = new Set<string>();
  const destinationStates = new Set<string>();
  const brokers = new Set<string>();
  const locations = new Set<string>();

  (data as ApiLoad[]).forEach((load) => {
    const trailerType = cleanOptionText(load.trailer_type);
    const broker = cleanOptionText(load.broker);

    if (trailerType) {
      equipment.add(trailerType);
    }

    if (broker) {
      brokers.add(broker);
    }

    addStateOption(originStates, load.origin?.state);
    addStateOption(destinationStates, load.destination?.state);
    addLocationOption(locations, load.origin);
    addLocationOption(locations, load.destination);
  });

  return {
    equipment: Array.from(equipment).sort((a, b) => a.localeCompare(b)),
    originStates: Array.from(originStates).sort(),
    destinationStates: Array.from(destinationStates).sort(),
    brokers: Array.from(brokers).sort((a, b) => a.localeCompare(b)),
    locations: Array.from(locations).sort((a, b) => a.localeCompare(b)),
  };
}

export async function fetchAdminStats(userId: string) {
  const payload = await apiRequest<{ data: AdminStats }>("/stats", {}, userId);
  return payload.data;
}

export async function fetchUsers(userId: string) {
  const payload = await apiRequest<{ data: AdminUser[] }>("/users", {}, userId);
  return payload.data;
}
