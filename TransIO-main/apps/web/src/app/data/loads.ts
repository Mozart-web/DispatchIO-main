export type LoadDetailStatus =
  | "list_only"
  | "pending"
  | "retrying"
  | "enriching"
  | "enriched"
  | "failed";

export interface Load {
  id: string;
  referenceId: string;
  source: string;
  origin: {
    city: string;
    state: string;
    address: string;
    date?: string | null;
    time?: string | null;
  };
  destination: {
    city: string;
    state: string;
    address: string;
    date?: string | null;
    time?: string | null;
  };
  computedDeadheadMiles: number | null;
  distance: number;
  rate: number;
  pickupDate: string;
  pickupTime: string;
  trailerType:
    | "Dry Van"
    | "Reefer"
    | "Flatbed"
    | "Power Only"
    | "Box Truck"
    | "Other";
  weight: number;
  dimensions: string;
  loadType: string;
  length: string;
  capacity: string;
  commodity: string;
  ratePerMile: number;
  broker: string;
  contact: {
    phone: string;
    email: string;
    website: string;
    mcNumber: string;
    companyLocation: string;
    factoringEligible: boolean;
    rating: number | null;
    reviews: string;
    creditScore: string;
    daysToPay: string;
    age: string;
    ratePerMileText: string;
    marketRates: {
      spotRate: number | null;
      spotRateText: string;
      spotRatePerMile: number | null;
      spotRatePerMileText: string;
      spotAverageText: string;
      rangeText: string;
      rangeLowText: string;
      rangeHighText: string;
      rangePerMileLowText: string;
      rangePerMileHighText: string;
      contractUnavailable: boolean;
    };
  };
  notes: string;
  detailStatus: LoadDetailStatus;
  detailFetchedAt: string;
  detailError: string;
  appointmentRequired: boolean;
  pickupDetails: string;
  deliveryDetails: string;
  tags: string[];
  status: "Available" | "Booked" | "Expired";
  receivedAt: string;
}

export interface ApiLoad {
  id: string;
  fingerprint: string;
  external_id: string | null;
  source: string | null;
  origin: {
    city?: string;
    state?: string;
    address?: string;
    date?: string | null;
    time?: string | null;
  } | null;
  destination: {
    city?: string;
    state?: string;
    address?: string;
    date?: string | null;
    time?: string | null;
  } | null;
  distance: number | null;
  rate: number | null;
  pickup_date: string | null;
  pickup_time: string | null;
  trailer_type: string | null;
  weight: number | null;
  dimensions: string | null;
  broker: string | null;
  detail_status?: string | null;
  detail_fetched_at?: string | null;
  detail_error?: string | null;
  broker_name?: string | null;
  broker_phone?: string | null;
  broker_email?: string | null;
  comments?: string | null;
  commodity?: string | null;
  length?: string | null;
  stops?: unknown;
  appointment_required?: boolean | null;
  pickup_details?: string | null;
  delivery_details?: string | null;
  raw_detail?: Record<string, unknown> | null;
  credit_score?: string | null;
  days_to_pay?: string | null;
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    mcNumber?: string;
    companyLocation?: string;
    factoringEligible?: boolean;
    rating?: number | null;
    reviews?: string | number | null;
    creditScore?: string;
    daysToPay?: string;
    age?: string;
    ratePerMile?: number | null;
    ratePerMileText?: string;
    loadType?: string;
    length?: string;
    capacity?: string;
    commodity?: string;
    referenceId?: string;
    marketRates?: {
      spotRate?: number | null;
      spotRateText?: string;
      spotRatePerMile?: number | null;
      spotRatePerMileText?: string;
      spotAverageText?: string;
      rangeText?: string;
      rangeLowText?: string;
      rangeHighText?: string;
      rangePerMileLowText?: string;
      rangePerMileHighText?: string;
      contractUnavailable?: boolean;
    };
  } | null;
  notes: string | null;
  tags: string[] | null;
  status: string | null;
  received_at: string | null;
}

function normalizeTrailerType(
  value: string | null | undefined
): Load["trailerType"] {
  const normalized = cleanText(value).toLowerCase();

  switch (normalized) {
    case "reefer":
    case "refrigerated":
      return "Reefer";
    case "flatbed":
    case "flat bed":
      return "Flatbed";
    case "power only":
    case "power-only":
      return "Power Only";
    case "box truck":
    case "boxtruck":
      return "Box Truck";
    case "other":
      return "Other";
    case "dry van":
    case "van":
    default:
      return "Dry Van";
  }
}

function normalizeStatus(value: string | null | undefined): Load["status"] {
  switch (value?.toLowerCase()) {
    case "booked":
      return "Booked";
    case "expired":
      return "Expired";
    default:
      return "Available";
  }
}

function normalizeDetailStatus(
  value: string | null | undefined
): LoadDetailStatus {
  switch (value?.toLowerCase()) {
    case "pending":
      return "pending";
    case "retrying":
      return "retrying";
    case "enriching":
      return "enriching";
    case "enriched":
      return "enriched";
    case "failed":
      return "failed";
    case "list_only":
    default:
      return "list_only";
  }
}

function isTransientDetailError(value: string | null | undefined) {
  return /row is no longer mounted|detail panel did not render/i.test(
    cleanText(value)
  );
}

function cleanText(value: string | null | undefined) {
  const text = String(value ?? "").trim();

  if (!text || text === "-" || text === "\u2013" || text === "\u2014") {
    return "";
  }

  if (/^(n\/?a|na|null|undefined)$/i.test(text)) {
    return "";
  }

  return text;
}

