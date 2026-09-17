import { assetUrl } from "../services/api";

const dimensions = {
  square: [1080, 1080],
  card: [1200, 1800],
  story: [1080, 1920],
};

const loadImage = (source) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = reject;
  image.src = source;
});

export const downloadImage = async (url, filename = "afksnap-result", format = "square") => {
  const response = await fetch(assetUrl(url));
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const image = await loadImage(objectUrl);
  const [width, height] = dimensions[format] || dimensions.square;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  const padding = format === "card" ? 60 : 0;
  const targetWidth = width - padding * 2;
  const targetHeight = height - padding * 2;
  const scale = format === "card"
    ? Math.min(targetWidth / image.width, targetHeight / image.height)
    : Math.max(targetWidth / image.width, targetHeight / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  const output = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));
  const outputUrl = URL.createObjectURL(output);
  const link = document.createElement("a");
  link.href = outputUrl;
  link.download = `${filename}-${format}.png`;
  link.click();
  URL.revokeObjectURL(objectUrl);
  URL.revokeObjectURL(outputUrl);
};

export const printImage = (url) => {
  const popup = window.open("", "_blank", "width=900,height=900");
  if (!popup) return;
  popup.document.write(`<html><head><title>Cetak AFKSnap</title><style>body{margin:0;display:grid;place-items:center;min-height:100vh}img{max-width:100%;max-height:100vh;object-fit:contain}@media print{img{width:100%}}</style></head><body><img src="${assetUrl(url)}" onload="window.print()" /></body></html>`);
  popup.document.close();
};
