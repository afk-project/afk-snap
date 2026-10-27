// Slot pertama (atas) khusus pemilik room, slot berikutnya untuk member yang join.
// Template 1 frame tidak dibagi: siapa pun bisa mengisi slot tunggalnya.
const byUploadOrder = (a, b) => Number(a.id) - Number(b.id);

export function arrangeRoomSlots(assets = [], ownerId, slotCount = 0) {
  const sorted = [...assets].sort(byUploadOrder);
  if (slotCount <= 1) return [sorted[0] || null].slice(0, slotCount);
  const ownerPhoto = sorted.find((asset) => asset.userId === ownerId) || null;
  const memberPhotos = sorted.filter((asset) => asset.userId !== ownerId);
  return [ownerPhoto, ...Array.from({ length: slotCount - 1 }, (_, index) => memberPhotos[index] || null)];
}

export function getRoomLiveSlot(assets = [], ownerId, userId, slotCount = 0) {
  if (slotCount <= 1) return 0;
  if (userId === ownerId) return 0;
  const memberSlots = slotCount - 1;
  const memberCount = assets.filter((asset) => asset.userId !== ownerId).length;
  return 1 + Math.min(memberCount, memberSlots - 1);
}

export const getRoomSlotLabel = (index, slotCount) => (slotCount <= 1 ? "Foto 1" : index === 0 ? "Admin room" : `Member ${index}`);

// Pembagian slot kamera live: pemilik room di slot atas, member sesuai urutan join di slot berikutnya.
export function assignLiveSlots(cameras = [], room, slotCount = 0) {
  if (!slotCount) return [];
  const joinOrder = (room?.memberships || []).map((member) => member.userId);
  const ordered = [...cameras].sort((a, b) => joinOrder.indexOf(a.userId) - joinOrder.indexOf(b.userId));
  const owner = ordered.find((camera) => camera.userId === room?.ownerId) || null;
  if (slotCount === 1) return [owner || ordered[0] || null];
  const members = ordered.filter((camera) => camera.userId !== room?.ownerId);
  return [owner, ...Array.from({ length: slotCount - 1 }, (_, index) => members[index] || null)];
}
