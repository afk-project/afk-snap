const request = require("supertest");
const app = require("../app");

describe("error handling API", () => {
  test("endpoint privat tanpa token mengembalikan kontrak error 401", async () => {
    const response = await request(app).get("/api/users/me");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      status: 401,
      error: "Unauthorized",
      message: "Silakan login terlebih dahulu",
    });
  });

  test("JSON rusak mengembalikan error yang aman dan mudah dibaca", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      status: 400,
      error: "InvalidJson",
      message: "Format JSON request tidak valid",
    });
  });

  test("endpoint yang tidak ada mengembalikan 404 standar", async () => {
    const response = await request(app).get("/endpoint-tidak-ada");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      status: 404,
      error: "NotFound",
      message: "Endpoint tidak ditemukan",
    });
  });
});
