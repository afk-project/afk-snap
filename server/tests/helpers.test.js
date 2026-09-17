const { hashPassword, comparePassword } = require("../helpers/bcrypt");
const { signToken, verifyToken } = require("../helpers/jwt");

describe("authentication helpers", () => {
  it("hash dan membandingkan password", () => {
    const hash = hashPassword("rahasia123");
    expect(hash).not.toBe("rahasia123");
    expect(comparePassword("rahasia123", hash)).toBe(true);
  });

  it("membuat dan membaca JWT", () => {
    const token = signToken({ id: 7 });
    expect(verifyToken(token).id).toBe(7);
  });
});
