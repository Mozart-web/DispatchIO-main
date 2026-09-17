const express = require("express");
const { supabase } = require("../services/supabase");

const router = express.Router();

const VALID_DETAIL_STATUSES = new Set([
  "list_only",
  "pending",
  "retrying",
  "enriching",
  "enriched",
  "failed",
]);

function cleanText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).replace(/\s+/g, " ").trim();

  if (
    !text ||
    text === "-" ||
    text === "\u2013" ||
    text === "\u2014" ||
    /^(n\/?a|na|null|undefined)$/i.test(text)
  ) {
    return null;
  }

  return text;
}

function parseInteger(value) {
  const text = cleanText(value);

  if (!text) {
    return null;
  }

  const match = text.replace(/,/g, "").match(/-?\d+/);
  const number = match ? Number(match[0]) : null;

  return Number.isInteger(number) ? number : null;
}

function cleanTimestamp(value) {
  const text = cleanText(value);

  if (!text) {
    return null;
  }

  const date = new Date(text);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeDetailStatus(value, fallback = "enriched") {
  const status = cleanText(value)?.toLowerCase();

  return status && VALID_DETAIL_STATUSES.has(status) ? status : fallback;
}

function addTextUpdate(target, column, value) {
  const text = cleanText(value);

  if (text) {
    target[column] = text;
  }
}

function mergeContact(existingContact, updates) {
  const contact = isPlainObject(existingContact) ? { ...existingContact } : {};

  if (updates.broker_phone) contact.phone = updates.broker_phone;
  if (updates.broker_email) contact.email = updates.broker_email;
  if (updates.length) contact.length = updates.length;
  if (updates.commodity) contact.commodity = updates.commodity;

  const rawDetail = updates.raw_detail;
  const company = isPlainObject(rawDetail?.company) ? rawDetail.company : {};
  const rate = isPlainObject(rawDetail?.rate) ? rawDetail.rate : {};
  const marketRates = isPlainObject(rawDetail?.marketRates)
    ? rawDetail.marketRates
    : null;

  const mcNumber = cleanText(company.mcNumber);
  const companyLocation = cleanText(company.location);
  const ratePerMileText = cleanText(rate.ratePerMileText);

  if (mcNumber) contact.mcNumber = mcNumber;
  if (companyLocation) contact.companyLocation = companyLocation;
  if (typeof company.factoringEligible === "boolean") {
    contact.factoringEligible = company.factoringEligible;
  }
  if (typeof company.rating === "number") contact.rating = company.rating;
  if (cleanText(company.reviews)) contact.reviews = cleanText(company.reviews);
  if (ratePerMileText) contact.ratePerMileText = ratePerMileText;
  if (marketRates) contact.marketRates = marketRates;

  return contact;
}

function buildDetailUpdate(existingLoad, payload) {
  const update = {};
  const requestedStatus = normalizeDetailStatus(
    payload.detail_status,
    payload.detail_status ? "list_only" : "enriched"
  );

  update.detail_status = requestedStatus;
  update.updated_at = new Date().toISOString();

  if (requestedStatus === "enriched") {
    update.detail_fetched_at =
      cleanTimestamp(payload.detail_fetched_at) || new Date().toISOString();
    update.detail_error = null;
  } else if (requestedStatus === "failed") {
    update.detail_error =
      cleanText(payload.detail_error) || "Detail fetch failed";
  } else if (requestedStatus === "retrying") {
    update.detail_error = cleanText(payload.detail_error);
  } else if (
    requestedStatus === "enriching" ||
    requestedStatus === "pending" ||
    requestedStatus === "list_only"
  ) {
    update.detail_error = null;
  }

  addTextUpdate(update, "broker_name", payload.broker_name);
  addTextUpdate(update, "broker_phone", payload.broker_phone);
  addTextUpdate(update, "broker_email", payload.broker_email);
  addTextUpdate(update, "comments", payload.comments);
  addTextUpdate(update, "commodity", payload.commodity);
  addTextUpdate(update, "length", payload.length);
  addTextUpdate(update, "pickup_details", payload.pickup_details);
  addTextUpdate(update, "delivery_details", payload.delivery_details);

  if (Array.isArray(payload.stops)) {
    update.stops = payload.stops;
  }

  if (typeof payload.appointment_required === "boolean") {
    update.appointment_required = payload.appointment_required;
  }

  if (isPlainObject(payload.raw_detail)) {
    update.raw_detail = payload.raw_detail;
  }

  const detailWeight = parseInteger(payload.weight);

  if (detailWeight !== null) {
    update.weight = detailWeight;
  }

  const hasContactDetails = [
    "broker_phone",
    "broker_email",
    "length",
    "commodity",
    "raw_detail",
  ].some((key) => Object.prototype.hasOwnProperty.call(update, key));

  if (hasContactDetails) {
    update.contact = mergeContact(existingLoad.contact, update);
  }

  if (!cleanText(existingLoad.broker) && update.broker_name) {
    update.broker = update.broker_name;
  }

  if (!cleanText(existingLoad.notes) && update.comments) {
    update.notes = update.comments;
  }

  return update;
}

router.post("/:fingerprint/priority-enrich", async (req, res) => {
  try {
    const fingerprint = cleanText(req.params.fingerprint);

    if (!fingerprint) {
      return res.status(400).json({
        error: "A load fingerprint is required.",
      });
    }

    const { data: existingLoad, error: findError } = await supabase
      .from("loads")
      .select("fingerprint,detail_status")
      .eq("fingerprint", fingerprint)
      .maybeSingle();

    if (findError) {
      console.log(findError);

      return res.status(500).json({
        error: "Supabase load lookup failed",
      });
    }

    if (!existingLoad) {
      return res.status(404).json({
        error: "Load was not found for the supplied fingerprint.",
      });
    }

    const currentStatus = normalizeDetailStatus(
      existingLoad.detail_status,
      "list_only"
    );

    if (currentStatus === "enriched") {
      const { data, error } = await supabase
        .from("loads")
        .select()
        .eq("fingerprint", fingerprint)
        .single();

      if (error) {
        console.log(error);

        return res.status(500).json({
          error: "Supabase load lookup failed",
        });
      }

      return res.status(200).json({
        success: true,
        priority: false,
        fingerprint,
        detail_status: "enriched",
        data,
      });
    }

    const { data, error } = await supabase
      .from("loads")
      .update({
        detail_status: "retrying",
        detail_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("fingerprint", fingerprint)
      .select()
      .single();

    if (error) {
      console.log(error);

      return res.status(500).json({
        error: "Supabase priority update failed",
      });
    }

    return res.status(200).json({
      success: true,
      priority: true,
      fingerprint,
      detail_status: "retrying",
      data,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
});

router.patch("/:fingerprint/enrich", async (req, res) => {
  try {
    const fingerprint = cleanText(req.params.fingerprint);

    if (!fingerprint) {
      return res.status(400).json({
        error: "A load fingerprint is required.",
      });
    }

    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({
        error: "Request body must be an enrichment object.",
      });
    }

    const { data: existingLoad, error: findError } = await supabase
      .from("loads")
      .select("fingerprint,broker,contact,notes")
      .eq("fingerprint", fingerprint)
      .maybeSingle();

    if (findError) {
      console.log(findError);

      return res.status(500).json({
        error: "Supabase load lookup failed",
      });
    }

    if (!existingLoad) {
      return res.status(404).json({
        error: "Load was not found for the supplied fingerprint.",
      });
    }

    const update = buildDetailUpdate(existingLoad, req.body);

    const { data, error } = await supabase
      .from("loads")
      .update(update)
      .eq("fingerprint", fingerprint)
      .select()
      .single();

    if (error) {
      console.log(error);

      return res.status(500).json({
        error: "Supabase enrichment update failed",
      });
    }

    return res.status(200).json({
      success: true,
      fingerprint,
      data,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
});

module.exports = router;
