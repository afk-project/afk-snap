const crypto = require("crypto");
const { verifyToken } = require("../helpers/jwt");
const { User, Room, RoomMember, Message, Asset } = require("../models");
const { assistantReply } = require("../services/aiService");

const SYNC_CAPTURE_DELAYS = new Set([3, 5, 10]);
const SYNC_CAPTURE_FINISH_GRACE_MS = 30000;

const roomChannel = (roomId) => `room:${Number(roomId)}`;

const getActiveCameraSockets = async (io, roomId) => {
  const sockets = await io.in(roomChannel(roomId)).fetchSockets();
  const uniqueUsers = new Map();

  sockets.forEach((roomSocket) => {
    const activatedAt = Number(roomSocket.data.cameraRooms?.[roomId]);
    if (!activatedAt) return;
    const userId = Number(roomSocket.user?.id);
    const current = uniqueUsers.get(userId);
    if (!current || activatedAt > current.activatedAt) uniqueUsers.set(userId, { socket: roomSocket, activatedAt });
  });

  return [...uniqueUsers.values()].map((entry) => entry.socket);
};

module.exports = (io) => {
  const activePhotoSessions = new Map();

  const finishPhotoSession = (roomId, sessionId, reason = "completed") => {
    const numericRoomId = Number(roomId);
    const session = activePhotoSessions.get(numericRoomId);
    if (!session || session.payload.sessionId !== sessionId) return;

    if (session.finishTimer) clearTimeout(session.finishTimer);
    activePhotoSessions.delete(numericRoomId);
    io.to(roomChannel(numericRoomId)).emit("photo:sync:finished", {
      roomId: numericRoomId,
      sessionId,
      reason,
      results: [...session.results.values()],
    });
  };

  io.use(async (socket, next) => {
    try {
      const raw = socket.handshake.auth?.token || socket.handshake.headers.authorization;
      const token = raw?.startsWith("Bearer ") ? raw.slice(7) : raw;
      const payload = verifyToken(token);
      const user = await User.findByPk(payload.id);
      if (!user) return next(new Error("Unauthorized"));
      socket.user = user;
      next();
    } catch (_error) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);

    socket.on("time:sync", (acknowledgement) => {
      acknowledgement?.({ serverNow: Date.now() });
    });

    socket.on("room:join", async ({ roomId } = {}, acknowledgement) => {
      try {
        const room = await Room.findByPk(roomId);
        if (!room || room.status === "closed" || new Date(room.expiresAt).getTime() <= Date.now()) throw new Error("Room sudah berakhir");
        const membership = await RoomMember.findOne({ where: { roomId, userId: socket.user.id } });
        if (!membership) throw new Error("Bukan anggota room");
        socket.join(roomChannel(roomId));
        io.to(roomChannel(roomId)).emit("participant:online", { id: socket.user.id, name: socket.user.name });

        const activeCameraSockets = await getActiveCameraSockets(io, roomId);
        activeCameraSockets.forEach((cameraSocket) => socket.emit("camera:state", {
          roomId: Number(roomId),
          userId: cameraSocket.user.id,
          name: cameraSocket.user.name,
          active: true,
        }));

        const activeSession = activePhotoSessions.get(Number(roomId));
        if (activeSession && activeSession.finishAt > Date.now()) {
          const userId = Number(socket.user.id);
          const isParticipant = activeSession.participantUserIds.has(userId);
          const alreadyReported = activeSession.results.has(userId);
          const localEligible = isParticipant && !alreadyReported;
          if (localEligible) activeSession.participantSocketIdsByUser.set(userId, socket.id);
          socket.emit("photo:sync:started", {
            ...activeSession.payload,
            serverNow: Date.now(),
            localEligible,
            alreadyReported,
          });
        }
        acknowledgement?.({ ok: true });
      } catch (error) {
        acknowledgement?.({ ok: false, message: error.message });
      }
    });

    socket.on("chat:send", async ({ roomId, content } = {}, acknowledgement) => {
      try {
        const membership = await RoomMember.findOne({ where: { roomId, userId: socket.user.id } });
        if (!membership || !content?.trim()) throw new Error("Pesan tidak valid");
        socket.join(`room:${roomId}`);
        const message = await Message.create({ roomId, userId: socket.user.id, type: "user", content: content.trim() });
        const payload = { ...message.toJSON(), user: { id: socket.user.id, name: socket.user.name, avatarUrl: socket.user.avatarUrl } };
        io.to(`room:${roomId}`).emit("chat:message", payload);
        acknowledgement?.({ ok: true, data: payload });
      } catch (error) {
        acknowledgement?.({ ok: false, message: error.message });
      }
    });

    socket.on("assistant:ask", async ({ roomId, content } = {}, acknowledgement) => {
      try {
        const membership = await RoomMember.findOne({ where: { roomId, userId: socket.user.id } });
        if (!membership || !content?.trim()) throw new Error("Pertanyaan tidak valid");
        socket.join(`room:${roomId}`);
        const question = await Message.create({ roomId, userId: socket.user.id, type: "user", content: content.trim() });
        const questionPayload = { ...question.toJSON(), user: { id: socket.user.id, name: socket.user.name, avatarUrl: socket.user.avatarUrl } };
        io.to(`room:${roomId}`).emit("chat:message", questionPayload);
        io.to(`room:${roomId}`).emit("assistant:typing", { active: true });
        const reply = await assistantReply(content.trim());
        const message = await Message.create({ roomId, type: "assistant", content: reply });
        const replyPayload = message.toJSON();
        io.to(`room:${roomId}`).emit("chat:message", replyPayload);
        io.to(`room:${roomId}`).emit("assistant:typing", { active: false });
        acknowledgement?.({ ok: true, data: replyPayload });
      } catch (error) {
        io.to(`room:${roomId}`).emit("assistant:typing", { active: false });
        acknowledgement?.({ ok: false, message: error.message });
      }
    });

    socket.on("typing:start", ({ roomId } = {}) => {
      socket.to(`room:${roomId}`).emit("typing:update", { userId: socket.user.id, name: socket.user.name, active: true });
    });
    socket.on("typing:stop", ({ roomId } = {}) => {
      socket.to(`room:${roomId}`).emit("typing:update", { userId: socket.user.id, name: socket.user.name, active: false });
    });

    socket.on("camera:state", async ({ roomId, active } = {}, acknowledgement) => {
      try {
        const membership = await RoomMember.findOne({ where: { roomId, userId: socket.user.id } });
        if (!membership) throw new Error("Bukan anggota room");
        socket.data.cameraRooms = socket.data.cameraRooms || {};
        // Timestamp membuat socket kamera terbaru yang dipilih saat user pernah reconnect/HMR.
        if (active) socket.data.cameraRooms[roomId] = Date.now();
        else delete socket.data.cameraRooms[roomId];
        io.to(roomChannel(roomId)).emit("camera:state", {
          roomId: Number(roomId),
          userId: socket.user.id,
          name: socket.user.name,
          active: Boolean(active),
        });
        acknowledgement?.({ ok: true });
      } catch (error) {
        const message = error.message || "Status kamera gagal disinkronkan";
        socket.emit("camera:error", { message });
        acknowledgement?.({ ok: false, message });
      }
    });

    socket.on("room:leave", async ({ roomId } = {}, acknowledgement) => {
      try {
        const numericRoomId = Number(roomId);
        if (!numericRoomId) throw new Error("Room tidak valid");
        if (socket.data.cameraRooms) delete socket.data.cameraRooms[numericRoomId];
        socket.leave(roomChannel(numericRoomId));

        const remainingCameras = await getActiveCameraSockets(io, numericRoomId);
        if (!remainingCameras.some((cameraSocket) => Number(cameraSocket.user.id) === Number(socket.user.id))) {
          io.to(roomChannel(numericRoomId)).emit("camera:state", {
            roomId: numericRoomId,
            userId: socket.user.id,
            name: socket.user.name,
            active: false,
          });
        }
        acknowledgement?.({ ok: true });
      } catch (error) {
        acknowledgement?.({ ok: false, message: error.message });
      }
    });

    socket.on("photo:sync:start", async ({ roomId, delaySeconds = 5 } = {}, acknowledgement) => {
      try {
        const numericRoomId = Number(roomId);
        const delay = Number(delaySeconds);
        const room = await Room.findByPk(numericRoomId);
        if (!room || room.status === "closed" || new Date(room.expiresAt).getTime() <= Date.now()) throw new Error("Room sudah berakhir");

        const membership = await RoomMember.findOne({ where: { roomId: numericRoomId, userId: socket.user.id } });
        if (!membership || (room.ownerId !== socket.user.id && socket.user.role !== "admin")) throw new Error("Hanya pemilik room yang dapat memulai timer foto bersama");
        if (!SYNC_CAPTURE_DELAYS.has(delay)) throw new Error("Timer foto bersama harus 3, 5, atau 10 detik");
        if (activePhotoSessions.has(numericRoomId)) throw new Error("Timer foto bersama masih berjalan");

        socket.join(roomChannel(numericRoomId));
        const activeCameraSockets = await getActiveCameraSockets(io, numericRoomId);
        if (!activeCameraSockets.some((cameraSocket) => cameraSocket.id === socket.id)) throw new Error("Buka kamera kamu sebelum memulai timer");
        if (activeCameraSockets.length < 2) throw new Error("Minimal 2 peserta harus membuka kamera");
        const currentPhotoCount = await Asset.count({ where: { roomId: numericRoomId, kind: "source" } });
        if (currentPhotoCount + activeCameraSockets.length > 6) {
          throw new Error(`Slot photo roll tidak cukup. Tersisa ${Math.max(0, 6 - currentPhotoCount)} slot untuk ${activeCameraSockets.length} kamera`);
        }

        const startedAt = Date.now();
        const captureAt = startedAt + (delay * 1000);
        const sessionId = `${numericRoomId}-${startedAt}-${crypto.randomUUID()}`;
        const participantSocketIdsByUser = new Map(activeCameraSockets.map((cameraSocket) => [Number(cameraSocket.user.id), cameraSocket.id]));
        const participantUserIds = new Set(participantSocketIdsByUser.keys());
        const payload = {
          roomId: numericRoomId,
          sessionId,
          delaySeconds: delay,
          startedAt,
          captureAt,
          initiatedBy: { id: socket.user.id, name: socket.user.name },
          participantCount: activeCameraSockets.length,
          participantUserIds: [...participantUserIds],
        };
        const finishAt = captureAt + SYNC_CAPTURE_FINISH_GRACE_MS;

        const session = {
          payload,
          participantSocketIdsByUser,
          participantUserIds,
          results: new Map(),
          finishAt,
          finishTimer: null,
        };
        activePhotoSessions.set(numericRoomId, session);
        const roomSockets = await io.in(roomChannel(numericRoomId)).fetchSockets();
        roomSockets.forEach((roomSocket) => roomSocket.emit("photo:sync:started", {
          ...payload,
          serverNow: Date.now(),
          localEligible: participantSocketIdsByUser.get(Number(roomSocket.user.id)) === roomSocket.id,
          alreadyReported: false,
        }));

        session.finishTimer = setTimeout(() => {
          finishPhotoSession(numericRoomId, sessionId, "timeout");
        }, finishAt - Date.now());
        session.finishTimer.unref?.();

        acknowledgement?.({ ok: true, data: payload });
      } catch (error) {
        acknowledgement?.({ ok: false, message: error.message });
      }
    });

    socket.on("photo:sync:result", async ({ roomId, sessionId, status, assetId, message } = {}, acknowledgement) => {
      try {
        const numericRoomId = Number(roomId);
        const userId = Number(socket.user.id);
        const session = activePhotoSessions.get(numericRoomId);
        if (!session || session.payload.sessionId !== sessionId) throw new Error("Sesi foto bersama sudah berakhir");
        if (!session.participantUserIds.has(userId)) throw new Error("Kamu bukan peserta sesi foto ini");
        if (!["completed", "failed"].includes(status)) throw new Error("Status hasil foto tidak valid");

        const result = {
          userId,
          name: socket.user.name,
          status,
          assetId: assetId ? Number(assetId) : null,
          message: message || null,
          reportedAt: Date.now(),
        };
        session.results.set(userId, result);
        io.to(roomChannel(numericRoomId)).emit("photo:sync:participant-result", {
          roomId: numericRoomId,
          sessionId,
          ...result,
          completedCount: session.results.size,
          participantCount: session.participantUserIds.size,
        });
        acknowledgement?.({ ok: true });

        if (session.results.size >= session.participantUserIds.size) {
          finishPhotoSession(numericRoomId, sessionId, "all-reported");
        }
      } catch (error) {
        acknowledgement?.({ ok: false, message: error.message });
      }
    });

    socket.on("disconnect", async () => {
      try {
        const cameraRoomIds = Object.keys(socket.data.cameraRooms || {}).map(Number);
        await Promise.all(cameraRoomIds.map(async (roomId) => {
          const remainingCameras = await getActiveCameraSockets(io, roomId);
          if (remainingCameras.some((cameraSocket) => cameraSocket.user.id === socket.user.id)) return;
          io.to(roomChannel(roomId)).emit("camera:state", {
            roomId,
            userId: socket.user.id,
            name: socket.user.name,
            active: false,
          });
        }));
      } catch (_error) {
        // Status kamera akan terkoreksi ketika peserta berikutnya bergabung atau memperbarui kamera.
      }
    });
  });
};
