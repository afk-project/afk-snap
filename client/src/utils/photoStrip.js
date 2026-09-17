const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error("Aset foto atau template gagal dimuat"));
  image.src = src;
});

const drawCover = (context, image, x, y, width, height) => {
  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
};

export async function downloadPhotoStrip({ photos, template, filename = "afksnap-photobooth" }) {
  if (!photos.length) throw new Error("Ambil atau unggah minimal satu foto terlebih dahulu");
  const canvas = document.createElement("canvas");
  canvas.width = template.canvas?.width || 1080;
  canvas.height = template.canvas?.height || 1920;
  const context = canvas.getContext("2d");
  context.fillStyle = "#0f172a";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const loadedPhotos = await Promise.all(photos.slice(0, template.slots.length).map(loadImage));
  const drawPhotos = () => template.slots.forEach((slot, index) => {
    const image = loadedPhotos[index % loadedPhotos.length];
    drawCover(
      context,
      image,
      (slot.x / 100) * canvas.width,
      (slot.y / 100) * canvas.height,
      (slot.width / 100) * canvas.width,
      (slot.height / 100) * canvas.height,
    );
  });

  const frame = await loadImage(template.src);
  if (template.photoLayer === "above") {
    context.drawImage(frame, 0, 0, canvas.width, canvas.height);
    drawPhotos();
  } else {
    drawPhotos();
    context.drawImage(frame, 0, 0, canvas.width, canvas.height);
  }
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));
  if (!blob) throw new Error("Photo strip gagal dibuat");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.png`;
  link.click();
  URL.revokeObjectURL(url);
}
