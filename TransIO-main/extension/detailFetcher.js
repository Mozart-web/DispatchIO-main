(function () {
  function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }

  function createTransientError(message) {
    const error = new Error(message);
    error.transient = true;
    return error;
  }

  function createDetailFetcher({
    clickRowAndReadDetails,
    mergeLoadData,
    buildDetailPayload,
    sendEnrichmentToBackend,
    resolveRow,
  } = {}) {
    if (
      typeof clickRowAndReadDetails !== "function" ||
      typeof mergeLoadData !== "function" ||
      typeof buildDetailPayload !== "function" ||
      typeof sendEnrichmentToBackend !== "function"
    ) {
      throw new Error("TransIO detail fetcher is missing required callbacks.");
    }

    function throwIfAborted(signal) {
      if (signal?.aborted) {
        throw new DOMException("Detail fetch aborted.", "AbortError");
      }
    }

    async function fetch(task, { signal } = {}) {
      throwIfAborted(signal);
      let row = task?.row;

      if (!row?.isConnected && typeof resolveRow === "function") {
        row = resolveRow(task);
        task.row = row;
      }

      if (!row?.isConnected) {
        throw createTransientError("DAT load row is no longer mounted.");
      }

      const detailData = await clickRowAndReadDetails(row, { signal });
      throwIfAborted(signal);

      if (!detailData) {
        throw createTransientError("DAT detail panel did not render detail data.");
      }

      const enrichedLoad = mergeLoadData(task.listData, detailData);
      enrichedLoad.fingerprint = task.fingerprint;

      const payload = buildDetailPayload(enrichedLoad, detailData, task);
      await sendEnrichmentToBackend(task.fingerprint, payload, { signal });

      return {
        load: enrichedLoad,
        detailData,
      };
    }

    async function markRetrying(task, reason) {
      await sendEnrichmentToBackend(task.fingerprint, {
        detail_status: "retrying",
        detail_error: errorMessage(reason).slice(0, 1000),
      });
    }

    async function markFailed(task, error) {
      await sendEnrichmentToBackend(task.fingerprint, {
        detail_status: "failed",
        detail_error: errorMessage(error).slice(0, 1000),
      });
    }

    return {
      fetch,
      markRetrying,
      markFailed,
    };
  }

  window.TransIODetailFetcher = {
    createDetailFetcher,
  };
})();
