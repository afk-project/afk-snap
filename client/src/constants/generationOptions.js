export const generationOptions = [
  {
    id: "solo-real",
    name: "Foto Sendiri Realistis",
    description: "Potret studio realistis untuk satu orang.",
    style: "photorealistic",
    mode: "studio",
    baseCost: 2,
    extraPersonCost: 0,
    minPhotos: 1,
  },
  {
    id: "together-real",
    name: "Bersanding Realistis",
    description: "Gabungkan beberapa orang seolah berfoto di lokasi yang sama.",
    style: "photorealistic",
    mode: "group",
    baseCost: 4,
    extraPersonCost: 1,
    minPhotos: 2,
  },
  {
    id: "together-animation",
    name: "Bersanding Animasi",
    description: "Satukan semua peserta dalam ilustrasi film animasi.",
    shortDescription: "Animasi film + wajah bersamaan",
    style: "animation",
    mode: "group",
    baseCost: 5,
    extraPersonCost: 1,
    minPhotos: 2,
  },
  {
    id: "together-superhero",
    name: "Animasi Hero",
    description: "Semua peserta bersanding sebagai tim hero bergaya animasi sinematik.",
    shortDescription: "Animasi hero + foto bersamaan",
    style: "superhero",
    mode: "group",
    baseCost: 7,
    extraPersonCost: 1,
    minPhotos: 2,
  },
  {
    id: "together-80s",
    name: "80's Model",
    description: "Foto bersama ala model editorial tahun 80-an dengan grain film dan warna retro.",
    shortDescription: "Model retro 80-an + foto bersamaan",
    style: "photorealistic",
    mode: "group",
    baseCost: 6,
    extraPersonCost: 1,
    minPhotos: 2,
  },
  {
    id: "together-simpsons",
    name: "Anime Simpson",
    description: "Ubah semua peserta menjadi karakter kartun keluarga kuning dan tetap bersanding.",
    shortDescription: "Kartun kuning + wajah bersamaan",
    style: "animation",
    mode: "group",
    baseCost: 6,
    extraPersonCost: 1,
    minPhotos: 2,
  },
];

export const getGenerationOption = (id) =>
  generationOptions.find((option) => option.id === id) || generationOptions[0];

export const calculateGenerationCost = (option, photoCount) =>
  option.baseCost + Math.max(0, photoCount - 2) * option.extraPersonCost;
