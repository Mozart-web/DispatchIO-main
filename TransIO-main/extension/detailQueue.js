(function () {
  const DEFAULT_CONCURRENCY = 5;
  const MAX_CONCURRENCY = 10;
  const MAX_RETRIES = 4;
  const BASE_BACKOFF_MS = 1000;
  const MAX_BACKOFF_MS = 10000;
  const TRANSIENT_RETRY_MS = 2000;
  const WATCHDOG_INTERVAL_MS = 3000;
  const STUCK_JOB_MS = 10000;
  const MAX_STORED_SIGNATURES = 5000;

  const STORAGE_KEYS = {
    enrichedSignatures: "transio_detail_enriched_signatures",
  };

  function normalizeText(value) {
    return String(value ?? "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeConcurrency(value) {
    const number = Number(value);

    if (!Number.isFinite(number) || number < 1) {
      return DEFAULT_CONCURRENCY;
    }

    return Math.min(MAX_CONCURRENCY, Math.floor(number));
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

  function normalizeSignatureMap(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(value)
        .map(([fingerprint, signature]) => [
          normalizeText(fingerprint),
          normalizeText(signature),
        ])
        .filter(([fingerprint, signature]) => fingerprint && signature)
        .slice(-MAX_STORED_SIGNATURES)
    );
  }

  function calculateScore(task) {
    const rate = Number(task.rate || 0);
    const distance = Number(task.distance || 0);
    const ratePerMile =
      Number(task.ratePerMile || 0) || (distance > 0 ? rate / distance : 0);
    const deadheadMiles = Number(task.deadheadMiles);
    const deadheadScore = Number.isFinite(deadheadMiles)
      ? Math.max(0, 500 - deadheadMiles) * 10
      : 0;

    return ratePerMile * 2500 + rate * 0.25 + deadheadScore;
  }

  function compareJobs(a, b) {
    const aReceivedAt = Number(a.receivedAtMs || a.enqueuedAt || 0);
    const bReceivedAt = Number(b.receivedAtMs || b.enqueuedAt || 0);
    const freshDelta = bReceivedAt - aReceivedAt;

    if (Math.abs(freshDelta) > 500) {
      return freshDelta;
    }

    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }

    return b.enqueuedAt - a.enqueuedAt;
  }

  function backoffDelay(retryCount) {
    const exponential = BASE_BACKOFF_MS * 2 ** Math.max(0, retryCount - 1);
    const jitter = Math.floor(Math.random() * 350);

    return Math.min(MAX_BACKOFF_MS, exponential + jitter);
  }

  function isTransientError(error) {
    return Boolean(error?.transient);
  }

  function errorMessage(error) {
    if (error?.name === "AbortError") {
      return "Detail fetch timed out.";
    }

    return error instanceof Error ? error.message : String(error);
  }

  function createDetailQueue({
    fetcher,
    logger = console,
    concurrency = DEFAULT_CONCURRENCY,
  } = {}) {
    if (!fetcher || typeof fetcher.fetch !== "function") {
      throw new Error("TransIO detail queue requires a fetcher.");
    }

    const pendingQueue = [];
    const priorityQueue = [];
    const activeJobs = new Map();
    const inFlightFingerprints = new Set();
    const enrichedFingerprints = new Set();
    const statusByFingerprint = new Map();
    let enrichedSignatures = {};
    let configuredConcurrency = normalizeConcurrency(concurrency);
    let hydrationPromise = null;
    let pumpTimer = null;
    let watchdogTimer = null;

    async function hydrate() {
      if (!hydrationPromise) {
        hydrationPromise = getStorage({
          [STORAGE_KEYS.enrichedSignatures]: {},
        }).then((storage) => {
          enrichedSignatures = normalizeSignatureMap(
            storage[STORAGE_KEYS.enrichedSignatures]
          );

          Object.keys(enrichedSignatures).forEach((fingerprint) => {
            enrichedFingerprints.add(fingerprint);
            statusByFingerprint.set(fingerprint, "enriched");
          });
        });
      }

      return hydrationPromise;
    }

    async function persistSignature(fingerprint, signature) {
      enrichedSignatures[fingerprint] = signature;
      const entries = Object.entries(enrichedSignatures).slice(
        -MAX_STORED_SIGNATURES
      );
      enrichedSignatures = Object.fromEntries(entries);

      await setStorage({
        [STORAGE_KEYS.enrichedSignatures]: enrichedSignatures,
      });
    }

    function logStats() {
      logger.log(
        `[detailQueue] active=${activeJobs.size} pending=${pendingQueue.length} priority=${priorityQueue.length}`
      );
    }

    function schedulePump(delay = 0) {
      if (pumpTimer !== null) {
        window.clearTimeout(pumpTimer);
      }

      pumpTimer = window.setTimeout(() => {
        pumpTimer = null;
        void scheduleWorkers();
      }, delay);
    }

    function removeQueuedFingerprint(queue, fingerprint) {
      const index = queue.findIndex((job) => job.fingerprint === fingerprint);

      if (index === -1) {
        return null;
      }

      const [job] = queue.splice(index, 1);
      return job || null;
    }

    function removeFromQueues(fingerprint) {
      return (
        removeQueuedFingerprint(priorityQueue, fingerprint) ||
        removeQueuedFingerprint(pendingQueue, fingerprint)
      );
    }

    function findQueuedJob(fingerprint) {
      return (
        priorityQueue.find((job) => job.fingerprint === fingerprint) ||
        pendingQueue.find((job) => job.fingerprint === fingerprint) ||
        null
      );
    }

    function pushPending(job) {
      removeFromQueues(job.fingerprint);
      pendingQueue.push(job);
      inFlightFingerprints.add(job.fingerprint);
      statusByFingerprint.set(job.fingerprint, job.status);
    }

    function pushPriority(job) {
      removeFromQueues(job.fingerprint);
      job.highPriority = true;
      job.dispatcherOpened = true;
      job.nextAttemptAt = 0;
      priorityQueue.unshift(job);
      inFlightFingerprints.add(job.fingerprint);
      statusByFingerprint.set(job.fingerprint, job.status);
      logger.log(`[detailQueue] priority fingerprint=${job.fingerprint}`);
    }

    function takeBestDueJob(queue, now) {
      const dueJobs = queue.filter((job) => job.nextAttemptAt <= now);

      if (dueJobs.length === 0) {
        return null;
      }

      dueJobs.sort(compareJobs);
      const job = dueJobs[0];
      removeQueuedFingerprint(queue, job.fingerprint);

      return job;
    }

    function getNextPriorityJob() {
      const now = Date.now();

      return (
        takeBestDueJob(priorityQueue, now) ||
        takeBestDueJob(pendingQueue, now)
      );
    }

    function hasDueJobs() {
      const now = Date.now();

      return [...priorityQueue, ...pendingQueue].some(
        (job) => job.nextAttemptAt <= now
      );
    }

    function scheduleNextAttempt() {
      if (hasDueJobs()) {
        schedulePump();
        return;
      }

      const nextAttemptAt = [...priorityQueue, ...pendingQueue]
        .map((job) => job.nextAttemptAt)
        .filter((nextAttempt) => nextAttempt > Date.now())
        .sort((a, b) => a - b)[0];

      if (nextAttemptAt) {
        schedulePump(Math.max(0, nextAttemptAt - Date.now()));
      }
    }

    function startWatchdog() {
      if (watchdogTimer !== null) {
        return;
      }

      watchdogTimer = window.setInterval(() => {
        checkStuckJobs();
      }, WATCHDOG_INTERVAL_MS);
    }

    function markBackendRetrying(job, reason) {
      if (typeof fetcher.markRetrying !== "function") {
        return;
      }

      void fetcher.markRetrying(job, reason).catch((error) => {
        logger.warn("[detailQueue] retrying status update failed", error);
      });
    }

    function requeueJob(job, reason, delay = 0) {
      job.status = "retrying";
      job.nextAttemptAt = Date.now() + delay;
      job.priorityScore = calculateScore(job);
      statusByFingerprint.set(job.fingerprint, "retrying");
      logger.warn(
        `[detailQueue] retrying fingerprint=${job.fingerprint} reason=${reason}`
      );
      markBackendRetrying(job, reason);

      if (job.highPriority || job.dispatcherOpened) {
        pushPriority(job);
      } else {
        pushPending(job);
      }
    }

    function resetActiveJob(fingerprint, reason, delay = 0) {
      const active = activeJobs.get(fingerprint);

      if (!active) {
        return false;
      }

      active.controller?.abort?.();
      activeJobs.delete(fingerprint);
      inFlightFingerprints.delete(fingerprint);
      requeueJob(active.job, reason, delay);

      return true;
    }

    function checkStuckJobs() {
      const now = Date.now();
      let didReset = false;

      for (const [fingerprint, active] of activeJobs.entries()) {
        if (now - active.startedAt <= STUCK_JOB_MS) {
          continue;
        }

        logger.warn(`[detailQueue] stuck job reset fingerprint=${fingerprint}`);
        didReset =
          resetActiveJob(fingerprint, "stuck for more than 10 seconds") ||
          didReset;
      }

      if (didReset) {
        schedulePump();
      }

      logStats();
    }

    function preemptForPriorityIfNeeded() {
      if (priorityQueue.length === 0 || activeJobs.size < configuredConcurrency) {
        return;
      }

      const activeNormalJobs = Array.from(activeJobs.entries())
        .filter(([, active]) => !active.job.highPriority)
        .sort(([, a], [, b]) => a.startedAt - b.startedAt);
      const oldestNormal = activeNormalJobs[0];

      if (!oldestNormal) {
        return;
      }

      resetActiveJob(
        oldestNormal[0],
        "preempted by dispatcher priority load",
        500
      );
    }

    async function markEnriched(job, startedAt) {
      job.status = "enriched";
      job.enrichedAt = Date.now();
      enrichedFingerprints.add(job.fingerprint);
      statusByFingerprint.set(job.fingerprint, "enriched");
      inFlightFingerprints.delete(job.fingerprint);
      try {
        await persistSignature(job.fingerprint, job.signature);
      } catch (error) {
        logger.warn("[detailQueue] enriched cache persist failed", error);
      }
      logger.log(
        `[detailQueue] enriched fingerprint=${job.fingerprint} ms=${Date.now() - startedAt}`
      );
    }

    async function markFinalFailed(job, error) {
      job.status = "failed";
      job.error = errorMessage(error);
      statusByFingerprint.set(job.fingerprint, "failed");
      inFlightFingerprints.delete(job.fingerprint);
      logger.error(
        `[detailQueue] failed fingerprint=${job.fingerprint} reason=${job.error}`
      );

      if (typeof fetcher.markFailed === "function") {
        try {
          await fetcher.markFailed(job, error);
        } catch (markError) {
          logger.warn("[detailQueue] failed status update failed", markError);
        }
      }
    }

    function isActiveTokenCurrent(fingerprint, token) {
      return activeJobs.get(fingerprint)?.token === token;
    }

    function finishActiveJob(fingerprint, token) {
      if (!isActiveTokenCurrent(fingerprint, token)) {
        return false;
      }

      activeJobs.delete(fingerprint);
      return true;
    }

    function fetchAndEnrich(job, signal) {
      return fetcher.fetch(job, { signal });
    }

    function handleRetryOrFail(job, error) {
      const transient = isTransientError(error);
      const reason = errorMessage(error);
      job.retryCount += 1;

      if (transient || job.retryCount <= MAX_RETRIES) {
        const delay = transient ? TRANSIENT_RETRY_MS : backoffDelay(job.retryCount);
        requeueJob(job, reason, delay);
        schedulePump(delay);
        return null;
      }

      return markFinalFailed(job, error);
    }

    function startJob(job) {
      const controller = new AbortController();
      const token = Symbol(job.fingerprint);
      const startedAt = Date.now();

      job.status = "enriching";
      job.startedAt = startedAt;
      statusByFingerprint.set(job.fingerprint, "enriching");
      inFlightFingerprints.add(job.fingerprint);
      activeJobs.set(job.fingerprint, {
        job,
        startedAt,
        controller,
        token,
      });

      logger.log(
        `[detailQueue] started fingerprint=${job.fingerprint} active=${activeJobs.size}/${configuredConcurrency}`
      );

      fetchAndEnrich(job, controller.signal)
        .then((detail) => {
          if (!isActiveTokenCurrent(job.fingerprint, token)) {
            return null;
          }

          return markEnriched(job, startedAt, detail);
        })
        .catch((error) => {
          if (!isActiveTokenCurrent(job.fingerprint, token)) {
            return null;
          }

          return handleRetryOrFail(job, error);
        })
        .finally(() => {
          finishActiveJob(job.fingerprint, token);

          void scheduleWorkers();
        });
    }

    async function scheduleWorkers() {
      await hydrate();
      startWatchdog();
      preemptForPriorityIfNeeded();

      while (activeJobs.size < configuredConcurrency && hasDueJobs()) {
        const job = getNextPriorityJob();

        if (!job) {
          break;
        }

        startJob(job);
      }

      scheduleNextAttempt();
      logStats();
    }

    async function enqueue(task) {
      await hydrate();

      const fingerprint = normalizeText(task?.fingerprint);
      const signature = normalizeText(task?.signature || fingerprint);

      if (!fingerprint || !signature) {
        return null;
      }

      if (enrichedSignatures[fingerprint] === signature) {
        enrichedFingerprints.add(fingerprint);
        statusByFingerprint.set(fingerprint, "enriched");
        logger.log(`[detailQueue] already enriched fingerprint=${fingerprint}`);
        return null;
      }

      const existingActive = activeJobs.get(fingerprint);

      if (existingActive) {
        Object.assign(existingActive.job, task, {
          fingerprint,
          signature,
          highPriority:
            existingActive.job.highPriority || Boolean(task.highPriority),
          dispatcherOpened:
            existingActive.job.dispatcherOpened ||
            Boolean(task.dispatcherOpened),
        });

        if (task.highPriority || task.dispatcherOpened) {
          logger.log(`[detailQueue] priority fingerprint=${fingerprint}`);
        } else {
          logger.log(`[detailQueue] queued fingerprint=${fingerprint}`);
        }

        return existingActive.job;
      }

      const existingQueued = findQueuedJob(fingerprint);

      if (existingQueued) {
        Object.assign(existingQueued, task, {
          fingerprint,
          signature,
          priorityScore: calculateScore(task),
          receivedAtMs: Number(task.receivedAtMs || existingQueued.receivedAtMs),
        });

        if (task.highPriority || task.dispatcherOpened) {
          pushPriority(existingQueued);
        } else {
          logger.log(`[detailQueue] queued fingerprint=${fingerprint}`);
        }

        schedulePump();
        return existingQueued;
      }

      if (inFlightFingerprints.has(fingerprint)) {
        logger.log(`[detailQueue] queued fingerprint=${fingerprint}`);
        return null;
      }

      const now = Date.now();
      const job = {
        ...task,
        fingerprint,
        signature,
        status: "pending",
        retryCount: 0,
        enqueuedAt: now,
        receivedAtMs: Number(task.receivedAtMs || now),
        nextAttemptAt: 0,
        priorityScore: calculateScore(task),
        highPriority: Boolean(task.highPriority),
        dispatcherOpened: Boolean(task.dispatcherOpened),
      };

      logger.log(`[detailQueue] queued fingerprint=${fingerprint}`);

      if (job.highPriority || job.dispatcherOpened) {
        pushPriority(job);
      } else {
        pushPending(job);
      }

      schedulePump();
      return job;
    }

    async function markPriority(fingerprint) {
      await hydrate();

      const normalizedFingerprint = normalizeText(fingerprint);

      if (!normalizedFingerprint) {
        return false;
      }

      const active = activeJobs.get(normalizedFingerprint);

      if (active) {
        active.job.highPriority = true;
        active.job.dispatcherOpened = true;
        logger.log(`[detailQueue] priority fingerprint=${normalizedFingerprint}`);
        return true;
      }

      const job = findQueuedJob(normalizedFingerprint);

      if (!job || job.status === "enriched") {
        return false;
      }

      job.highPriority = true;
      job.dispatcherOpened = true;
      job.status = "retrying";
      job.nextAttemptAt = 0;
      job.priorityScore = calculateScore(job);
      pushPriority(job);
      preemptForPriorityIfNeeded();
      schedulePump();
      return true;
    }

    function getStatus(fingerprint) {
      const normalizedFingerprint = normalizeText(fingerprint);
      const active = activeJobs.get(normalizedFingerprint);

      if (active) {
        return active.job.status;
      }

      return (
        findQueuedJob(normalizedFingerprint)?.status ||
        statusByFingerprint.get(normalizedFingerprint) ||
        null
      );
    }

    return {
      enqueue,
      getStatus,
      markPriority,
      pump: scheduleWorkers,
      scheduleWorkers,
    };
  }

  window.TransIODetailQueue = {
    createDetailQueue,
  };
})();
