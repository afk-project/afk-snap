describe("midtrans service", () => {
  const originalKey = process.env.MIDTRANS_SERVER_KEY;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env.MIDTRANS_SERVER_KEY = "sandbox-server-key";
  });

  afterAll(() => {
    if (originalKey === undefined) delete process.env.MIDTRANS_SERVER_KEY;
    else process.env.MIDTRANS_SERVER_KEY = originalKey;
    global.fetch = originalFetch;
  });

  test("package price and credit are authoritative", () => {
    const { PACKAGES } = require("../services/midtransService");
    expect(PACKAGES.pro).toMatchObject({ amount: 200000, credits: 200 });
    expect(PACKAGES.max).toMatchObject({ amount: 650000, originalAmount: 1000000, credits: 1000 });
  });

  test("validates notification signature with SHA512", () => {
    const { notificationSignature, verifyNotification } = require("../services/midtransService");
    const payload = { order_id: "AFKSNAP-1", status_code: "200", gross_amount: "200000.00" };
    payload.signature_key = notificationSignature(payload);
    expect(verifyNotification(payload)).toBe(true);
    expect(verifyNotification({ ...payload, signature_key: `${payload.signature_key.slice(0, -1)}0` })).toBe(false);
  });

  test("status pembayaran hanya paid untuk settlement atau capture yang diterima", () => {
    const { paymentStatus } = require("../services/paymentSettlementService");
    expect(paymentStatus({ transaction_status: "settlement", status_code: "200" })).toBe("paid");
    expect(paymentStatus({ transaction_status: "capture", status_code: "200", fraud_status: "accept" })).toBe("paid");
    expect(paymentStatus({ transaction_status: "capture", status_code: "200", fraud_status: "challenge" })).toBe("pending");
    expect(paymentStatus({ transaction_status: "expire", status_code: "407" })).toBe("expired");
  });

  test("memeriksa status transaksi ke Core API Sandbox", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ order_id: "AFKSNAP-1", transaction_status: "settlement", status_code: "200" }),
    });
    const { getTransactionStatus } = require("../services/midtransService");
    const result = await getTransactionStatus("AFKSNAP-1");
    expect(result.transaction_status).toBe("settlement");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.sandbox.midtrans.com/v2/AFKSNAP-1/status",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Basic /) }) }),
    );
  });

  test("finish callback membawa order id agar saldo disinkronkan ke transaksi yang tepat", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: "snap-token", redirect_url: "https://app.sandbox.midtrans.com/snap/test" }),
    });
    const { createSnapTransaction, PACKAGES } = require("../services/midtransService");
    await createSnapTransaction({
      orderId: "AFKSNAP-ORDER-77",
      packageInfo: PACKAGES.max,
      user: { name: "Arief", email: "arief@example.com" },
    });
    const request = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(request.callbacks.finish).toContain("payment=finish&order_id=AFKSNAP-ORDER-77");
  });
});
