const TEST_MODE = false;
const API_BASE_URL = "https://transio-t20l.onrender.com";
const INGEST_ENDPOINT = `${API_BASE_URL}/ingest`;
const ENRICH_ENDPOINT_BASE = `${API_BASE_URL}/api/loads`;
const SCRAPE_INTERVAL_MS = 30000;
const ROW_MUTATION_DEBOUNCE_MS = 750;
const DETAIL_WAIT_TIMEOUT_MS = 2500;
const DETAIL_WAIT_STEP_MS = 80;
const ROW_WAIT_STEP_MS = 2000;
const ROW_WAIT_TIMEOUT_MS = 30000;
const MAX_SEEN_FINGERPRINTS = 5000;
const SEND_BATCH_SIZE = 10;
const MAX_SEND_RETRIES = 3;
const DETAIL_QUEUE_CONCURRENCY = 5;
const MAX_PRIORITY_FINGERPRINTS = 200;

const STORAGE_KEYS = {
  enabled: "transio_enabled",
  seenFingerprints: "seen_fingerprints",
  seenRowFingerprints: "seen_row_fingerprints",
  priorityFingerprints: "transio_priority_fingerprints",
};

const LIST_SELECTORS = {
  row: ".row-cells",
  age: '[data-test="load-age-cell"]',
  origin: '[data-test="load-origin-cell"]',
  destination: '[data-test="load-destination-cell"]',
  rate: '[data-test="load-rate-cell"] .offer',
  ratePerMile: '[data-test="load-rate-cell"] .calculated-rate',
  distance: '[data-test="load-trip-cell"]',
  pickupDate: '[data-test="load-pick-up-cell"]',
  equipment: '[data-test="load-eq-cell"]',
  weight: '[data-test="load-weight-cell"]',
  length: '[data-test="load-length-cell"]',
  capacity: '[data-test="load-capacity-cell"]',
  company: '[data-test="load-company-cell"]',
  phone: '[data-test="load-contact-cell"]',
  credit: '[data-test="load-cs-dtp-cell"]',
};

const DETAIL_SELECTORS = {
  panel: ".expanded-detail-row, .details",
  tripPlace: ".trip-place",
  distance: ".trip-miles",
  contact:
    '[data-test="contact-information-container"] a, dat-contacts a, a[href^="mailto:"], a[href^="tel:"]',
  comments:
    '[data-test="comments-container"] .notes-contents, dat-notes .notes-contents, .notes-contents',
  company: '[data-test="company-details-container"], dat-company',
  equipmentDetail:
    'dat-equipment [data-test="details-container"], dat-equipment, [data-test="details-container"]',
  rateDetail: '[data-test="rate-details-container"], dat-rate',
  marketRates: '[data-test="market-rates-detail-container"]',
};

let isScraping = false;
let isEnabled = false;
let scrapeIntervalId = null;
let scrapeAgainRequested = false;
const pendingLoads = [];
const queuedFingerprints = new Set();
let isSending = false;
let flushPendingLoadsRequested = false;
let detailQueue = null;
let rowObserver = null;
let rowObserverTimerId = null;

function sleep(ms, signal) {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }

    const timeoutId = window.setTimeout(resolve, ms);

    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeoutId);
        resolve();
      },
      { once: true }
    );
  });
}

function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw new DOMException("Detail fetch aborted.", "AbortError");
  }
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanValue(value) {
  const text = normalizeText(value);

  if (
    !text ||
    text === "-" ||
    text === "\u2013" ||
    text === "\u2014" ||
    /^n\/?a$/i.test(text)
  ) {
    return "";
  }

  return text;
}

function getText(root, selector) {
  return normalizeText(root?.querySelector(selector)?.textContent);
}

function getFirstText(root, selectors) {
  for (const selector of selectors) {
    const value = cleanValue(root?.querySelector(selector)?.textContent);

    if (value) {
      return value;
    }
  }

  return "";
}

function getTexts(root, selector) {
  return Array.from(root?.querySelectorAll(selector) ?? [])
    .map((element) => cleanValue(element?.textContent))
    .filter(Boolean);
}

function parseMoney(value) {
  const match = normalizeText(value)
    .replace(/,/g, "")
    .match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function parseInteger(value) {
  const match = normalizeText(value).replace(/,/g, "").match(/-?\d+/);
  return match ? Number(match[0]) : null;
}

function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatMoney(value) {
  const amount = parseMoney(value);

  if (amount === null) {
    return cleanValue(value);
  }

  return `$${amount.toLocaleString("en-US")}`;
}

function extractPhone(value) {
  const match = normalizeText(value).match(
    /(\+?1[\s.-]?)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/
  );

  return match ? normalizeText(match[0]) : "";
}

function extractEmail(value) {
  const match = normalizeText(value).match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  return match ? match[0] : "";
}

function extractWebsite(value) {
  const text = normalizeText(value).replace(/[()]/g, " ");
  const pattern =
    /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s|]*)?/gi;

  for (const match of text.matchAll(pattern)) {
    const value = match[0];
    const previousChar = match.index ? text[match.index - 1] : "";

    if (previousChar !== "@" && !/^\d+\.\d+$/.test(value)) {
      return value;
    }
  }

  return "";
}

function normalizeEquipment(value) {
  const text = cleanValue(value);
  const normalized = text.toLowerCase();

  if (!text) {
    return "";
  }

  if (normalized === "r" || normalized.includes("reefer")) {
    return "Reefer";
  }

  if (
    normalized === "v" ||
    normalized === "dv" ||
    normalized.includes("dry van") ||
    normalized === "van"
  ) {
    return "Dry Van";
  }

  if (
    normalized === "f" ||
    normalized === "fb" ||
    normalized.includes("flatbed") ||
    normalized.includes("flat bed")
  ) {
    return "Flatbed";
  }

  if (
    normalized === "po" ||
    normalized.includes("power only") ||
    normalized.includes("power-only")
  ) {
    return "Power Only";
  }

  if (normalized.includes("box truck") || normalized.includes("boxtruck")) {
    return "Box Truck";
  }

  return text;
}

function parseLocation(text) {
  const raw = normalizeText(text)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw) {
    return {
      city: "Unknown",
      state: "",
      address: "",
    };
  }

  const match = raw.match(/^(.+?),\s*([A-Z]{2})$/i);

  if (!match) {
    return {
      city: raw,
      state: "",
      address: raw,
    };
  }

  return {
    city: normalizeText(match[1]),
    state: normalizeText(match[2]).toUpperCase(),
    address: raw,
  };
}

