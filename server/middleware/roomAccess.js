const { Room, RoomMember } = require("../models");
const AppError = require("../helpers/errors");

module.exports = async (req, _res, next) => {
  const room = await Room.findByPk(req.params.roomId || req.body.roomId);
  if (!room) return next(new AppError(404, "Room tidak ditemukan", "NotFound"));
  if (room.status === "closed" || new Date(room.expiresAt).getTime() <= Date.now()) {
    if (room.status !== "closed") await room.update({ status: "closed" });
    return next(new AppError(410, "Room sudah berakhir setelah 24 jam", "RoomExpired"));
  }

  const membership = await RoomMember.findOne({ where: { roomId: room.id, userId: req.user.id } });
  if (!membership) return next(new AppError(403, "Kamu bukan anggota room ini", "Forbidden"));

  req.room = room;
  req.membership = membership;
  next();
};
