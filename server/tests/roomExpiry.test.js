const { ROOM_LIFETIME_MS, createExpiryDate } = require("../services/roomExpiryService");

describe("room expiry", () => {
  test("room baru berakhir sekitar 24 jam", () => {
    const before = Date.now();
    const expiresAt = createExpiryDate().getTime();
    expect(expiresAt - before).toBeGreaterThanOrEqual(ROOM_LIFETIME_MS - 50);
    expect(expiresAt - before).toBeLessThanOrEqual(ROOM_LIFETIME_MS + 50);
  });
});
