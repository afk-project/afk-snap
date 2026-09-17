require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const app = require("../app");
const registerSocket = require("../socket");
const { startRoomExpiryScheduler } = require("../services/roomExpiryService");

const port = Number(process.env.PORT || 3000);
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL?.split(",") || "http://localhost:5173", credentials: true },
});

app.set("io", io);
registerSocket(io);
startRoomExpiryScheduler(io);

server.listen(port, () => {
  console.log(`AFKSnap server berjalan di http://localhost:${port}`);
});
