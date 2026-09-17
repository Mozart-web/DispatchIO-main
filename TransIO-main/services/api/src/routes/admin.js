const express = require("express");
const { supabase } = require("../services/supabase");
const { deleteExpiredLoads } = require("../services/load-retention");

const router = express.Router();

async function requireAdmin(req, res, next) {
  const userId = req.header("x-user-id");

  if (!userId) {
    return res.status(401).json({ error: "Missing x-user-id header" });
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: "Admin check failed" });
  }

  if (!data || data.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  return next();
}

async function countRows(table, queryBuilder) {
  const query = supabase.from(table).select("*", {
    count: "exact",
    head: true,
  });

  const { count, error } = queryBuilder ? await queryBuilder(query) : await query;

  if (error) {
    throw error;
  }

  return count || 0;
}

router.get("/stats", requireAdmin, async (_req, res) => {
  try {
    await deleteExpiredLoads(supabase);

    const [totalLoads, totalUsers, activeSubscriptions] = await Promise.all([
      countRows("loads"),
      countRows("users"),
      countRows("subscriptions", (query) =>
        query.in("status", ["active", "trialing"])
      ),
    ]);

    return res.json({
      data: {
        totalLoads,
        totalUsers,
        activeSubscriptions,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Stats could not be loaded" });
  }
});

router.get("/users", requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id,email,full_name,role,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return res.json({ data: data || [] });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Users could not be loaded" });
  }
});

module.exports = router;
