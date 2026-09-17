jest.mock("../models", () => ({
  User: { findByPk: jest.fn() },
  Room: { findByPk: jest.fn() },
  RoomMember: { findOne: jest.fn() },
  Message: { create: jest.fn() },
  Asset: { count: jest.fn() },
}));
jest.mock("../services/aiService", () => ({ assistantReply: jest.fn() }));

const { Room, RoomMember, Asset } = require("../models");
const registerSocket = require("../socket");

const createSocket = (id, user) => {
  const handlers = {};
  const rooms = new Set();
  const outgoing = [];
  return {
    id,
    user,
    data: {},
    rooms,
    outgoing,
    handshake: { auth: {}, headers: {} },
    on: jest.fn((event, handler) => { handlers[event] = handler; }),
    emit: jest.fn((event, payload) => { outgoing.push({ event, payload }); }),
    join: jest.fn((room) => rooms.add(room)),
    leave: jest.fn((room) => rooms.delete(room)),
    to: jest.fn(() => ({ emit: jest.fn() })),
    trigger: (event, payload) => new Promise((resolve, reject) => {
      const acknowledgement = (response) => resolve(response);
      Promise.resolve(handlers[event]?.(payload, acknowledgement)).catch(reject);
    }),
  };
};

const createIo = (sockets) => {
  const connectionHandlers = [];
  return {
    use: jest.fn(),
    on: jest.fn((event, handler) => {
      if (event === "connection") connectionHandlers.push(handler);
    }),
    in: jest.fn((room) => ({
      fetchSockets: async () => sockets.filter((socket) => socket.rooms.has(room)),
    })),
    to: jest.fn((room) => ({
      emit: (event, payload) => sockets
        .filter((socket) => socket.rooms.has(room))
        .forEach((socket) => socket.emit(event, payload)),
    })),
    connect: (socket) => connectionHandlers.forEach((handler) => handler(socket)),
  };
};

describe("realtime photo session", () => {
  test("owner memulai satu timer dan dua user menerima captureAt yang sama", async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    Room.findByPk.mockResolvedValue({ id: 16, ownerId: 1, status: "active", expiresAt });
    RoomMember.findOne.mockResolvedValue({ id: 1 });
    Asset.count.mockResolvedValue(0);

    const owner = createSocket("owner-socket", { id: 1, name: "Owner", role: "user" });
    const member = createSocket("member-socket", { id: 2, name: "Member", role: "user" });
    const io = createIo([owner, member]);
    registerSocket(io);
    io.connect(owner);
    io.connect(member);

    expect((await owner.trigger("room:join", { roomId: 16 })).ok).toBe(true);
    expect((await member.trigger("room:join", { roomId: 16 })).ok).toBe(true);
    expect((await owner.trigger("camera:state", { roomId: 16, active: true })).ok).toBe(true);
    expect((await member.trigger("camera:state", { roomId: 16, active: true })).ok).toBe(true);

    const startResponse = await owner.trigger("photo:sync:start", { roomId: 16, delaySeconds: 3 });
    expect(startResponse).toMatchObject({ ok: true, data: { roomId: 16, delaySeconds: 3, participantCount: 2 } });

    const ownerStart = owner.outgoing.filter((item) => item.event === "photo:sync:started").at(-1).payload;
    const memberStart = member.outgoing.filter((item) => item.event === "photo:sync:started").at(-1).payload;
    expect(ownerStart.captureAt).toBe(memberStart.captureAt);
    expect(ownerStart.sessionId).toBe(memberStart.sessionId);
    expect(ownerStart.localEligible).toBe(true);
    expect(memberStart.localEligible).toBe(true);

    expect((await owner.trigger("photo:sync:result", { roomId: 16, sessionId: ownerStart.sessionId, status: "completed", assetId: 101 })).ok).toBe(true);
    expect((await member.trigger("photo:sync:result", { roomId: 16, sessionId: ownerStart.sessionId, status: "completed", assetId: 102 })).ok).toBe(true);

    const ownerFinished = owner.outgoing.filter((item) => item.event === "photo:sync:finished").at(-1).payload;
    expect(ownerFinished.reason).toBe("all-reported");
    expect(ownerFinished.results).toHaveLength(2);
  });
});
