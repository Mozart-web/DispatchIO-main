(function () {
  const PRIORITY_MESSAGE_SOURCE = "transio-web";
  const PRIORITY_MESSAGE_TYPE = "TRANSIO_PRIORITY_ENRICH";
  const PRIORITY_STORAGE_KEY = "transio_priority_fingerprints";
  const MAX_PRIORITY_FINGERPRINTS = 200;

  function normalizeText(value) {
    return String(value ?? "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeFingerprints(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return Array.from(
      new Set(value.map((item) => normalizeText(item)).filter(Boolean))
    ).slice(0, MAX_PRIORITY_FINGERPRINTS);
  }

  function storePriorityFingerprint(fingerprint) {
    const normalizedFingerprint = normalizeText(fingerprint);

    if (!normalizedFingerprint) {
      return;
    }

    chrome.storage.local.get(
      {
        [PRIORITY_STORAGE_KEY]: [],
      },
      (storage) => {
        if (chrome.runtime.lastError) {
          console.warn(
            "[detailQueue] priority storage read failed",
            chrome.runtime.lastError.message
          );
          return;
        }

        const nextFingerprints = normalizeFingerprints([
          normalizedFingerprint,
          ...normalizeFingerprints(storage[PRIORITY_STORAGE_KEY]),
        ]);

        chrome.storage.local.set(
          {
            [PRIORITY_STORAGE_KEY]: nextFingerprints,
          },
          () => {
            if (chrome.runtime.lastError) {
              console.warn(
                "[detailQueue] priority storage write failed",
                chrome.runtime.lastError.message
              );
              return;
            }

            console.log(
              `[detailQueue] priority fingerprint=${normalizedFingerprint}`
            );
          }
        );
      }
    );
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) {
      return;
    }

    const message = event.data;

    if (
      !message ||
      message.source !== PRIORITY_MESSAGE_SOURCE ||
      message.type !== PRIORITY_MESSAGE_TYPE
    ) {
      return;
    }

    storePriorityFingerprint(message.fingerprint);
  });
})();
