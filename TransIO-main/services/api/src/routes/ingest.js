const express = require("express");
const { supabase } = require("../services/supabase");
const { deleteExpiredLoads } = require("../services/load-retention");

const router = express.Router();

function normalizeLoad(load) {
  return {
    fingerprint: String(load.fingerprint),
    external_id: load.external_id ?? load.externalId ?? null,
    source: load.source ?? "collector",
    origin: load.origin ?? {},
    destination: load.destination ?? {},
    distance: load.distance ?? null,
    rate: load.rate ?? null,
    pickup_date: load.pickup_date ?? load.pickupDate ?? null,
    pickup_time: load.pickup_time ?? load.pickupTime ?? null,
    trailer_type:
      load.trailer_type ?? load.trailerType ?? load.equipment ?? null,
    weight: load.weight ?? null,
    dimensions: load.dimensions ?? null,
    broker: load.broker ?? null,
    contact: load.contact ?? {},
    notes: load.notes ?? null,
    tags: Array.isArray(load.tags) ? load.tags : [],
    status:
      typeof load.status === "string" ? load.status.toLowerCase() : "available",
    received_at:
      load.received_at ?? load.receivedAt ?? new Date().toISOString(),
  };
}

router.post("/", async (req, res) => {
  try {
    const { loads } = req.body;

    if (!Array.isArray(loads)) {
      return res.status(400).json({
        error: "Request body must look like { loads: [] }",
      });
    }

    const invalidIndex = loads.findIndex((load) => {
      return (
        !load ||
        typeof load !== "object" ||
        !load.fingerprint ||
        !load.origin ||
        !load.destination
      );
    });

    if (invalidIndex !== -1) {
      return res.status(400).json({
        error:
          "Each load must include fingerprint, origin, and destination fields",
        index: invalidIndex,
      });
    }

    const normalizedLoads = loads.map(normalizeLoad);

    await deleteExpiredLoads(supabase);

    const { data, error } = await supabase
      .from("loads")
      .upsert(normalizedLoads, {
        onConflict: "fingerprint",
      })
      .select();

    if (error) {
      console.log(error);

      return res.status(500).json({
        error: "Supabase upsert failed",
      });
    }

    return res.status(200).json({
      success: true,
      received: loads.length,
      upserted: data?.length ?? 0,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
});

module.exports = router;
