const { Op } = require("sequelize");
const { Room } = require("../models");

const ROOM_LIFETIME_MS = 24 * 60 * 60 * 1000;

const createExpiryDate = () => new Date(Date.now() + ROOM_LIFETIME_MS);

async function expireRooms(io) {
  const expiredRooms = await Room.findAll({
    where: { status: { [Op.ne]: "closed" }, expiresAt: { [Op.lte]: new Date() } },
    attributes: ["id", "expiresAt"],
  });
  if (!expiredRooms.length) return [];

  const roomIds = expiredRooms.map((room) => room.id);
  await Room.update({ status: "closed" }, { where: { id: roomIds } });
  expiredRooms.forEach((room) => io?.to(`room:${room.id}`).emit("room:expired", {
    roomId: room.id,
    expiresAt: room.expiresAt,
  }));
  return roomIds;
}

function startRoomExpiryScheduler(io) {
  expireRooms(io).catch((error) => console.error("Room expiry startup gagal:", error));
  const timer = setInterval(() => {
    expireRooms(io).catch((error) => console.error("Room expiry scheduler gagal:", error));
  }, 60 * 1000);
  timer.unref?.();
  return timer;
}

module.exports = { ROOM_LIFETIME_MS, createExpiryDate, expireRooms, startRoomExpiryScheduler };
