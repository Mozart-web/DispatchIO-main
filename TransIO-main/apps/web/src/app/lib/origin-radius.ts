import { US_CITIES, type UsCityCoordinate } from "../data/us-cities";

export interface CityState {
  city: string;
  state: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

const STATE_ABBREVIATIONS: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
};

function normalizeState(value: string) {
  const state = String(value || "").trim();

  if (/^[a-z]{2}$/i.test(state)) {
    return state.toUpperCase();
  }

  return STATE_ABBREVIATIONS[state.toLowerCase()] || "";
}

export function normalizeCity(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bsaint\b/g, "st")
    .replace(/\bmount\b/g, "mt")
    .replace(/[.'-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseCityState(value: string): CityState {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  const commaParts = text.split(",").map((part) => part.trim()).filter(Boolean);

  if (commaParts.length >= 2) {
    return {
      city: commaParts.slice(0, -1).join(", "),
      state: normalizeState(commaParts[commaParts.length - 1]),
    };
  }

  const abbreviationMatch = text.match(/^(.+?)\s+([a-z]{2})$/i);
  if (abbreviationMatch) {
    return {
      city: abbreviationMatch[1].trim(),
      state: normalizeState(abbreviationMatch[2]),
    };
  }

  return { city: text, state: "" };
}

export function cityStateKey(city: string, state: string) {
  return `${normalizeCity(city)}|${normalizeState(state)}`;
}

const CITY_COORDINATE_INDEX = new Map<string, UsCityCoordinate>();

US_CITIES.forEach((location) => {
  CITY_COORDINATE_INDEX.set(cityStateKey(location.city, location.state), location);
  (location.aliases || []).forEach((alias) => {
    CITY_COORDINATE_INDEX.set(cityStateKey(alias, location.state), location);
  });
});

export function findCityCoordinates(city: string, state: string): Coordinates | null {
  const location = CITY_COORDINATE_INDEX.get(cityStateKey(city, state));

  return location ? { lat: location.lat, lng: location.lng } : null;
}

export function distanceMiles(from: Coordinates, to: Coordinates) {
  const earthRadiusMiles = 3958.8;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const latitudeA = toRadians(from.lat);
  const latitudeB = toRadians(to.lat);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(haversine));
}

export function matchesCityState(left: CityState, right: CityState) {
  return cityStateKey(left.city, left.state) === cityStateKey(right.city, right.state);
}

const DEADHEAD_DISTANCE_CACHE = new Map<string, number | null>();

export function calculateDeadheadMiles(
  userOrigin: CityState,
  loadOrigin: CityState,
  userCoordinates = findCityCoordinates(userOrigin.city, userOrigin.state),
  loadCoordinates = findCityCoordinates(loadOrigin.city, loadOrigin.state)
): number | null {
  const cacheKey = `${cityStateKey(userOrigin.city, userOrigin.state)}>${cityStateKey(
    loadOrigin.city,
    loadOrigin.state
  )}`;

  if (DEADHEAD_DISTANCE_CACHE.has(cacheKey)) {
    return DEADHEAD_DISTANCE_CACHE.get(cacheKey) ?? null;
  }

  const miles =
    userCoordinates && loadCoordinates
      ? distanceMiles(userCoordinates, loadCoordinates)
      : null;

  if (DEADHEAD_DISTANCE_CACHE.size > 10000) {
    DEADHEAD_DISTANCE_CACHE.clear();
  }
  DEADHEAD_DISTANCE_CACHE.set(cacheKey, miles);
  return miles;
}
