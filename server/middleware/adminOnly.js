const AppError = require("../helpers/errors");

module.exports = (req, _res, next) => {
  if (req.user?.role !== "admin") return next(new AppError(403, "Menu ini khusus admin", "Forbidden"));
  next();
};
