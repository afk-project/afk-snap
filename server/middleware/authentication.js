const { User, Wallet } = require("../models");
const { verifyToken } = require("../helpers/jwt");
const AppError = require("../helpers/errors");

module.exports = async (req, _res, next) => {
  try {
    const [scheme, token] = (req.headers.authorization || "").split(" ");
    if (scheme !== "Bearer" || !token) throw new AppError(401, "Silakan login terlebih dahulu", "Unauthorized");

    const payload = verifyToken(token);
    const user = await User.findByPk(payload.id, { include: [{ model: Wallet, as: "wallet" }] });
    if (!user) throw new AppError(401, "Token tidak valid", "Unauthorized");

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return next(new AppError(401, "Token tidak valid atau kedaluwarsa", "Unauthorized"));
    }
    next(error);
  }
};