function extractReferenceId(value, allowLoose = false) {
  const clean = cleanValue(value);

  if (!clean) {
    return "";
  }

  const invalidWords = new Set([
    "FULL",
    "TRUCK",
    "LOAD",
    "STEP",
    "DECK",
    "EMPTY",
    "DEPOT",
    "PORTS",
    "REFERENCE",
    "COMMODITY",
  ]);
  const normalizeCandidate = (candidate) => {
    const id = cleanValue(candidate).toUpperCase();

    if (
      id.length < 4 ||
      !/\d/.test(id) ||
      invalidWords.has(id) ||
      /\s/.test(id)
    ) {
      return "";
    }

    return id;
  };
  const labeledMatch = clean.match(
    /\bReference\s*ID\b\s*[:#-]?\s*([A-Z0-9][A-Z0-9-]{3,})\b/i
  );

  if (labeledMatch) {
    const directCandidate = normalizeCandidate(labeledMatch[1]);

    if (directCandidate) {
      return directCandidate;
    }

    const labelIndex = clean.search(/\bReference\s*ID\b/i);
    const labelTail =
      labelIndex === -1 ? "" : clean.slice(labelIndex, labelIndex + 120);

    for (const match of labelTail.matchAll(/\b[A-Z0-9][A-Z0-9-]{3,}\b/gi)) {
      const candidate = normalizeCandidate(match[0]);

      if (candidate) {
        return candidate;
      }
    }
  }

  if (!allowLoose) {
    return "";
  }

  for (const match of clean.matchAll(/\b[A-Z0-9][A-Z0-9-]{3,}\b/gi)) {
    const candidate = normalizeCandidate(match[0]);

    if (candidate) {
      return candidate;
    }
  }

  return "";
}

function extractMcNumber(value) {
  const text = normalizeText(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const match =
    text.match(/\bMC\s*#\s*(\d{3,})\b/i) ||
    text.match(/\bMC\s+(\d{3,})\b/i) ||
    text.match(/\bMC#?(\d{3,})\b/i);

  return match ? `MC#${match[1]}` : "";
}

function parsePickup(text) {
  const raw = normalizeText(text);

  if (!raw) {
    return {
      pickup_date: null,
      pickup_time: null,
    };
  }

  const now = new Date();
  const lower = raw.toLowerCase();
  let baseDate = null;

  if (lower.includes("today")) {
    baseDate = new Date(now);
  } else if (lower.includes("tomorrow")) {
    baseDate = new Date(now);
    baseDate.setDate(baseDate.getDate() + 1);
  } else {
    const namedDateMatch = raw.match(
      /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:,\s*(\d{4}))?\b/i
    );
    const dateMatch = raw.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);

    if (namedDateMatch) {
      const monthNames = {
        jan: 0,
        feb: 1,
        mar: 2,
        apr: 3,
        may: 4,
        jun: 5,
        jul: 6,
        aug: 7,
        sep: 8,
        oct: 9,
        nov: 10,
        dec: 11,
      };
      const monthKey = namedDateMatch[1].slice(0, 3).toLowerCase();
      const month = monthNames[monthKey];
      const day = Number(namedDateMatch[2]);
      const year = namedDateMatch[3]
        ? Number(namedDateMatch[3])
        : now.getFullYear();

      baseDate = new Date(year, month, day);
    } else if (dateMatch) {
      const month = Number(dateMatch[1]) - 1;
      const day = Number(dateMatch[2]);
      const year = dateMatch[3]
        ? Number(dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3])
        : now.getFullYear();

      baseDate = new Date(year, month, day);
    }
  }

  const timeMatch = raw.match(
    /\b\d{1,2}:?\d{2}\s?(?:AM|PM)?(?:\s?-\s?\d{1,2}:?\d{2}\s?(?:AM|PM)?)?\b/i
  );

  return {
    pickup_date:
      baseDate && !Number.isNaN(baseDate.getTime())
        ? toLocalDateString(baseDate)
        : null,
    pickup_time: timeMatch ? normalizeText(timeMatch[0].toUpperCase()) : null,
  };
}

function createFingerprint(parts) {
  const input = parts.map((part) => normalizeText(part)).join("|");
  let hash = 5381;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }

  return `load-${(hash >>> 0).toString(16)}`;
}

function normalizeSeenFingerprints(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => normalizeText(item)).filter(Boolean);
  }

  if (rawValue && typeof rawValue === "object") {
    return Object.entries(rawValue)
      .filter(([, wasSeen]) => Boolean(wasSeen))
      .map(([fingerprint]) => normalizeText(fingerprint))
      .filter(Boolean);
  }

  return [];
}

function trimFingerprints(fingerprints) {
  return fingerprints.slice(-MAX_SEEN_FINGERPRINTS);
}

function normalizePriorityFingerprints(rawValue) {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  return Array.from(
    new Set(rawValue.map((item) => normalizeText(item)).filter(Boolean))
  ).slice(0, MAX_PRIORITY_FINGERPRINTS);
}

function trimPriorityFingerprints(fingerprints) {
  return normalizePriorityFingerprints(fingerprints).slice(
    0,
    MAX_PRIORITY_FINGERPRINTS
  );
}

function normalizeLabel(label) {
  return normalizeText(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findPairValue(pairs, labels) {
  const wanted = labels.map(normalizeLabel);
  const entry = pairs.find((item) =>
    wanted.includes(normalizeLabel(item.label))
  );
  return entry ? cleanValue(entry.value) : "";
}

function extractPairs(root, labelSelector, valueSelector) {
  const labels = Array.from(root?.querySelectorAll(labelSelector) ?? []);
  const values = Array.from(root?.querySelectorAll(valueSelector) ?? []);

  return labels
    .map((label, index) => ({
      label: normalizeText(label.textContent),
      value: cleanValue(values[index]?.textContent),
    }))
    .filter((item) => item.label || item.value);
}

function findEquipmentRoot(panel) {
  const roots = Array.from(
    panel?.querySelectorAll(
      "dat-equipment, dat-equipment [data-test='details-container'], .data-container"
    ) ?? []
  );

  return (
    roots.find(
      (el) =>
        el.querySelector(".equipment-label .data-label") &&
        el.querySelector(".equipment-data .data-item")
    ) || null
  );
}

function parseCredit(text) {
  const clean = normalizeText(text);

  const scoreMatch = clean.match(/\b(\d{1,3})\s*CS\b/i);
  const daysMatch = clean.match(/\b(\d{1,3})\s*DTP\b/i);

  return {
    creditScore: scoreMatch ? `${scoreMatch[1]} CS` : "",
    daysToPay: daysMatch ? `${daysMatch[1]} DTP` : "",
  };
}

function getStorage(defaults) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(defaults, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(result);
    });
  });
}

function setStorage(values) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(values, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve();
    });
  });
}

function findDetailPanelNearRow(row) {
  const expanded =
    row?.nextElementSibling ||
    row?.parentElement?.nextElementSibling ||
    document.querySelector(".expanded-detail-row") ||
    document.querySelector(".details");

  const root =
    expanded?.closest?.(".expanded-detail-row, .details") ||
    expanded ||
    null;

  // DAT detail blocks sometimes render in sibling columns,
  // so use the nearest large container; fallback to body.
  if (
    root?.querySelector?.("dat-equipment") ||
    root?.querySelector?.("dat-notes") ||
    root?.querySelector?.("dat-company") ||
    root?.querySelector?.('[data-test="contact-information-container"]')
  ) {
    return root;
  }

  if (
    document.body?.querySelector?.("dat-equipment") ||
    document.body?.querySelector?.("dat-notes") ||
    document.body?.querySelector?.("dat-company") ||
    document.body?.querySelector?.('[data-test="contact-information-container"]')
  ) {
    return document.body;
  }

  return null;
}

