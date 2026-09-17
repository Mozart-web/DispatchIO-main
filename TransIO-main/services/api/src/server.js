require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env")
});

const express = require("express");
const cors = require("cors");

const adminRoute = require("./routes/admin");
const ingestRoute = require("./routes/ingest");
const loadsRoute = require("./routes/loads");
const { supabase } = require("./services/supabase");
const { deleteExpiredLoads } = require("./services/load-retention");

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "transio-api" });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/", adminRoute);
app.use("/ingest", ingestRoute);
app.use("/api/loads", loadsRoute);

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});

async function cleanupExpiredLoads() {
  try {
    await deleteExpiredLoads(supabase);
  } catch (error) {
    console.error("Expired load cleanup failed", error);
  }
}

void cleanupExpiredLoads();
setInterval(cleanupExpiredLoads, 10 * 60 * 1000);
