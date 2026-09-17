const { getAIStatus, localAssistantReply, resolveAIMode, resolveImageMime } = require("../services/aiService");

describe("AI configuration", () => {
  const originalMode = process.env.AI_MODE;
  const originalKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (originalMode === undefined) delete process.env.AI_MODE;
    else process.env.AI_MODE = originalMode;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  test("auto memakai OpenAI ketika API key tersedia", () => {
    process.env.AI_MODE = "auto";
    process.env.OPENAI_API_KEY = "test-key";
    expect(resolveAIMode()).toBe("openai");
    expect(getAIStatus().configured).toBe(true);
  });

  test("mock hanya aktif ketika dipilih atau API key tidak tersedia", () => {
    process.env.AI_MODE = "mock";
    process.env.OPENAI_API_KEY = "test-key";
    expect(resolveAIMode()).toBe("mock");
    process.env.AI_MODE = "auto";
    delete process.env.OPENAI_API_KEY;
    expect(resolveAIMode()).toBe("mock");
  });

  test("MIME gambar diinferensikan saat browser mengirim octet-stream", () => {
    expect(resolveImageMime({ mimetype: "application/octet-stream", originalname: "kamera.JPG" })).toBe("image/jpeg");
    expect(resolveImageMime({ mimetype: "application/octet-stream", path: "/tmp/foto.webp" })).toBe("image/webp");
  });

  test("format yang tidak didukung ditolak sebelum dikirim ke OpenAI", () => {
    expect(() => resolveImageMime({ mimetype: "application/octet-stream", originalname: "foto.heic" }))
      .toThrow("Format gambar tidak didukung");
  });

  test("asisten lokal memberi prompt sesuai konteks", () => {
    expect(localAssistantReply("buat kami jadi superhero")).toContain("pahlawan");
    expect(localAssistantReply("tema retro 80s")).toContain("80-an");
    expect(localAssistantReply("buat untuk Instagram Story")).toContain("9:16");
    expect(localAssistantReply("bagaimana cara menggunakan aplikasi?")).toContain("login");
    expect(localAssistantReply("jelaskan upgrade paket")).toContain("Rp650.000");
    expect(localAssistantReply("cara hapus foto")).toContain("tempat sampah");
    expect(localAssistantReply("buat anime simpson")).toContain("Anime Simpson");
  });
});