function getListLocationText(row, selector) {
  const locationRoot = row?.querySelector(selector);

  if (!locationRoot) {
    return "";
  }

  if (selector === LIST_SELECTORS.destination) {
    return cleanValue(locationRoot.textContent);
  }

  const destinationRoot = row?.querySelector(LIST_SELECTORS.destination);
  const locationParts = Array.from(
    locationRoot.querySelectorAll(".city-state-container")
  );
  const originPart = locationParts.find(
    (element) => element !== destinationRoot
  );

  if (originPart) {
    return cleanValue(originPart.textContent);
  }

  const raw = cleanValue(locationRoot.textContent);
  const destinationText = cleanValue(destinationRoot?.textContent);

  return destinationText ? cleanValue(raw.replace(destinationText, "")) : raw;
}

function getRouteLocationText(routeRoot, type) {
  if (!routeRoot) {
    return "";
  }

  if (type === "origin") {
    const detailsText = getFirstText(routeRoot, [".route-origin .city"]);

    if (detailsText) {
      return detailsText;
    }

    const listRoot = routeRoot.querySelector('[data-test="load-origin-cell"]');
    const destinationRoot = routeRoot.querySelector(
      '[data-test="load-destination-cell"]'
    );
    const cityStateRows = Array.from(
      listRoot?.querySelectorAll(".city-state-container") ?? []
    );
    const originRow =
      cityStateRows.find((element) => element !== destinationRoot) ||
      cityStateRows[0];

    return cleanValue(originRow?.textContent);
  }

  return getFirstText(routeRoot, [
    ".route-destination .city",
    '[data-test="load-destination-cell"]',
    ".route-dh-container-lg .destination",
  ]);
}

function getCreditText(row) {
  const creditRoot =
    row?.querySelector('[data-test="load-cs-dtp-cell"]') ||
    row?.querySelector("dat-credit") ||
    row?.querySelector(".cell-credit") ||
    row?.querySelector(".score-container");

  if (!creditRoot) {
    return "";
  }

  const cs =
    normalizeText(
      Array.from(creditRoot.querySelectorAll("div"))
        .map((el) => el.textContent)
        .find((text) => /\b\d{1,3}\s*CS\b/i.test(text))
    ) || "";

  const dtp =
    normalizeText(
      creditRoot.querySelector(".days-to-pay")?.textContent ||
        Array.from(creditRoot.querySelectorAll("div"))
          .map((el) => el.textContent)
          .find((text) => /\b\d{1,3}\s*DTP\b/i.test(text))
    ) || "";

  return normalizeText(`${cs} ${dtp}`);
}

function extractListData(row) {
  return {
    ageText: getText(row, LIST_SELECTORS.age),
    originText: getListLocationText(row, LIST_SELECTORS.origin),
    destinationText: getListLocationText(row, LIST_SELECTORS.destination),
    rateText: getText(row, LIST_SELECTORS.rate),
    ratePerMileText: getText(row, LIST_SELECTORS.ratePerMile),
    distanceText: getText(row, LIST_SELECTORS.distance),
    pickupText: getText(row, LIST_SELECTORS.pickupDate),
    equipmentText: getText(row, LIST_SELECTORS.equipment),
    weightText: getText(row, LIST_SELECTORS.weight),
    lengthText: getText(row, LIST_SELECTORS.length),
    capacityText: getText(row, LIST_SELECTORS.capacity),
    companyText: getText(row, LIST_SELECTORS.company),
    phoneText: getText(row, LIST_SELECTORS.phone),
    creditText: getFirstText(row, [
      '[data-test="load-cs-dtp-cell"]',
      ".score-container",
      ".cell-credit",
    ]),
  };
}

function createListFingerprint(listData) {
  if (!listData?.originText && !listData?.destinationText) {
    return "";
  }

  return createFingerprint([
    listData.originText,
    listData.destinationText,
    listData.rateText,
    listData.ratePerMileText,
    listData.distanceText,
    listData.pickupText,
    listData.equipmentText,
    listData.weightText,
    listData.lengthText,
    listData.capacityText,
    listData.companyText,
    listData.phoneText,
  ]);
}

function hasNewRowsSinceSnapshot(snapshotFingerprints, snapshotCount) {
  const currentRows = Array.from(document.querySelectorAll(LIST_SELECTORS.row));

  if (currentRows.length !== snapshotCount) {
    return true;
  }

  return currentRows.some((row) => {
    const fingerprint = createListFingerprint(extractListData(row));
    return fingerprint && !snapshotFingerprints.has(fingerprint);
  });
}

function extractRouteDetails(panel) {
  const tripPlace = panel?.querySelector(DETAIL_SELECTORS.tripPlace);
  const tripDivs = Array.from(tripPlace?.querySelectorAll(":scope > div") ?? [])
    .map((el) => cleanValue(el.textContent))
    .filter(Boolean);

  const headerOrigin = tripDivs[0] || "";
  const headerDestination = tripDivs[1] || "";

  const routeRoot = panel?.querySelector("dat-route") ?? panel;

  const originText = headerOrigin || getRouteLocationText(routeRoot, "origin");

  const destinationText =
    headerDestination || getRouteLocationText(routeRoot, "destination");

  const originDateText = getFirstText(routeRoot, [
    ".route-origin .date",
    '[data-test="load-pick-up-cell"]',
  ]);

  const destinationDateText = getFirstText(routeRoot, [
    ".route-destination .date",
  ]);

  return {
    originText,
    destinationText,
    originDateText,
    originTimeText: getFirstText(routeRoot, [".route-origin .hours"]),
    destinationDateText,
    destinationTimeText: getFirstText(routeRoot, [".route-destination .hours"]),
    distanceText: getFirstText(panel, [
      ".trip-miles",
      '[data-test="load-trip-cell"]',
    ]),
  };
}

function extractEquipmentDetails(panel) {
  const equipmentRoot = findEquipmentRoot(panel);

  const labels = Array.from(
    equipmentRoot?.querySelectorAll(".equipment-label .data-label") ?? []
  ).map((el) => normalizeText(el.textContent));

  const values = Array.from(
    equipmentRoot?.querySelectorAll(".equipment-data .data-item") ?? []
  ).map((el) => cleanValue(el.textContent));

  const getValue = (labelName) => {
    const index = labels.findIndex(
      (label) => normalizeLabel(label) === normalizeLabel(labelName)
    );

    return index >= 0 ? cleanValue(values[index]) : "";
  };

  return {
    loadType: getValue("Load"),
    truck: getValue("Truck"),
    length: getValue("Length"),
    weight: getValue("Weight"),
    commodity: getValue("Commodity"),
    referenceId: getValue("Reference ID"),
  };
}

function extractRateDetails(panel) {
  const rateRoot = panel?.querySelector(DETAIL_SELECTORS.rateDetail);
  const pairs = extractPairs(
    rateRoot,
    ".rate-detail-label .data-label",
    ".rate-data .data-item, .rate-data .data-item-total, .rate-data .data-item-ratemiles"
  );

  return {
    totalText:
      getFirstText(rateRoot, [".data-item-total"]) ||
      findPairValue(pairs, ["Total"]),
    tripText: findPairValue(pairs, ["Trip"]),
    ratePerMileText:
      getFirstText(rateRoot, [".data-item-ratemiles"]) ||
      findPairValue(pairs, ["Rate / mile", "Rate per mile"]),
  };
}

