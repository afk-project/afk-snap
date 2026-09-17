import { getSocket, resetSocket } from "../services/socket";
import { assistantTypingUpdated, messageReceived, typingUpdated } from "../features/chatSlice";
import { generationCompleted, generationFailed, progressUpdated } from "../features/generationSlice";
import { assetAdded, assetRemoved, cameraStateChanged, participantOnline, roomExpired } from "../features/roomSlice";
import { setBalance } from "../features/walletSlice";

let listenersRegistered = false;

const emitWithAcknowledgement = (event, payload, acknowledgement) => {
  const socket = getSocket();
  if (!acknowledgement) return socket.emit(event, payload);
  socket.timeout(30000).emit(event, payload, (error, response) => {
    acknowledgement(error
      ? { ok: false, message: "Server realtime tidak merespons. Periksa apakah server berjalan lalu coba lagi." }
      : response);
  });
};

export const socketMiddleware = (store) => (next) => (action) => {
  if (action.type === "socket/connect") {
    const socket = getSocket();
    socket.auth = { token: localStorage.getItem("access_token") };
    if (!listenersRegistered) {
      socket.on("chat:message", (payload) => store.dispatch(messageReceived(payload)));
      socket.on("typing:update", (payload) => store.dispatch(typingUpdated(payload)));
      socket.on("assistant:typing", (payload) => store.dispatch(assistantTypingUpdated(payload)));
      socket.on("participant:online", (payload) => store.dispatch(participantOnline(payload)));
      socket.on("asset:added", (payload) => store.dispatch(assetAdded(payload)));
      socket.on("asset:removed", (payload) => store.dispatch(assetRemoved(payload)));
      socket.on("camera:state", (payload) => store.dispatch(cameraStateChanged(payload)));
      socket.on("room:expired", (payload) => store.dispatch(roomExpired(payload)));
      socket.on("generation:progress", (payload) => store.dispatch(progressUpdated(payload)));
      socket.on("generation:completed", (payload) => store.dispatch(generationCompleted(payload)));
      socket.on("generation:failed", (payload) => store.dispatch(generationFailed(payload)));
      socket.on("wallet:updated", ({ balance }) => store.dispatch(setBalance(balance)));
      listenersRegistered = true;
    }
    if (!socket.connected) socket.connect();
  }
  if (action.type === "socket/disconnect") {
    listenersRegistered = false;
    resetSocket();
  }
  if (action.type === "socket/joinRoom") getSocket().emit("room:join", action.payload);
  if (action.type === "socket/cameraState") getSocket().emit("camera:state", action.payload);
  if (action.type === "socket/sendMessage") emitWithAcknowledgement("chat:send", action.payload, action.meta?.ack);
  if (action.type === "socket/askAssistant") emitWithAcknowledgement("assistant:ask", action.payload, action.meta?.ack);
  if (action.type === "socket/typingStart") getSocket().emit("typing:start", action.payload);
  if (action.type === "socket/typingStop") getSocket().emit("typing:stop", action.payload);
  return next(action);
};
