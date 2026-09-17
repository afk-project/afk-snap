const { OAuth2Client } = require("google-auth-library");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { User, Wallet, PasswordResetToken, sequelize } = require("../models");
const { comparePassword } = require("../helpers/bcrypt");
const { signToken } = require("../helpers/jwt");
const AppError = require("../helpers/errors");
const { createStarterWallet } = require("../services/creditService");

const authPayload = (user, wallet) => ({
  access_token: signToken({ id: user.id, email: user.email, role: user.role }),
  user,
  credit: wallet?.balance ?? 0,
});

class AuthController {
  static async register(req, res) {
    const { name, email, password, passwordConfirmation, birthday } = req.body;
    if (!name || !email || !password) throw new AppError(400, "Nama, email, dan password wajib diisi", "ValidationError");
    if (password.length < 6) throw new AppError(400, "Password minimal 6 karakter", "ValidationError");
    if (passwordConfirmation !== password) throw new AppError(400, "Konfirmasi password tidak sama", "ValidationError");
    if (birthday && Number.isNaN(Date.parse(birthday))) throw new AppError(400, "Tanggal lahir tidak valid", "ValidationError");

    const result = await sequelize.transaction(async (transaction) => {
      const user = await User.create(
        { name: name.trim(), email: email.toLowerCase().trim(), password, birthday: birthday || null, emailVerifiedAt: new Date() },
        { transaction },
      );
      const wallet = await createStarterWallet(user.id, transaction);
      return { user, wallet };
    });
    res.status(201).json(authPayload(result.user, result.wallet));
  }

  static async login(req, res) {
    const { email, password } = req.body;
    if (!email || !password) throw new AppError(400, "Email dan password wajib diisi", "ValidationError");

    const user = await User.findOne({ where: { email: email.toLowerCase().trim() }, include: [{ model: Wallet, as: "wallet" }] });
    if (!user || !user.password || !comparePassword(password, user.password)) {
      throw new AppError(401, "Email atau password salah", "Unauthorized");
    }
    res.json(authPayload(user, user.wallet));
  }

  static async google(req, res) {
    const { credential } = req.body;
    if (!credential) throw new AppError(400, "Google credential wajib dikirim", "ValidationError");
    if (!process.env.GOOGLE_CLIENT_ID) throw new AppError(503, "Google OAuth belum dikonfigurasi", "ConfigurationError");

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const profile = ticket.getPayload();
    if (!profile?.email_verified) throw new AppError(401, "Email Google belum terverifikasi", "Unauthorized");

    const result = await sequelize.transaction(async (transaction) => {
      let user = await User.findOne({ where: { email: profile.email.toLowerCase() }, transaction });
      let wallet;
      if (!user) {
        user = await User.create(
          {
            name: profile.name,
            email: profile.email.toLowerCase(),
            googleId: profile.sub,
            avatarUrl: profile.picture,
            emailVerifiedAt: new Date(),
          },
          { transaction },
        );
        wallet = await createStarterWallet(user.id, transaction);
      } else {
        if (!user.googleId) await user.update({ googleId: profile.sub, avatarUrl: user.avatarUrl || profile.picture }, { transaction });
        wallet = await Wallet.findOne({ where: { userId: user.id }, transaction });
        if (!wallet) wallet = await createStarterWallet(user.id, transaction);
      }
      return { user, wallet };
    });

    res.json(authPayload(result.user, result.wallet));
  }

  static async forgotPassword(req, res) {
    const email = String(req.body.email || "").toLowerCase().trim();
    if (!email) throw new AppError(400, "Email wajib diisi", "ValidationError");

    const user = await User.findOne({ where: { email } });
    let devResetUrl;
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      await PasswordResetToken.destroy({ where: { userId: user.id, usedAt: null } });
      await PasswordResetToken.create({ userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) });
      const baseUrl = process.env.PASSWORD_RESET_URL || `${process.env.CLIENT_URL?.split(",")[0] || "http://localhost:5173"}/reset-password`;
      const resetUrl = `${baseUrl}?token=${encodeURIComponent(token)}`;

      // Pasang layanan email produksi di sini. Token mentah tidak pernah disimpan di database.
      if (process.env.NODE_ENV !== "production") {
        devResetUrl = resetUrl;
        console.info(`[AFKSnap] Tautan reset password untuk ${email}: ${resetUrl}`);
      }
    }

    res.json({
      message: "Jika email terdaftar, tautan reset password akan dikirim.",
      ...(devResetUrl ? { devResetUrl } : {}),
    });
  }

  static async resetPassword(req, res) {
    const { token, password, passwordConfirmation } = req.body;
    if (!token || !password) throw new AppError(400, "Token dan password baru wajib diisi", "ValidationError");
    if (password.length < 6) throw new AppError(400, "Password minimal 6 karakter", "ValidationError");
    if (password !== passwordConfirmation) throw new AppError(400, "Konfirmasi password tidak sama", "ValidationError");

    const tokenHash = crypto.createHash("sha256").update(String(token)).digest("hex");
    const resetToken = await PasswordResetToken.findOne({
      where: { tokenHash, usedAt: null, expiresAt: { [Op.gt]: new Date() } },
      include: [{ model: User, as: "user" }],
    });
    if (!resetToken?.user) throw new AppError(400, "Tautan reset tidak valid atau sudah kedaluwarsa", "InvalidResetToken");

    await sequelize.transaction(async (transaction) => {
      await resetToken.user.update({ password }, { transaction });
      await resetToken.update({ usedAt: new Date() }, { transaction });
      await PasswordResetToken.update(
        { usedAt: new Date() },
        { where: { userId: resetToken.userId, usedAt: null }, transaction },
      );
    });
    res.json({ message: "Password berhasil diperbarui. Silakan masuk kembali." });
  }
}

module.exports = AuthController;