function extractMarketRates(panel) {
  const marketRoot = panel?.querySelector(DETAIL_SELECTORS.marketRates);
  const spotRoot = marketRoot?.querySelector(".spot") ?? marketRoot;
  const rangeText = getFirstText(spotRoot, [".range-data"]);
  const rangeMatches = rangeText.match(/\$[\d,]+(?:\.\d+)?/g) || [];
  const perMileMatches = rangeText.match(/\$\d+(?:\.\d+)?\/mi/g) || [];

  if (!marketRoot) {
    return {};
  }

  return {
    spotRateText: getFirstText(spotRoot, [".rate-data"]),
    spotRatePerMileText: getFirstText(spotRoot, [".rate-permile"]),
    spotAverageText: getFirstText(spotRoot, [".miles-day-average"]),
    rangeText,
    rangeLowText: rangeMatches[0] || "",
    rangeHighText: rangeMatches[1] || "",
    rangePerMileLowText: perMileMatches[0] || "",
    rangePerMileHighText: perMileMatches[1] || "",
    contractUnavailable: /contract rates are not available/i.test(
      normalizeText(marketRoot.textContent)
    ),
  };
}

function extractCompanyDetails(panel) {
  const companyRoot =
    panel?.querySelector('[data-test="company-details-container"]') ||
    panel?.querySelector("dat-company") ||
    panel;

  const fullText = normalizeText(panel?.textContent);
  const companyText = normalizeText(companyRoot?.textContent);

  const email =
    companyRoot
      ?.querySelector('a[href^="mailto:"]')
      ?.getAttribute("href")
      ?.replace(/^mailto:/i, "")
      .trim() ||
    extractEmail(companyText) ||
    extractEmail(fullText);

  const phone =
    companyRoot
      ?.querySelector('a[href^="tel:"]')
      ?.getAttribute("href")
      ?.replace(/^tel:/i, "")
      .trim() ||
    extractPhone(companyText) ||
    extractPhone(fullText);

  return {
    name: getFirstText(companyRoot, [
      ".company-details",
      ".company-name",
      '[data-test="load-company-cell"]',
    ]),
    phone: extractPhone(phone),
    email,
    mcNumber:
      extractMcNumber(
        getFirstText(companyRoot, [
          ".city-spacing:not(.light-text)",
          ".row-container .city-spacing:not(.light-text)",
        ])
      ) ||
      extractMcNumber(companyText) ||
      extractMcNumber(fullText),
    location: getFirstText(companyRoot, [
      ".city-spacing.light-text",
      ".company-location",
      ".light-text",
    ]),
    factoringEligible: /factoring eligible/i.test(companyText || fullText),
    rating:
      companyRoot.querySelectorAll('[data-mat-icon-name="star-dark"]').length ||
      null,
    reviews: getFirstText(companyRoot, [".reviews"]).replace(/[()]/g, ""),
  };
}

