import { useEffect, useRef, useState } from "react";
import { getSocket } from "../services/socket";

const rtcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

// Mesh WebRTC satu arah per pasangan: kamera pengirim -> setiap penonton.
// Penonton mengirim "request" saat melihat kamera aktif, pengirim membalas dengan offer.
// Koneksi satu arah menghindari tabrakan offer ketika dua peserta membuka kamera bersamaan.
export default function useRoomCameraMesh({ roomId, localStream, remoteCameras }) {
  const [remoteStreams, setRemoteStreams] = useState({});
  const sendPeers = useRef(new Map());
  const recvPeers = useRef(new Map());
  const pendingCandidates = useRef(new WeakMap());
  const pendingRequests = useRef(new Set());
  const localStreamRef = useRef(localStream);

  const sendSignal = (targetSocketId, data) => {
    getSocket().emit("webrtc:signal", { roomId, targetSocketId, data });
  };

  const addCandidate = async (pc, candidate) => {
    if (!pc || !candidate) return;
    if (!pc.remoteDescription) {
      const queue = pendingCandidates.current.get(pc) || [];
      queue.push(candidate);
      pendingCandidates.current.set(pc, queue);
      return;
    }
    await pc.addIceCandidate(candidate).catch(() => {});
  };

  const flushCandidates = async (pc) => {
    const queue = pendingCandidates.current.get(pc) || [];
    pendingCandidates.current.delete(pc);
    await Promise.all(queue.map((candidate) => pc.addIceCandidate(candidate).catch(() => {})));
  };

  const closeSendPeer = (socketId) => {
    sendPeers.current.get(socketId)?.close();
    sendPeers.current.delete(socketId);
  };

  const closeRecvPeer = (socketId) => {
    recvPeers.current.get(socketId)?.close();
    recvPeers.current.delete(socketId);
    setRemoteStreams((current) => {
      if (!current[socketId]) return current;
      const next = { ...current };
      delete next[socketId];
      return next;
    });
  };

  const startSending = async (viewerSocketId) => {
    const stream = localStreamRef.current;
    if (!stream) {
      pendingRequests.current.add(viewerSocketId);
      return;
    }
    closeSendPeer(viewerSocketId);
    const pc = new RTCPeerConnection(rtcConfig);
    sendPeers.current.set(viewerSocketId, pc);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) sendSignal(viewerSocketId, { type: "candidate", role: "sender", candidate });
    };
    pc.onconnectionstatechange = () => {
      if (["failed", "closed"].includes(pc.connectionState) && sendPeers.current.get(viewerSocketId) === pc) closeSendPeer(viewerSocketId);
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignal(viewerSocketId, { type: "offer", description: pc.localDescription });
  };

  const requestStream = (cameraSocketId) => {
    closeRecvPeer(cameraSocketId);
    const pc = new RTCPeerConnection(rtcConfig);
    recvPeers.current.set(cameraSocketId, pc);
    pc.ontrack = ({ streams }) => {
      const [stream] = streams;
      if (stream && recvPeers.current.get(cameraSocketId) === pc) setRemoteStreams((current) => ({ ...current, [cameraSocketId]: stream }));
    };
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) sendSignal(cameraSocketId, { type: "candidate", role: "receiver", candidate });
    };
    sendSignal(cameraSocketId, { type: "request" });
  };

  // Simpan fungsi terbaru di ref supaya listener socket tidak perlu didaftarkan ulang tiap render.
  const handlersRef = useRef({});
  handlersRef.current = { startSending, addCandidate, flushCandidates, sendSignal };

  useEffect(() => {
    const socket = getSocket();
    const onSignal = async ({ roomId: signalRoomId, fromSocketId, data } = {}) => {
      if (Number(signalRoomId) !== Number(roomId) || !data) return;
      const handlers = handlersRef.current;
      try {
        if (data.type === "request") await handlers.startSending(fromSocketId);
        if (data.type === "offer") {
          const pc = recvPeers.current.get(fromSocketId);
          if (!pc) return;
          await pc.setRemoteDescription(data.description);
          await handlers.flushCandidates(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          handlers.sendSignal(fromSocketId, { type: "answer", description: pc.localDescription });
        }
        if (data.type === "answer") {
          const pc = sendPeers.current.get(fromSocketId);
          if (!pc) return;
          await pc.setRemoteDescription(data.description);
          await handlers.flushCandidates(pc);
        }
        if (data.type === "candidate") {
          const pc = data.role === "sender" ? recvPeers.current.get(fromSocketId) : sendPeers.current.get(fromSocketId);
          await handlers.addCandidate(pc, data.candidate);
        }
      } catch {
        // Negosiasi gagal; akan dicoba lagi saat status kamera berubah.
      }
    };
    socket.on("webrtc:signal", onSignal);
    return () => socket.off("webrtc:signal", onSignal);
  }, [roomId]);

  // Kamera lokal berubah: tutup semua koneksi kirim lama, layani request yang sempat tertunda.
  useEffect(() => {
    localStreamRef.current = localStream;
    if (!localStream) {
      [...sendPeers.current.keys()].forEach(closeSendPeer);
      return;
    }
    const waiting = [...pendingRequests.current];
    pendingRequests.current.clear();
    waiting.forEach((viewerSocketId) => handlersRef.current.startSending(viewerSocketId).catch(() => {}));
  }, [localStream]);

  // Sinkronkan koneksi terima dengan daftar kamera aktif peserta lain.
  const remoteKey = remoteCameras.map((camera) => camera.socketId).filter(Boolean).sort().join("|");
  useEffect(() => {
    const activeIds = new Set(remoteKey ? remoteKey.split("|") : []);
    [...recvPeers.current.keys()].filter((socketId) => !activeIds.has(socketId)).forEach(closeRecvPeer);
    activeIds.forEach((socketId) => {
      if (!recvPeers.current.has(socketId)) requestStream(socketId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteKey]);

  useEffect(() => () => {
    sendPeers.current.forEach((pc) => pc.close());
    recvPeers.current.forEach((pc) => pc.close());
    sendPeers.current.clear();
    recvPeers.current.clear();
    pendingRequests.current.clear();
  }, []);

  return remoteStreams;
}
