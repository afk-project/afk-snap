const request = require("supertest");
const app = require("../app");

describe("GET /health", () => {
  it("mengembalikan status API", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "ok", service: "AFKSnap API" });
  });
});
