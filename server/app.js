require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const AppError = require("./helpers/errors");
const { getAIStatus } = require("./services/aiService");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL?.split(",") || "http://localhost:5173", credentials: true }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/generated", express.static(path.join(__dirname, "public/generated")));

app.get("/health", (_req, res) => {
  const ai = getAIStatus();
  res.json({ status: "ok", service: "AFKSnap API", aiMode: ai.mode, aiConfigured: ai.configured, aiImageModel: ai.imageModel });
});
app.use("/api", routes);
app.use((_req, _res, next) => next(new AppError(404, "Endpoint tidak ditemukan", "NotFound")));
app.use(errorHandler);

module.exports = app;
