const jwt = require("jsonwebtoken");

const secret = () => process.env.SECRET_KEY || "afksnap-development-secret-change-me";

const signToken = (payload) => jwt.sign(payload, secret(), { expiresIn: "7d" });
const verifyToken = (token) => jwt.verify(token, secret());

module.exports = { signToken, verifyToken };