function extractDetailData(panel) {
  const route = extractRouteDetails(panel);
  const equipment = extractEquipmentDetails(panel);
  const rate = extractRateDetails(panel);
  const marketRates = extractMarketRates(panel);
  const company = extractCompanyDetails(panel);

  const rawText = normalizeText(panel?.textContent);

  console.log("[TransIO] DETAIL DEBUG:", {
    hasCompany: Boolean(
      panel.querySelector(
        "dat-company, [data-test='company-details-container']"
      )
    ),
    hasEquipment: Boolean(panel.querySelector("dat-equipment")),
    hasComments: Boolean(
      panel.querySelector("dat-notes, [data-test='comments-container']")
    ),
    hasContact: Boolean(
      panel.querySelector(
        "[data-test='contact-information-container'], dat-contacts"
      )
    ),
    mc: extractMcNumber(panel.textContent),
    email: extractEmail(panel.textContent),
    text: normalizeText(panel.textContent).slice(0, 600),
  });

  const comments =
    getText(panel, DETAIL_SELECTORS.comments) ||
    rawText.match(
      /COMMENTS\s+(.+?)(?:MARKET RATES|LOAD RESOURCES|Company|$)/i
    )?.[1] ||
    "";

  const contacts = getTexts(panel, DETAIL_SELECTORS.contact);
  const contactText = contacts.join(" | ");
  const combinedText = [comments, contactText, rawText]
    .filter(Boolean)
    .join(" | ");

  const referenceId =
    equipment.referenceId ||
    rawText.match(/\bReference ID\s+([A-Z0-9-]{3,})/i)?.[1] ||
    "";

  const commodity =
    equipment.commodity ||
    rawText.match(/\bCommodity\s+(.+?)\s+Reference ID\b/i)?.[1] ||
    "";

  const mcNumber =
    company.mcNumber ||
    rawText.match(/\bMC\s*#?\s*\d{3,}\b/i)?.[0]?.replace(/\s+/g, "") ||
    "";

  const email = company.email || extractEmail(combinedText) || "";

  return {
    route,
    equipment: {
      ...equipment,
      commodity: cleanValue(commodity),
      referenceId: cleanValue(referenceId),
    },
    rate,
    marketRates,
    company: {
      ...company,
      mcNumber,
      email,
    },
    contacts,
    comments: cleanValue(comments),
    commodity: cleanValue(commodity),
    referenceId: cleanValue(referenceId),
    mcNumber,
    companyLocation: company.location,
    rawText,
    phoneText:
      contacts.find((item) => /\d{3}.*\d{3}.*\d{4}/.test(item)) ||
      company.phone ||
      "",
    email,
    website: extractWebsite(combinedText),
  };
}

function ensureFingerprint(load) {
  if (normalizeText(load?.fingerprint)) {
    return load.fingerprint;
  }

  return createFingerprint([
    load?.origin?.address,
    load?.destination?.address,
    load?.rate,
    load?.distance,
    load?.pickup_date,
    load?.pickup_time,
    load?.trailer_type,
    load?.weight,
    load?.broker,
    load?.contact?.phone,
    load?.external_id,
  ]);
}

function mergeLoadData(listData, detailData) {
  const route = detailData?.route || {};
  const equipmentDetails = detailData?.equipment || {};
  const rateDetails = detailData?.rate || {};
  const companyDetails = detailData?.company || {};
  const listCredit = parseCredit(listData.creditText);

  console.log("[TransIO] CREDIT DEBUG:", {
    raw: listData.creditText,
    parsed: listCredit,
  });

  const pickup = parsePickup(
    [route.originDateText, route.originTimeText, listData.pickupText]
      .map(cleanValue)
      .filter(Boolean)
      .join(" ")
  );
  const originText = route.originText || listData.originText;
  const destinationText = route.destinationText || listData.destinationText;
  const trailerType = normalizeEquipment(
    equipmentDetails.truck || listData.equipmentText
  );
  const ratePerMileText = cleanValue(
    rateDetails.ratePerMileText || listData.ratePerMileText
  );
  const phone =
    extractPhone(detailData?.phoneText) || extractPhone(listData.phoneText);
  const origin = parseLocation(originText || "Unknown");
  const destination = parseLocation(destinationText || "Unknown");

  origin.date = route.originDateText || null;
  origin.time = route.originTimeText || null;
  destination.date = route.destinationDateText || null;
  destination.time = route.destinationTimeText || null;

  const notes = [detailData?.comments]
    .map(normalizeText)
    .filter(Boolean)
    .join(" | ");
  const referenceText = cleanValue(
    detailData?.referenceId || equipmentDetails.referenceId
  );
  const externalId =
    extractReferenceId(referenceText, true) ||
    referenceText ||
    extractReferenceId(detailData?.rawText) ||
    "";
  const lengthText = cleanValue(equipmentDetails.length || listData.lengthText);
  const capacityText = cleanValue(
    equipmentDetails.loadType || listData.capacityText
  );
  const commodityText = cleanValue(equipmentDetails.commodity);
  const weightText = cleanValue(equipmentDetails.weight || listData.weightText);
  const distanceText = cleanValue(
    route.distanceText || rateDetails.tripText || listData.distanceText
  );
  const marketRates = detailData?.marketRates || {};
  const email = detailData?.email || extractEmail(notes);
  const website = detailData?.website || "";
  const creditScore = companyDetails.creditScore || listCredit.creditScore;
  const daysToPay = companyDetails.daysToPay || listCredit.daysToPay;

  const load = {
    fingerprint: "",
    external_id: externalId || null,
    source: "dat-extension",
    origin,
    destination,
    rate: parseMoney(rateDetails.totalText || listData.rateText),
    distance: parseInteger(distanceText),
    pickup_date: pickup.pickup_date,
    pickup_time: pickup.pickup_time || route.originTimeText || null,
    trailer_type: trailerType || null,
    weight: parseInteger(weightText),
    dimensions: null,
    broker: cleanValue(companyDetails.name || listData.companyText) || null,
    contact: {
      phone: phone || null,
      email: email || null,
      website: website || null,
      mcNumber: detailData?.mcNumber || companyDetails.mcNumber || null,
      companyLocation:
        detailData?.companyLocation || companyDetails.location || null,
      factoringEligible: Boolean(companyDetails.factoringEligible),
      rating: companyDetails.rating || null,
      reviews: companyDetails.reviews || null,
      creditScore: creditScore || null,
      daysToPay: daysToPay || null,
      age: cleanValue(listData.ageText) || null,
      ratePerMile: parseMoney(ratePerMileText),
      ratePerMileText: ratePerMileText || null,
      loadType: capacityText || null,
      length: lengthText || null,
      capacity: capacityText || null,
      commodity: detailData?.commodity || commodityText || null,
      referenceId: externalId || null,
      marketRates: {
        spotRate: parseMoney(marketRates.spotRateText),
        spotRateText: formatMoney(marketRates.spotRateText),
        spotRatePerMile: parseMoney(marketRates.spotRatePerMileText),
        spotRatePerMileText: cleanValue(marketRates.spotRatePerMileText),
        spotAverageText: cleanValue(marketRates.spotAverageText),
        rangeText: cleanValue(marketRates.rangeText),
        rangeLowText: cleanValue(marketRates.rangeLowText),
        rangeHighText: cleanValue(marketRates.rangeHighText),
        rangePerMileLowText: cleanValue(marketRates.rangePerMileLowText),
        rangePerMileHighText: cleanValue(marketRates.rangePerMileHighText),
        contractUnavailable: Boolean(marketRates.contractUnavailable),
      },
    },
    notes: notes || null,
    status: "available",
    received_at: new Date().toISOString(),
  };

  load.fingerprint = ensureFingerprint(load);
  return load;
}

async function clickRowAndReadDetails(row, { signal } = {}) {
  throwIfAborted(signal);
  row?.scrollIntoView?.({
    block: "center",
    inline: "nearest",
    behavior: "auto",
  });

  await sleep(40, signal);
  throwIfAborted(signal);
  row?.click?.();

  const startTime = Date.now();
  let panel = findDetailPanelNearRow(row);

  while (!panel && Date.now() - startTime < DETAIL_WAIT_TIMEOUT_MS) {
    await sleep(DETAIL_WAIT_STEP_MS, signal);
    throwIfAborted(signal);
    panel = findDetailPanelNearRow(row);
  }

  if (!panel) {
    return null;
  }

  return extractDetailData(panel);
}

function attachListMetadata(load, { row, listData, rowFingerprint }) {
  Object.defineProperties(load, {
    __row: {
      value: row,
      enumerable: false,
    },
    __listData: {
      value: listData,
      enumerable: false,
    },
    __rowFingerprint: {
      value: rowFingerprint,
      enumerable: false,
    },
    __detailSignature: {
      value: [rowFingerprint, ensureFingerprint(load)].filter(Boolean).join("|"),
      enumerable: false,
    },
  });
}

function resolveDetailRow(task) {
  const rows = Array.from(document.querySelectorAll(LIST_SELECTORS.row));
  const rowFingerprint = normalizeText(task?.rowFingerprint);
  const loadFingerprint = normalizeText(task?.fingerprint);

  for (const row of rows) {
    const listData = extractListData(row);
    const currentRowFingerprint = createListFingerprint(listData);

    if (rowFingerprint && currentRowFingerprint === rowFingerprint) {
      return row;
    }

    if (loadFingerprint) {
      const load = mergeLoadData(listData, null);

      if (ensureFingerprint(load) === loadFingerprint) {
        return row;
      }
    }
  }

  return null;
}

function findVisibleLoadSnapshotByFingerprint(fingerprint) {
  const normalizedFingerprint = normalizeText(fingerprint);

  if (!normalizedFingerprint) {
    return null;
  }

  const rows = Array.from(document.querySelectorAll(LIST_SELECTORS.row));

  for (const row of rows) {
    const listData = extractListData(row);
    const rowFingerprint = createListFingerprint(listData);

    if (!listData.originText && !listData.destinationText) {
      continue;
    }

    const load = mergeLoadData(listData, null);
    const loadFingerprint = ensureFingerprint(load);

    if (
      normalizedFingerprint !== loadFingerprint &&
      normalizedFingerprint !== rowFingerprint
    ) {
      continue;
    }

    load.fingerprint = loadFingerprint;
    attachListMetadata(load, {
      row,
      listData,
      rowFingerprint,
    });

    return load;
  }

  return null;
}

function buildRouteDetailText(...parts) {
  return parts.map(cleanValue).filter(Boolean).join(" ");
}

function buildStops(load) {
  return [
    {
      type: "pickup",
      city: load.origin?.city || "",
      state: load.origin?.state || "",
      address: load.origin?.address || "",
      date: load.origin?.date || load.pickup_date || null,
      time: load.origin?.time || load.pickup_time || null,
    },
    {
      type: "delivery",
      city: load.destination?.city || "",
      state: load.destination?.state || "",
      address: load.destination?.address || "",
      date: load.destination?.date || null,
      time: load.destination?.time || null,
    },
  ];
}

function buildDetailPayload(load, detailData, task = {}) {
  const route = detailData?.route || {};
  const equipment = detailData?.equipment || {};
  const company = detailData?.company || {};
  const rawText = normalizeText(detailData?.rawText);
  const comments = cleanValue(detailData?.comments || load.notes);
  const brokerPhone = extractPhone(
    detailData?.phoneText || company.phone || load.contact?.phone
  );
  const brokerEmail = cleanValue(
    company.email || detailData?.email || load.contact?.email
  );
  const commodity = cleanValue(
    detailData?.commodity || equipment.commodity || load.contact?.commodity
  );
  const length = cleanValue(equipment.length || load.contact?.length);
  const pickupDetails = buildRouteDetailText(
    route.originDateText,
    route.originTimeText
  );
  const deliveryDetails = buildRouteDetailText(
    route.destinationDateText,
    route.destinationTimeText
  );
  const appointmentText = [comments, pickupDetails, deliveryDetails, rawText]
    .filter(Boolean)
    .join(" ");

  return {
    broker_name: cleanValue(company.name || load.broker),
    broker_phone: brokerPhone,
    broker_email: brokerEmail,
    comments,
    commodity,
    weight: cleanValue(equipment.weight || load.weight),
    length,
    stops: buildStops(load),
    appointment_required: /\b(appt|appointment)\b/i.test(appointmentText),
    pickup_details: pickupDetails,
    delivery_details: deliveryDetails,
    raw_detail: {
      source: "dat-extension",
      list: task.listData || {},
      route,
      equipment,
      rate: detailData?.rate || {},
      marketRates: detailData?.marketRates || {},
      company,
      contacts: detailData?.contacts || [],
      referenceId: detailData?.referenceId || load.external_id || "",
      rawText: rawText.slice(0, 10000),
    },
    detail_status: "enriched",
    detail_fetched_at: new Date().toISOString(),
  };
}

async function readResponseBody(response) {
  const responseText = await response.text();

  try {
    return responseText ? JSON.parse(responseText) : null;
  } catch (error) {
    return responseText;
  }
}

async function sendEnrichmentToBackend(fingerprint, payload, { signal } = {}) {
  const response = await fetch(
    `${ENRICH_ENDPOINT_BASE}/${encodeURIComponent(fingerprint)}/enrich`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    }
  );
  const responseBody = await readResponseBody(response);

  console.log("[TransIO] Enrich response status:", response.status);
  console.log("[TransIO] Enrich response body:", responseBody);

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}: ${responseBody?.error || "Enrich failed"}`
    );
  }

  return responseBody;
}

function initializeDetailEnrichment() {
  if (detailQueue) {
    return;
  }

  if (!window.TransIODetailFetcher || !window.TransIODetailQueue) {
    console.warn(
      "[TransIO] Detail enrichment modules are unavailable; list ingest will continue."
    );
    return;
  }

  try {
    const fetcher = window.TransIODetailFetcher.createDetailFetcher({
      clickRowAndReadDetails,
      mergeLoadData,
      buildDetailPayload,
      sendEnrichmentToBackend,
      resolveRow: resolveDetailRow,
    });

    detailQueue = window.TransIODetailQueue.createDetailQueue({
      fetcher,
      logger: console,
      concurrency: DETAIL_QUEUE_CONCURRENCY,
    });
  } catch (error) {
    console.error("[TransIO] Detail enrichment failed to initialize", error);
  }
}

function queueDetailEnrichment(load, options = {}) {
  if (!detailQueue) {
    return Promise.resolve(null);
  }

  const fingerprint = ensureFingerprint(load);

  if (!fingerprint || !load.__row || !load.__listData) {
    return Promise.resolve(null);
  }

  return detailQueue
    .enqueue({
      fingerprint,
      row: load.__row,
      listData: load.__listData,
      rowFingerprint: normalizeText(load.__rowFingerprint),
      listLoad: load,
      signature: load.__detailSignature || fingerprint,
      rate: load.rate,
      distance: load.distance,
      ratePerMile: load.contact?.ratePerMile,
      receivedAtMs: Date.now(),
      highPriority: Boolean(options.highPriority),
      dispatcherOpened: Boolean(options.dispatcherOpened),
    })
    .catch((error) => {
      console.warn("[TransIO] detail queue enqueue failed", error);
      return null;
    });
}

async function prioritizeDetailFingerprint(fingerprint) {
  const normalizedFingerprint = normalizeText(fingerprint);

  if (!normalizedFingerprint || !detailQueue) {
    return false;
  }

  if (await detailQueue.markPriority(normalizedFingerprint)) {
    return true;
  }

  const load = findVisibleLoadSnapshotByFingerprint(normalizedFingerprint);

  if (!load) {
    return false;
  }

  await queueDetailEnrichment(load, {
    highPriority: true,
    dispatcherOpened: true,
  });

  return true;
}

async function processPriorityFingerprints() {
  if (!detailQueue) {
    return;
  }

  const storage = await getStorage({
    [STORAGE_KEYS.priorityFingerprints]: [],
  });
  const fingerprints = normalizePriorityFingerprints(
    storage[STORAGE_KEYS.priorityFingerprints]
  );

  if (fingerprints.length === 0) {
    return;
  }

  const remaining = [];

  for (const fingerprint of fingerprints) {
    try {
      if (!(await prioritizeDetailFingerprint(fingerprint))) {
        remaining.push(fingerprint);
      }
    } catch (error) {
      remaining.push(fingerprint);
      console.warn("[TransIO] priority detail enqueue failed", fingerprint, error);
    }
  }

  if (remaining.length !== fingerprints.length) {
    await setStorage({
      [STORAGE_KEYS.priorityFingerprints]: trimPriorityFingerprints(remaining),
    });
  }
}

async function waitForLoadRows() {
  const startTime = Date.now();

  while (Date.now() - startTime < ROW_WAIT_TIMEOUT_MS) {
    if (!isEnabled) {
      return [];
    }

    const rows = Array.from(document.querySelectorAll(LIST_SELECTORS.row));

    if (rows.length > 0) {
      return rows;
    }

    console.log("[TransIO] Waiting for load rows...");
    await sleep(ROW_WAIT_STEP_MS);
  }

  return [];
}

async function collectLoadsFromPage() {
  const rows = await waitForLoadRows();

  if (rows.length === 0) {
    console.log("[TransIO] No load rows available for scraping");
    return {
      loads: [],
      hasNewRowsAfterSnapshot: false,
    };
  }

  const rowSnapshots = rows.map((row) => {
    const listData = extractListData(row);

    return {
      row,
      listData,
      fingerprint: createListFingerprint(listData),
    };
  });
  const snapshotFingerprints = new Set(
    rowSnapshots.map((item) => item.fingerprint).filter(Boolean)
  );
  const storage = await getStorage({
    [STORAGE_KEYS.seenFingerprints]: [],
    [STORAGE_KEYS.seenRowFingerprints]: [],
  });
  const seenRowFingerprints = new Set(
    normalizeSeenFingerprints(storage[STORAGE_KEYS.seenRowFingerprints])
  );
  const seenFingerprints = new Set(
    normalizeSeenFingerprints(storage[STORAGE_KEYS.seenFingerprints])
  );
  const rowFingerprintsToStore = [];
  const pageFingerprints = new Set();
  const loads = [];

  console.log(`[TransIO] Found ${rows.length} load rows`);

  for (const [index, snapshot] of rowSnapshots.entries()) {
    if (!isEnabled) {
      console.log("[TransIO] Scrape stopped because extension was disabled");
      break;
    }

    try {
      const { row, listData, fingerprint: rowFingerprint } = snapshot;

      if (!listData.originText && !listData.destinationText) {
        continue;
      }

      if (
        !rowFingerprint ||
        pageFingerprints.has(rowFingerprint) ||
        queuedFingerprints.has(rowFingerprint)
      ) {
        continue;
      }

      const preliminaryLoad = mergeLoadData(listData, null);
      const preliminaryFingerprint = ensureFingerprint(preliminaryLoad);

      if (
        preliminaryFingerprint &&
        queuedFingerprints.has(preliminaryFingerprint)
      ) {
        continue;
      }

      if (!preliminaryFingerprint) {
        continue;
      }

      if (
        seenFingerprints.has(preliminaryFingerprint) ||
        seenRowFingerprints.has(rowFingerprint) ||
        pageFingerprints.has(preliminaryFingerprint)
      ) {
        preliminaryLoad.fingerprint = preliminaryFingerprint;
        attachListMetadata(preliminaryLoad, {
          row,
          listData,
          rowFingerprint,
        });
        void queueDetailEnrichment(preliminaryLoad);
        seenRowFingerprints.add(rowFingerprint);
        rowFingerprintsToStore.push(rowFingerprint);
        pageFingerprints.add(preliminaryFingerprint);
        pageFingerprints.add(rowFingerprint);
        continue;
      }

      console.log(`[TransIO] Capturing list row ${index + 1}/${rows.length}`);

      const load = preliminaryLoad;
      const fingerprint = preliminaryFingerprint;

      if (
        !fingerprint ||
        pageFingerprints.has(fingerprint) ||
        queuedFingerprints.has(fingerprint) ||
        seenFingerprints.has(fingerprint)
      ) {
        continue;
      }

      load.fingerprint = fingerprint;
      attachListMetadata(load, {
        row,
        listData,
        rowFingerprint,
      });
      pageFingerprints.add(fingerprint);
      pageFingerprints.add(rowFingerprint);

      if (queueLoadForSending(load)) {
        loads.push(load);
      }
    } catch (error) {
      console.error(`[TransIO] Row ${index + 1} failed`, error);
    }
  }

  const hasNewRowsAfterSnapshot =
    isEnabled && hasNewRowsSinceSnapshot(snapshotFingerprints, rows.length);

  if (hasNewRowsAfterSnapshot) {
    console.log("[TransIO] New row snapshot detected; next cycle queued");
  }

  if (rowFingerprintsToStore.length > 0) {
    await setStorage({
      [STORAGE_KEYS.seenRowFingerprints]: trimFingerprints([
        ...seenRowFingerprints,
      ]),
    });
  }

  return {
    loads,
    hasNewRowsAfterSnapshot,
  };
}

function buildFakeLoads() {
  return [
    {
      fingerprint: "fake-test-1",
      source: "dat-extension",
      origin: {
        city: "Chicago",
        state: "IL",
        address: "Chicago, IL",
      },
      destination: {
        city: "Dallas",
        state: "TX",
        address: "Dallas, TX",
      },
      rate: 2500,
      distance: 950,
      pickup_date: "2026-04-29",
      pickup_time: "08:00 AM",
      trailer_type: "Dry Van",
      weight: 42000,
      broker: "Test Broker",
      contact: {
        phone: "(555) 123-4567",
      },
      notes: "FAKE TEST LOAD",
      status: "available",
      received_at: new Date().toISOString(),
    },
  ];
}

async function getNewLoads(loads) {
  const storage = await getStorage({
    [STORAGE_KEYS.seenFingerprints]: [],
  });
  const storedFingerprints = normalizeSeenFingerprints(
    storage[STORAGE_KEYS.seenFingerprints]
  );
  const seenSet = new Set(storedFingerprints);
  const newLoads = [];

  for (const load of loads) {
    const fingerprint = ensureFingerprint(load);

    if (
      !fingerprint ||
      seenSet.has(fingerprint) ||
      queuedFingerprints.has(fingerprint)
    ) {
      continue;
    }

    load.fingerprint = fingerprint;
    seenSet.add(fingerprint);
    newLoads.push(load);
  }

  return newLoads;
}

async function markLoadsAsSeen(loads) {
  if (loads.length === 0) {
    return;
  }

  const storage = await getStorage({
    [STORAGE_KEYS.seenFingerprints]: [],
    [STORAGE_KEYS.seenRowFingerprints]: [],
  });
  const storedFingerprints = normalizeSeenFingerprints(
    storage[STORAGE_KEYS.seenFingerprints]
  );
  const seenSet = new Set(storedFingerprints);
  const nextFingerprints = [...storedFingerprints];
  const storedRowFingerprints = normalizeSeenFingerprints(
    storage[STORAGE_KEYS.seenRowFingerprints]
  );
  const seenRowSet = new Set(storedRowFingerprints);
  const nextRowFingerprints = [...storedRowFingerprints];

  for (const load of loads) {
    const fingerprint = ensureFingerprint(load);
    const rowFingerprint = normalizeText(load.__rowFingerprint);

    if (!fingerprint || seenSet.has(fingerprint)) {
      if (rowFingerprint && !seenRowSet.has(rowFingerprint)) {
        seenRowSet.add(rowFingerprint);
        nextRowFingerprints.push(rowFingerprint);
      }
      continue;
    }

    seenSet.add(fingerprint);
    nextFingerprints.push(fingerprint);

    if (rowFingerprint && !seenRowSet.has(rowFingerprint)) {
      seenRowSet.add(rowFingerprint);
      nextRowFingerprints.push(rowFingerprint);
    }
  }

  await setStorage({
    [STORAGE_KEYS.seenFingerprints]: trimFingerprints(nextFingerprints),
    [STORAGE_KEYS.seenRowFingerprints]: trimFingerprints(nextRowFingerprints),
  });
}

async function sendLoadsToBackend(loads) {
  if (loads.length === 0) {
    console.log("[TransIO] No new loads to send");
    return null;
  }

  const response = await fetch(INGEST_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ loads }),
  });
  const responseBody = await readResponseBody(response);

  console.log("[TransIO] Response status:", response.status);
  console.log("[TransIO] Response body:", responseBody);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return responseBody;
}

function trackQueuedLoad(load) {
  const fingerprint = ensureFingerprint(load);
  const rowFingerprint = normalizeText(load.__rowFingerprint);

  if (fingerprint) {
    queuedFingerprints.add(fingerprint);
  }

  if (rowFingerprint) {
    queuedFingerprints.add(rowFingerprint);
  }
}

function releaseQueuedLoad(load) {
  const fingerprint = ensureFingerprint(load);
  const rowFingerprint = normalizeText(load.__rowFingerprint);

  if (fingerprint) {
    queuedFingerprints.delete(fingerprint);
  }

  if (rowFingerprint) {
    queuedFingerprints.delete(rowFingerprint);
  }
}

function queueLoadForSending(load) {
  const fingerprint = ensureFingerprint(load);

  if (!fingerprint || queuedFingerprints.has(fingerprint)) {
    return false;
  }

  load.fingerprint = fingerprint;
  pendingLoads.push(load);
  trackQueuedLoad(load);
  console.log(`[TransIO] Queue size: ${pendingLoads.length}`);

  if (pendingLoads.length >= SEND_BATCH_SIZE) {
    void sendPendingLoads();
  }

  return true;
}

async function sendBatchWithRetry(batch) {
  for (let retryCount = 0; retryCount <= MAX_SEND_RETRIES; retryCount += 1) {
    console.log(`[TransIO] Sending batch of ${batch.length} loads`);

    try {
      await sendLoadsToBackend(batch);
      await markLoadsAsSeen(batch);
      batch.forEach((load) => {
        console.log("[TransIO] load ingested", ensureFingerprint(load));
        void queueDetailEnrichment(load);
      });
      void processPriorityFingerprints();
      batch.forEach(releaseQueuedLoad);
      console.log("[TransIO] Batch success");
      return true;
    } catch (error) {
      if (retryCount < MAX_SEND_RETRIES) {
        console.warn("[TransIO] Batch retry");
        continue;
      }

      console.error("[TransIO] Batch failed after retries", error);
    }
  }

  return false;
}

async function sendPendingLoads() {
  if (isSending) {
    return;
  }

  isSending = true;

  try {
    while (
      pendingLoads.length >= SEND_BATCH_SIZE ||
      (flushPendingLoadsRequested && pendingLoads.length > 0)
    ) {
      const batch = pendingLoads.splice(0, SEND_BATCH_SIZE);
      console.log(`[TransIO] Queue size: ${pendingLoads.length}`);

      if (!(await sendBatchWithRetry(batch))) {
        pendingLoads.unshift(...batch);
        console.log(`[TransIO] Queue size: ${pendingLoads.length}`);
        return;
      }
    }
  } finally {
    isSending = false;

    if (pendingLoads.length === 0) {
      flushPendingLoadsRequested = false;
    }
  }
}

function flushPendingLoads() {
  if (pendingLoads.length === 0) {
    return;
  }

  flushPendingLoadsRequested = true;
  void sendPendingLoads();
}

function scheduleScrapeSoon() {
  if (!isEnabled) {
    return;
  }

  if (rowObserverTimerId !== null) {
    window.clearTimeout(rowObserverTimerId);
  }

  rowObserverTimerId = window.setTimeout(() => {
    rowObserverTimerId = null;
    void scrapeAndSend();
  }, ROW_MUTATION_DEBOUNCE_MS);
}

function startRowObserver() {
  if (rowObserver || !document.body) {
    return;
  }

  rowObserver = new MutationObserver((mutations) => {
    const hasLoadRowChange = mutations.some((mutation) => {
      return Array.from(mutation.addedNodes).some((node) => {
        if (!(node instanceof Element)) {
          return false;
        }

        return (
          node.matches?.(LIST_SELECTORS.row) ||
          Boolean(node.querySelector?.(LIST_SELECTORS.row))
        );
      });
    });

    if (hasLoadRowChange) {
      scheduleScrapeSoon();
    }
  });

  rowObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function stopRowObserver() {
  if (rowObserverTimerId !== null) {
    window.clearTimeout(rowObserverTimerId);
    rowObserverTimerId = null;
  }

  if (rowObserver) {
    rowObserver.disconnect();
    rowObserver = null;
  }
}

async function scrapeAndSend() {
  if (!isEnabled) {
    return;
  }

  if (isScraping) {
    scrapeAgainRequested = true;
    console.log("[TransIO] Scrape queued because another run is active");
    return;
  }

  isScraping = true;

  try {
    console.log("[TransIO] Scrape started");

    const scrapeResult = TEST_MODE
      ? {
          loads: buildFakeLoads(),
          hasNewRowsAfterSnapshot: false,
        }
      : await collectLoadsFromPage();
    const newLoads = TEST_MODE
      ? await getNewLoads(scrapeResult.loads)
      : scrapeResult.loads;

    if (TEST_MODE) {
      newLoads.forEach(queueLoadForSending);
    }

    if (scrapeResult.hasNewRowsAfterSnapshot) {
      scrapeAgainRequested = true;
    }

    if (!isEnabled) {
      return;
    }

    console.log(`[TransIO] New loads: ${newLoads.length}`);

    flushPendingLoads();
    void processPriorityFingerprints();
  } catch (error) {
    console.error("[TransIO] Scrape cycle failed", error);
  } finally {
    const shouldRunAgain = isEnabled && scrapeAgainRequested;

    scrapeAgainRequested = false;
    isScraping = false;

    if (shouldRunAgain) {
      window.setTimeout(() => {
        void scrapeAndSend();
      }, 0);
    }
  }
}

function stopScrapeLoop() {
  if (scrapeIntervalId !== null) {
    window.clearInterval(scrapeIntervalId);
    scrapeIntervalId = null;
  }

  stopRowObserver();
}

function startScrapeLoop() {
  stopScrapeLoop();

  if (!isEnabled) {
    return;
  }

  startRowObserver();
  void scrapeAndSend();

  scrapeIntervalId = window.setInterval(() => {
    void scrapeAndSend();
  }, SCRAPE_INTERVAL_MS);
}

async function enableTransio() {
  if (isEnabled) {
    return;
  }

  isEnabled = true;
  await setStorage({
    [STORAGE_KEYS.enabled]: true,
  });
  startScrapeLoop();
}

async function disableTransio() {
  if (!isEnabled) {
    return;
  }

  isEnabled = false;
  stopScrapeLoop();
  await setStorage({
    [STORAGE_KEYS.enabled]: false,
  });
  console.log("[TransIO] Stopped");
}

function applyEnabledState(nextEnabled) {
  if (nextEnabled === isEnabled) {
    return;
  }

  isEnabled = nextEnabled;

  if (isEnabled) {
    startScrapeLoop();
    return;
  }

  console.log("[TransIO] Stopped");
  stopScrapeLoop();
}

async function initialize() {
  const storage = await getStorage({
    [STORAGE_KEYS.enabled]: false,
    [STORAGE_KEYS.seenFingerprints]: [],
    [STORAGE_KEYS.seenRowFingerprints]: [],
    [STORAGE_KEYS.priorityFingerprints]: [],
  });

  isEnabled = Boolean(storage[STORAGE_KEYS.enabled]);

  if (!Array.isArray(storage[STORAGE_KEYS.seenFingerprints])) {
    await setStorage({
      [STORAGE_KEYS.seenFingerprints]: trimFingerprints(
        normalizeSeenFingerprints(storage[STORAGE_KEYS.seenFingerprints])
      ),
    });
  }

  if (!Array.isArray(storage[STORAGE_KEYS.seenRowFingerprints])) {
    await setStorage({
      [STORAGE_KEYS.seenRowFingerprints]: trimFingerprints(
        normalizeSeenFingerprints(storage[STORAGE_KEYS.seenRowFingerprints])
      ),
    });
  }

  if (!Array.isArray(storage[STORAGE_KEYS.priorityFingerprints])) {
    await setStorage({
      [STORAGE_KEYS.priorityFingerprints]: trimPriorityFingerprints(
        normalizePriorityFingerprints(storage[STORAGE_KEYS.priorityFingerprints])
      ),
    });
  }

  initializeDetailEnrichment();
  void processPriorityFingerprints();

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    if (changes[STORAGE_KEYS.enabled]) {
      applyEnabledState(Boolean(changes[STORAGE_KEYS.enabled].newValue));
    }

    if (changes[STORAGE_KEYS.priorityFingerprints]) {
      void processPriorityFingerprints();
    }
  });

  if (isEnabled) {
    console.log("[TransIO] Extension is enabled, starting scrape loop");
    startScrapeLoop();
    return;
  }

  console.log(
    "[TransIO] Extension is disabled. Use the popup button to begin."
  );
}

void initialize();
