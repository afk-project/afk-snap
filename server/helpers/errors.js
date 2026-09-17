class AppError extends Error {
  constructor(status, message, name = "AppError") {
    super(message);
    this.status = status;
    this.name = name;
  }
}

module.exports = AppError;
