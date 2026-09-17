const fs = require("fs");
const path = require("path");
const multer = require("multer");
const AppError = require("../helpers/errors");

const uploadDir = path.join(__dirname, "../uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "-").toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) return cb(null, true);
  cb(new AppError(400, "Foto harus berformat JPG, PNG, atau WebP", "ValidationError"));
};

module.exports = multer({ storage, fileFilter, limits: { fileSize: 8 * 1024 * 1024, files: 6 } });
