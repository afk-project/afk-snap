const GENERATION_TYPES = {
  "solo-real": { style: "photorealistic", mode: "studio", baseCost: 2, extraPersonCost: 0, minPhotos: 1 },
  "together-real": { style: "photorealistic", mode: "group", baseCost: 4, extraPersonCost: 1, minPhotos: 2 },
  "together-animation": { style: "animation", mode: "group", baseCost: 5, extraPersonCost: 1, minPhotos: 2 },
  "together-superhero": { style: "superhero", mode: "group", baseCost: 7, extraPersonCost: 1, minPhotos: 2 },
  "together-80s": { style: "photorealistic", mode: "group", baseCost: 6, extraPersonCost: 1, minPhotos: 2 },
  "together-simpsons": { style: "animation", mode: "group", baseCost: 6, extraPersonCost: 1, minPhotos: 2 },
};

function fallbackGenerationType(mode, style) {
  if (mode !== "group") return "solo-real";
  if (style === "animation") return "together-animation";
  if (style === "superhero") return "together-superhero";
  return "together-real";
}

function calculateGenerationCost(preset, photoCount) {
  return preset.baseCost + Math.max(0, photoCount - 2) * preset.extraPersonCost;
}

module.exports = { GENERATION_TYPES, fallbackGenerationType, calculateGenerationCost };
