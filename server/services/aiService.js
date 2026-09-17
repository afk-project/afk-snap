const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const { toFile } = require("openai");

const generatedDir = path.join(__dirname, "../uploads/generated");
fs.mkdirSync(generatedDir, { recursive: true });

const resolveAIMode = () => {
  const requestedMode = (process.env.AI_MODE || "auto").toLowerCase();
  if (requestedMode === "mock") return "mock";
  if (requestedMode === "openai") return "openai";
  return process.env.OPENAI_API_KEY ? "openai" : "mock";
};

const getAIStatus = () => ({
  mode: resolveAIMode(),
  configured: Boolean(process.env.OPENAI_API_KEY),
  imageModel: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
});

const getClient = () => {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function resolveImageMime(file) {
  const declaredType = String(file.mimetype || "").toLowerCase();
  if (supportedImageTypes.has(declaredType)) return declaredType;

  const filename = file.originalname || file.path || "";
  const extension = path.extname(filename).toLowerCase();
  const inferredType = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".jfif": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  }[extension];

  if (inferredType) return inferredType;
  throw new Error(`Format gambar tidak didukung: ${declaredType || extension || "tidak diketahui"}`);
}

async function prepareOpenAIImages(files) {
  return Promise.all(files.map(async (file, index) => {
    const mimeType = resolveImageMime(file);
    const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
    const bytes = await fs.promises.readFile(file.path);
    return toFile(bytes, `afksnap-input-${index + 1}.${extension}`, { type: mimeType });
  }));
}

function formatInstruction(format) {
  if (format === "story") return "vertical 9:16 composition, leave safe margins for Instagram Story UI";
  if (format === "card") return "print-ready portrait card composition with clean border and balanced negative space";
  return "square 1:1 composition";
}

async function generateImage({ files, prompt, style, generationType, format, layout, jobId }) {
  const mode = resolveAIMode();
  if (mode === "mock") return "/generated/demo-afksnap.svg";
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY belum diisi pada server/.env. Credit sudah dikembalikan.");

  const client = getClient();
  const identityInstruction = files.length > 1
    ? "Create one seamless group portrait from all reference photos. Place every person naturally side by side in the same scene, at a consistent scale and camera angle, with shared lighting, shadows, and perspective. Preserve each person's facial identity, approximate age, skin tone, and distinguishing features. Do not create a collage and do not add or remove people."
    : "Create a polished portrait of the person in the reference photo. Preserve facial identity, approximate age, skin tone, and distinguishing features.";
  const defaultStyleInstruction = {
    photorealistic: "Professional photorealistic studio portrait with natural anatomy and realistic lighting.",
    animation: "Premium animated-film still with expressive but recognizable faces.",
    superhero: "Original cinematic superhero team; use unique non-copyrighted costume designs.",
  }[style];
  const styleInstruction = {
    "together-animation": "Turn all reference people into one cohesive premium animated-film group scene. Keep every face recognizable, keep the exact number of people, use consistent character proportions, shared lighting, and a natural side-by-side pose. Produce one scene, not a collage.",
    "together-superhero": "Transform everyone into a cohesive animated hero team with original non-copyrighted costumes, expressive recognizable faces, dynamic cinematic lighting, and a united side-by-side heroic pose.",
    "together-80s": "Create an authentic 1980s fashion editorial group portrait: everyone poses side by side as professional models, period-accurate wardrobe and hairstyles, soft flash photography, subtle 35mm film grain, pastel and neon accents, and a premium retro magazine look.",
    "together-simpsons": "Transform everyone into a cohesive satirical yellow-skinned American family-cartoon group portrait. Use bold black outlines, simple expressive features, bright flat colors, and a playful suburban setting. Keep every face recognizable through hairstyle, glasses, facial shape, and clothing cues; place everyone side by side in one scene and keep the exact number of people.",
  }[generationType] || defaultStyleInstruction;

  if (!styleInstruction) throw new Error("Preset gaya AI tidak dikenali. Credit sudah dikembalikan.");

  const images = await prepareOpenAIImages(files);

  const response = await client.images.edit({
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
    image: images,
    prompt: `${identityInstruction} ${styleInstruction} ${formatInstruction(format)} ${format === "card" ? `Design it as a ${layout}-frame photobooth strip with varied natural poses.` : ""} User direction: ${prompt || "friendly pose side by side"}`,
    size: format === "story" || format === "card" ? "1024x1536" : "1024x1024",
  });

  const base64 = response.data?.[0]?.b64_json;
  if (!base64) throw new Error("OpenAI tidak mengembalikan data gambar");
  const filename = `afksnap-${jobId}.png`;
  await fs.promises.writeFile(path.join(generatedDir, filename), Buffer.from(base64, "base64"));
  return `/uploads/generated/${filename}`;
}