function cleanAddress(value: string | null | undefined) {
  const text = cleanText(value);

  if (!text || /unknown(?: address)?(?:,\s*n\/?a)?$/i.test(text)) {
    return "";
  }

  return text.replace(/,\s*n\/?a$/i, "").trim();
}

function displayReference(load: ApiLoad) {
  const raw =
    cleanText(load.external_id) || cleanText(load.contact?.referenceId);

  return raw.replace(/^d[a]t-/i, "load-");
}

function normalizeLocation(
  location: ApiLoad["origin"] | ApiLoad["destination"]
) {
  return {
    city: cleanText(location?.city) || "Unknown",
    state: cleanText(location?.state),
    address: cleanAddress(location?.address),
    date: cleanText(location?.date) || null,
    time: cleanText(location?.time) || null,
  };
}

function normalizeMarketRates(contact: ApiLoad["contact"]) {
  const marketRates = contact?.marketRates || {};

  return {
    spotRate:
      typeof marketRates.spotRate === "number" ? marketRates.spotRate : null,
    spotRateText: cleanText(marketRates.spotRateText),
    spotRatePerMile:
      typeof marketRates.spotRatePerMile === "number"
        ? marketRates.spotRatePerMile
        : null,
    spotRatePerMileText: cleanText(marketRates.spotRatePerMileText),
    spotAverageText: cleanText(marketRates.spotAverageText),
    rangeText: cleanText(marketRates.rangeText),
    rangeLowText: cleanText(marketRates.rangeLowText),
    rangeHighText: cleanText(marketRates.rangeHighText),
    rangePerMileLowText: cleanText(marketRates.rangePerMileLowText),
    rangePerMileHighText: cleanText(marketRates.rangePerMileHighText),
    contractUnavailable: Boolean(marketRates.contractUnavailable),
  };
}

export function calculateLoadAge(receivedAt: string | null | undefined) {
  if (!receivedAt) {
    return "";
  }

  const receivedTime = new Date(receivedAt).getTime();

  if (Number.isNaN(receivedTime)) {
    return "";
  }

  const minutes = Math.max(0, Math.floor((Date.now() - receivedTime) / 60000));

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h`;
  }

  return `${Math.floor(hours / 24)}d`;
}

export function formatLoadLocation(location: Load["origin"]) {
  return [cleanText(location.city) || "Unknown", cleanText(location.state)]
    .filter(Boolean)
    .join(", ");
}

export function mapApiLoadToLoad(load: ApiLoad): Load {
  const distance = Number(load.distance || 0);
  const rate = Number(load.rate || 0);
  const receivedAt = load.received_at || new Date().toISOString();
  const detailPhone = cleanText(load.broker_phone);
  const detailEmail = cleanText(load.broker_email);
  const detailLength = cleanText(load.length);
  const detailCommodity = cleanText(load.commodity);
  const detailError = cleanText(load.detail_error);
  const normalizedDetailStatus = normalizeDetailStatus(load.detail_status);
  const detailStatus =
    normalizedDetailStatus === "failed" && isTransientDetailError(detailError)
      ? "pending"
      : normalizedDetailStatus;
  const calculatedRatePerMile = distance > 0 ? rate / distance : 0;
  const ratePerMile =
    typeof load.contact?.ratePerMile === "number"
      ? load.contact.ratePerMile
      : calculatedRatePerMile;

  return {
    id: load.fingerprint || load.id,
    referenceId: displayReference(load),
    source: load.source || "collector",
    origin: normalizeLocation(load.origin),
    destination: normalizeLocation(load.destination),
    computedDeadheadMiles: null,
    distance,
    rate,
    pickupDate: cleanText(load.pickup_date),
    pickupTime: cleanText(load.pickup_time),
    trailerType: normalizeTrailerType(load.trailer_type),
    weight: Number(load.weight || 0),
    dimensions: cleanText(load.dimensions),
    loadType: cleanText(load.contact?.loadType),
    length: detailLength || cleanText(load.contact?.length),
    capacity: cleanText(load.contact?.capacity),
    commodity: detailCommodity || cleanText(load.contact?.commodity),
    ratePerMile,
    broker: cleanText(load.broker_name) || cleanText(load.broker),
    contact: {
      phone: detailPhone || cleanText(load.contact?.phone),
      email: detailEmail || cleanText(load.contact?.email),
      website: cleanText(load.contact?.website),
      mcNumber: cleanText(load.contact?.mcNumber),
      companyLocation: cleanText(load.contact?.companyLocation),
      factoringEligible: Boolean(load.contact?.factoringEligible),
      rating:
        typeof load.contact?.rating === "number" ? load.contact.rating : null,
      reviews: cleanText(String(load.contact?.reviews ?? "")),
      creditScore:
        cleanText(load.contact?.creditScore) || cleanText(load.credit_score),
      daysToPay:
        cleanText(load.contact?.daysToPay) || cleanText(load.days_to_pay),
      age: cleanText(load.contact?.age) || calculateLoadAge(receivedAt),
      ratePerMileText: cleanText(load.contact?.ratePerMileText),
      marketRates: normalizeMarketRates(load.contact),
    },
    notes: cleanText(load.comments) || cleanText(load.notes),
    detailStatus,
    detailFetchedAt: cleanText(load.detail_fetched_at),
    detailError,
    appointmentRequired: Boolean(load.appointment_required),
    pickupDetails: cleanText(load.pickup_details),
    deliveryDetails: cleanText(load.delivery_details),
    tags: Array.isArray(load.tags) ? load.tags : [],
    status: normalizeStatus(load.status),
    receivedAt,
  };
}
