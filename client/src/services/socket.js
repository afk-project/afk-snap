import { io } from "socket.io-client";
import { serverUrl } from "./api";

let socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(serverUrl, {
      autoConnect: false,
      auth: { token: localStorage.getItem("access_token") },
    });
  }
  return socket;
};

export const resetSocket = () => {
  if (socket) socket.disconnect();
  socket = undefined;
};
