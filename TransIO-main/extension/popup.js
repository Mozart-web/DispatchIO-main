const STORAGE_KEYS = {
  enabled: "transio_enabled",
  seenFingerprints: "seen_fingerprints",
};

const statusElement = document.getElementById("status");
const seenCountElement = document.getElementById("seenCount");
const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");

function normalizeSeenFingerprints(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.filter(Boolean);
  }

  if (rawValue && typeof rawValue === "object") {
    return Object.entries(rawValue)
      .filter(([, wasSeen]) => Boolean(wasSeen))
      .map(([fingerprint]) => fingerprint)
      .filter(Boolean);
  }

  return [];
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

function renderState(enabled, seenFingerprints) {
  statusElement.textContent = enabled ? "Status: ON" : "Status: OFF";
  seenCountElement.textContent = `Seen fingerprints: ${seenFingerprints.length}`;
  startButton.disabled = enabled;
  stopButton.disabled = !enabled;
}

async function refreshPopup() {
  const storage = await getStorage({
    [STORAGE_KEYS.enabled]: false,
    [STORAGE_KEYS.seenFingerprints]: [],
  });

  renderState(
    Boolean(storage[STORAGE_KEYS.enabled]),
    normalizeSeenFingerprints(storage[STORAGE_KEYS.seenFingerprints])
  );
}

async function updateEnabled(nextValue) {
  startButton.disabled = true;
  stopButton.disabled = true;

  try {
    await setStorage({
      [STORAGE_KEYS.enabled]: nextValue,
    });
    await refreshPopup();
  } catch (error) {
    statusElement.textContent = `Xato: ${error.message}`;
  }
}

startButton.addEventListener("click", () => {
  void updateEnabled(true);
});

stopButton.addEventListener("click", () => {
  void updateEnabled(false);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (changes[STORAGE_KEYS.enabled] || changes[STORAGE_KEYS.seenFingerprints]) {
    void refreshPopup();
  }
});

void refreshPopup();
