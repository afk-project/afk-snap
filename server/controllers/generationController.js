const path = require("path");
const { Asset, GenerationJob, RoomMember, Wallet, sequelize } = require("../models");
const AppError = require("../helpers/errors");
const { charge } = require("../services/creditService");
const { processGeneration } = require("../services/generationService");
const { GENERATION_TYPES, calculateGenerationCost, fallbackGenerationType } = require("../services/generationPricing");

class GenerationController {
  static async create(req, res) {
    let files = req.files || [];
    const { format = "square", prompt = "", roomId } = req.body;
    const layout = Number(req.body.layout || 2);
    const fallbackType = fallbackGenerationType(req.body.mode, req.body.style);
    const generationType = req.body.generationType || fallbackType;
    const preset = GENERATION_TYPES[generationType];
    if (!preset) throw new AppError(400, "Jenis generation tidak valid", "ValidationError");
    const { style, mode } = preset;
    if (roomId) {
      const membership = await RoomMember.findOne({ where: { roomId, userId: req.user.id } });
      if (!membership) throw new AppError(403, "Kamu bukan anggota room ini", "Forbidden");
      const roomAssets = await Asset.findAll({ where: { roomId, kind: "source" } });
      const roomFiles = roomAssets.map((asset) => ({
        path: path.join(__dirname, "..", asset.url.replace(/^\//, "")),
        mimetype: asset.mimeType,
        originalname: asset.originalName,
        existingAsset: true,
      }));
      files = [...roomFiles, ...files].slice(0, 6);
    }
    if (!files.length) throw new AppError(400, "Unggah minimal satu foto", "ValidationError");
    if (roomId && mode === "studio") throw new AppError(400, "Gunakan jenis bersanding untuk foto dari room", "ValidationError");
    if (mode === "studio") files = files.slice(0, 1);
    if (!["square", "card", "story"].includes(format)) throw new AppError(400, "Format output tidak valid", "ValidationError");
    if (![1, 2, 3, 6].includes(layout)) throw new AppError(400, "Layout harus 1, 2, 3, atau 6 slot", "ValidationError");
    if (files.length < preset.minPhotos) throw new AppError(400, `Jenis ini membutuhkan minimal ${preset.minPhotos} foto`, "ValidationError");

    const cost = calculateGenerationCost(preset, files.length);
    const job = await sequelize.transaction(async (transaction) => {
      const created = await GenerationJob.create(
        { userId: req.user.id, roomId: roomId || null, generationType, style, format, mode, layout, prompt, cost },
        { transaction },
      );
      await charge(req.user.id, cost, created.id, transaction);
      await Promise.all(
        files.filter((file) => !file.existingAsset).map((file) =>
          Asset.create(
            {
              userId: req.user.id,
              roomId: roomId || null,
              generationJobId: created.id,
              kind: "source",
              url: `/uploads/${path.basename(file.path)}`,
              mimeType: file.mimetype,
              originalName: file.originalname,
            },
            { transaction },
          ),
        ),
      );
      return created;
    });

    const wallet = await Wallet.findOne({ where: { userId: req.user.id } });
    const io = req.app.get("io");
    setImmediate(() => processGeneration(job.id, files, io));
    io?.to(`user:${req.user.id}`).emit("wallet:updated", { balance: wallet.balance });
    res.status(202).json({ data: job, balance: wallet.balance });
  }

  static async list(req, res) {
    const jobs = await GenerationJob.findAll({
      where: { userId: req.user.id },
      include: [{ model: Asset, as: "assets" }],
      order: [["createdAt", "DESC"]],
      limit: 50,
    });
    res.json({ data: jobs });
  }

  static async detail(req, res) {
    const job = await GenerationJob.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [{ model: Asset, as: "assets" }],
    });
    if (!job) throw new AppError(404, "Hasil tidak ditemukan", "NotFound");
    res.json({ data: job });
  }
}

module.exports = GenerationController;
