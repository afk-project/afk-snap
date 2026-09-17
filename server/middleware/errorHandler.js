module.exports = (error, _req, res, _next) => {
  const sendError = (status, message, name) => res.status(status).json({
    status,
    error: name,
    message,
  });

  if (error.name === "SequelizeValidationError") {
    return sendError(400, error.errors.map((item) => item.message).join(", "), "ValidationError");
  }
  if (error.name === "SequelizeUniqueConstraintError") {
    return sendError(409, "Data sudah digunakan", "Conflict");
  }
  if (error.code === "LIMIT_FILE_SIZE") {
    return sendError(413, "Ukuran foto maksimal 8 MB", "FileTooLarge");
  }
  if (error.name === "MulterError") {
    return sendError(400, "Upload foto tidak valid", "UploadError");
  }
  if (error.type === "entity.parse.failed") {
    return sendError(400, "Format JSON request tidak valid", "InvalidJson");
  }

  const status = error.status || 500;
  const message = status === 500 ? "Terjadi kesalahan pada server" : error.message;
  const name = status === 500 ? "InternalServerError" : error.name || "AppError";
  if (status === 500) console.error(error);
  return sendError(status, message, name);
};
