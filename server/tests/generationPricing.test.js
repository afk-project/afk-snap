const {
  GENERATION_TYPES,
  calculateGenerationCost,
  fallbackGenerationType,
} = require("../services/generationPricing");

describe("generation pricing", () => {
  test("setiap tingkat kesulitan memiliki biaya dasar berbeda", () => {
    expect(calculateGenerationCost(GENERATION_TYPES["solo-real"], 1)).toBe(2);
    expect(calculateGenerationCost(GENERATION_TYPES["together-real"], 2)).toBe(4);
    expect(calculateGenerationCost(GENERATION_TYPES["together-animation"], 2)).toBe(5);
    expect(calculateGenerationCost(GENERATION_TYPES["together-superhero"], 2)).toBe(7);
    expect(calculateGenerationCost(GENERATION_TYPES["together-80s"], 2)).toBe(6);
    expect(calculateGenerationCost(GENERATION_TYPES["together-simpsons"], 2)).toBe(6);
  });

  test("peserta tambahan menaikkan biaya mode bersama", () => {
    expect(calculateGenerationCost(GENERATION_TYPES["together-real"], 6)).toBe(8);
    expect(calculateGenerationCost(GENERATION_TYPES["together-animation"], 6)).toBe(9);
  });

  test("request lama tetap dipetakan ke jenis generation baru", () => {
    expect(fallbackGenerationType("studio", "photorealistic")).toBe("solo-real");
    expect(fallbackGenerationType("group", "animation")).toBe("together-animation");
  });
});
