"use strict";

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert("Templates", [
      {
        name: "Studio Hangat",
        slug: "studio-hangat",
        description: "Potret studio natural dengan pencahayaan lembut.",
        style: "photorealistic",
        prompt: "Photorealistic professional studio portrait, warm softbox lighting, natural skin texture, coherent pose, premium editorial photography.",
        thumbnailUrl: "/generated/demo-afksnap.svg",
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Animasi Ceria",
        slug: "animasi-ceria",
        description: "Ilustrasi animasi yang cerah dan ramah.",
        style: "animation",
        prompt: "Polished colorful animation still, expressive friendly faces, soft cinematic lighting, preserve each person's recognizable features.",
        thumbnailUrl: "/generated/demo-afksnap.svg",
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Tim Superhero",
        slug: "tim-superhero",
        description: "Foto kelompok bergaya tim superhero sinematik.",
        style: "superhero",
        prompt: "Cinematic original superhero team portrait, unique non-copyrighted costumes, heroic stance, dramatic rim light, preserve identities.",
        thumbnailUrl: "/generated/demo-afksnap.svg",
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("Templates", { slug: ["studio-hangat", "animasi-ceria", "tim-superhero"] });
  },
};