function localAssistantReply(message) {
  const text = String(message || "").toLowerCase();
  if (text.includes("upgrade") || text.includes("paket") || text.includes("harga") || text.includes("credit") || text.includes("kredit") || text.includes("point")) {
    return "Paket AFKSnap: Free mendapat 10 credit awal; Pro mendapat 200 credit seharga Rp200.000; Max mendapat 1.000 credit seharga Rp650.000 (harga normal Rp1.000.000). Buka menu Upgrade, pilih paket, selesaikan pembayaran Midtrans, lalu tekan Segarkan credit jika saldo belum langsung berubah.";
  }
  if (text.includes("cara pakai") || text.includes("cara menggunakan") || text.includes("menggunakan aplikasi") || text.includes("mulai dari mana")) {
    return "Cara memakai AFKSnap: 1) login, 2) pilih Studio sendiri atau buat Room untuk foto bersama, 3) pilih 1/2/3/6 frame, 4) buka kamera atau unggah foto, 5) pilih template dan gaya AI, 6) tentukan format Feed/Card/Story, lalu 7) tekan Generate. Hasil dapat dilihat dan diunduh dari menu Kreasi.";
  }
  if (text.includes("hapus") && text.includes("foto")) {
    return "Untuk menghapus foto, arahkan kursor ke preview foto lalu tekan ikon tempat sampah. Di Room, peserta dapat menghapus foto miliknya; pemilik Room dan admin juga dapat menghapus foto peserta.";
  }
  if (text.includes("frame") || text.includes("template")) {
    return "AFKSnap menyediakan pilihan 1, 2, 3, atau 6 frame. Pilih jumlah frame lebih dulu, lalu pilih template yang tampil. Frame biasa dapat diekspor gratis; credit hanya dipakai untuk generation AI.";
  }
  if (text.includes("simpson") || text.includes("kartun kuning")) {
    return "Pilih preset Anime Simpson untuk membuat semua peserta menjadi karakter kartun keluarga berwarna kuning dalam satu adegan. Gunakan minimal dua foto wajah yang jelas dan tambahkan arahan pose bila diperlukan.";
  }
  if (text.includes("hero") || text.includes("superhero")) {
    return "Prompt yang bisa kamu pakai: jadikan semua peserta satu tim pahlawan orisinal, berdiri bersanding, wajah tetap mirip, kostum berbeda tetapi serasi, pencahayaan sinematik, dan tanpa karakter berhak cipta.";
  }
  if (text.includes("80") || text.includes("retro")) {
    return "Prompt yang bisa kamu pakai: potret grup ala editorial 80-an, semua peserta bersanding, busana retro, direct flash lembut, grain film 35mm, warna pastel-neon, dan wajah tetap dikenali.";
  }
  if (text.includes("story") || text.includes("instagram")) {
    return "Gunakan format Story 9:16, tempatkan semua wajah di area tengah, sisakan ruang aman di atas dan bawah untuk UI Instagram, lalu pilih pose bersanding yang rapi.";
  }
  if (text.includes("bareng") || text.includes("bersama") || text.includes("bersanding")) {
    return "Arahkan semua peserta menghadap kamera dan berdiri bersanding. Tambahkan instruksi: skala tubuh konsisten, cahaya dan bayangan sama, satu latar studio, bukan kolase, serta pertahankan ciri wajah masing-masing.";
  }
  return "Saya bisa membantu cara menggunakan AFKSnap, pilihan paket dan credit, pemilihan frame, penghapusan foto, atau menyusun prompt foto bersama. Contoh pertanyaan: ‘Bagaimana cara memakai AFKSnap?’";
}

async function assistantReply(message) {
  const client = getClient();
  const normalized = String(message || "").toLowerCase();
  const productHelpKeywords = ["cara pakai", "cara menggunakan", "aplikasi", "upgrade", "paket", "harga", "credit", "kredit", "point", "frame", "template", "hapus foto"];
  if (productHelpKeywords.some((keyword) => normalized.includes(keyword))) {
    return localAssistantReply(message);
  }
  if (resolveAIMode() !== "openai" || !client) {
    return localAssistantReply(message);
  }
  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini",
      instructions: "Kamu adalah asisten AFKSnap. Jawab ringkas dan akurat dalam Bahasa Indonesia. Kamu membantu penggunaan aplikasi dan prompt foto. Informasi resmi: pengguna wajib login; Free mendapat 10 credit awal; Pro 200 credit seharga Rp200.000; Max 1.000 credit seharga Rp650.000 dari harga normal Rp1.000.000; pembayaran memakai Midtrans. Alur penggunaan: pilih Studio sendiri atau Room virtual, pilih 1/2/3/6 frame, buka kamera atau unggah foto, pilih template dan preset AI, pilih format Feed/Card/Story, generate, lalu buka Kreasi untuk mengunduh. Pengguna dapat menghapus foto dari ikon tempat sampah. Room berlaku 24 jam. Jangan mengarang harga atau fitur di luar informasi ini.",
      input: message,
    });
    return response.output_text || localAssistantReply(message);
  } catch (_error) {
    // Chat tetap berguna saat quota/API OpenAI sedang tidak tersedia.
    return `${localAssistantReply(message)}\n\nMode panduan lokal aktif karena AI online sedang tidak tersedia.`;
  }
}

module.exports = { generateImage, assistantReply, getAIStatus, localAssistantReply, prepareOpenAIImages, resolveAIMode, resolveImageMime };
