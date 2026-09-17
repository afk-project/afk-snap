const AppError = require("../helpers/errors");

class UserController {
  static async me(req, res) {
    res.json({ user: req.user, credit: req.user.wallet?.balance || 0 });
  }

  static async updateMe(req, res) {
    const { name, birthday, avatarAnimation } = req.body;
    const animations = ["none", "float", "pulse", "bounce"];
    if (!name?.trim()) throw new AppError(400, "Nama wajib diisi", "ValidationError");
    if (birthday && Number.isNaN(Date.parse(birthday))) throw new AppError(400, "Tanggal lahir tidak valid", "ValidationError");
    if (avatarAnimation && !animations.includes(avatarAnimation)) throw new AppError(400, "Animasi avatar tidak valid", "ValidationError");

    await req.user.update({
      name: name.trim(),
      birthday: birthday || null,
      avatarAnimation: avatarAnimation || "none",
    });
    res.json({ user: req.user, message: "Profil berhasil diperbarui" });
  }
}

module.exports = UserController;
