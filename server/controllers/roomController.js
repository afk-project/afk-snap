const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Room, RoomMember, User, Message, Asset, sequelize } = require("../models");
const AppError = require("../helpers/errors");
const { createExpiryDate, expireRooms } = require("../services/roomExpiryService");

const roomInclude = [
  { model: User, as: "owner", attributes: ["id", "name", "avatarUrl", "avatarAnimation"] },
  {
    model: RoomMember,
    as: "memberships",
    include: [{ model: User, as: "user", attributes: ["id", "name", "avatarUrl", "avatarAnimation"] }],
  },
  {
    model: Asset,
    as: "assets",
    where: { kind: "source" },
    required: false,
    include: [{ model: User, as: "user", attributes: ["id", "name", "avatarUrl"] }],
  },
];

class RoomController {
  static async list(req, res) {
    await expireRooms(req.app.get("io"));
    const memberships = await RoomMember.findAll({ where: { userId: req.user.id }, attributes: ["roomId"] });
    const rooms = await Room.findAll({
      where: { id: memberships.map((item) => item.roomId) },
      include: roomInclude,
      order: [["updatedAt", "DESC"]],
    });
    res.json({ data: rooms });
  }

  static async create(req, res) {
    const { name, maxParticipants = 6 } = req.body;
    if (!name?.trim()) throw new AppError(400, "Nama room wajib diisi", "ValidationError");
    const parsedMax = Number(maxParticipants);
    if (parsedMax < 2 || parsedMax > 6) throw new AppError(400, "Jumlah peserta harus 2 sampai 6", "ValidationError");

    const room = await sequelize.transaction(async (transaction) => {
      const created = await Room.create(
        { name: name.trim(), maxParticipants: parsedMax, ownerId: req.user.id, code: crypto.randomBytes(4).toString("hex").toUpperCase(), expiresAt: createExpiryDate() },
        { transaction },
      );
      await RoomMember.create({ roomId: created.id, userId: req.user.id, role: "owner", ready: true }, { transaction });
      await Message.create({ roomId: created.id, type: "system", content: `${req.user.name} membuat room.` }, { transaction });
      return created;
    });
    const populated = await Room.findByPk(room.id, { include: roomInclude });
    res.status(201).json({ data: populated });
  }

  static async join(req, res) {
    await expireRooms(req.app.get("io"));
    const code = req.body.code?.trim().toUpperCase();
    if (!code) throw new AppError(400, "Kode room wajib diisi", "ValidationError");
    const room = await Room.findOne({ where: { code }, include: roomInclude });
    if (!room) throw new AppError(404, "Room tidak ditemukan", "NotFound");
    if (room.status === "closed" || new Date(room.expiresAt).getTime() <= Date.now()) throw new AppError(410, "Room sudah berakhir setelah 24 jam", "RoomExpired");

    const memberCount = room.memberships.length;
    const existing = room.memberships.find((item) => item.userId === req.user.id);
    if (!existing && memberCount >= room.maxParticipants) throw new AppError(409, "Room sudah penuh", "RoomFull");
    if (!existing) {
      await RoomMember.create({ roomId: room.id, userId: req.user.id });
      const joinMessage = await Message.create({ roomId: room.id, type: "system", content: `${req.user.name} bergabung.` });
      req.app.get("io")?.to(`room:${room.id}`).emit("chat:message", joinMessage.toJSON());
    }
    res.json({ data: await Room.findByPk(room.id, { include: roomInclude }) });
  }

  static async detail(req, res) {
    const room = await Room.findByPk(req.room.id, { include: roomInclude });
    res.json({ data: room });
  }

  static async messages(req, res) {
    const messages = await Message.findAll({
      where: { roomId: req.room.id },
      include: [{ model: User, as: "user", attributes: ["id", "name", "avatarUrl"] }],
      order: [["createdAt", "ASC"]],
      limit: 100,
    });
    res.json({ data: messages });
  }

  static async uploadPhoto(req, res) {
    if (!req.file) throw new AppError(400, "Pilih foto yang akan diunggah", "ValidationError");
    let asset;
    try {
      asset = await sequelize.transaction(async (transaction) => {
        await Room.findByPk(req.room.id, { transaction, lock: transaction.LOCK.UPDATE });
        const photoCount = await Asset.count({
          where: { roomId: req.room.id, kind: "source" },
          transaction,
        });
        if (photoCount >= 6) throw new AppError(409, "Photo roll room sudah penuh (maksimal 6 foto)", "RoomPhotoLimit");

        return Asset.create({
          userId: req.user.id,
          roomId: req.room.id,
          kind: "source",
          url: `/uploads/${path.basename(req.file.path)}`,
          mimeType: req.file.mimetype,
          originalName: req.file.originalname,
        }, { transaction });
      });
    } catch (error) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      throw error;
    }
    const populated = await Asset.findByPk(asset.id, {
      include: [{ model: User, as: "user", attributes: ["id", "name", "avatarUrl"] }],
    });
    req.app.get("io")?.to(`room:${req.room.id}`).emit("asset:added", populated.toJSON());
    res.status(201).json({ data: populated });
  }

  static async deletePhoto(req, res) {
    const asset = await Asset.findOne({
      where: { id: req.params.assetId, roomId: req.room.id, kind: "source" },
    });
    if (!asset) throw new AppError(404, "Foto room tidak ditemukan", "NotFound");
    const canDelete = asset.userId === req.user.id || req.room.ownerId === req.user.id || req.user.role === "admin";
    if (!canDelete) throw new AppError(403, "Kamu hanya dapat menghapus foto milik sendiri", "Forbidden");

    const assetId = asset.id;
    const filename = path.basename(asset.url || "");
    await asset.destroy();
    if (filename && asset.url?.startsWith("/uploads/")) {
      await fs.promises.unlink(path.join(__dirname, "../uploads", filename)).catch(() => {});
    }
    req.app.get("io")?.to(`room:${req.room.id}`).emit("asset:removed", { id: assetId });
    res.json({ message: "Foto berhasil dihapus", id: assetId });
  }
}

module.exports = RoomController;
