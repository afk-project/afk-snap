const crypto = require("crypto");
const AppError = require("../helpers/errors");

const PACKAGES = Object.freeze({
  free: { id: "free", name: "Free", credits: 10, amount: 0, originalAmount: 0 },
  pro: { id: "pro", name: "Pro", credits: 200, amount: 200000, originalAmount: 200000 },
  max: { id: "max", name: "Max", credits: 1000, amount: 650000, originalAmount: 1000000 },
});

const snapBaseUrl = () => (
  process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://app.midtrans.com"
    : "https://app.sandbox.midtrans.com"
);

const apiBaseUrl = () => (
  process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com"
);

const serverKey = () => String(process.env.MIDTRANS_SERVER_KEY || "").trim();
const isConfigured = () => Boolean(serverKey());
const environment = () => (process.env.MIDTRANS_IS_PRODUCTION === "true" ? "production" : "sandbox");

const authorizationHeader = () => `Basic ${Buffer.from(`${serverKey()}:`).toString("base64")}`;

function notificationSignature({ order_id: orderId, status_code: statusCode, gross_amount: grossAmount }) {
  return crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey()}`)
    .digest("hex");
}

function verifyNotification(payload) {
  if (!isConfigured() || !payload?.signature_key) return false;
  const expected = notificationSignature(payload);
  const received = String(payload.signature_key);
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

async function createSnapTransaction({ orderId, packageInfo, user }) {
  if (!isConfigured()) throw new AppError(503, "Midtrans belum dikonfigurasi. Isi MIDTRANS_SERVER_KEY pada server/.env.", "ConfigurationError");

  const response = await fetch(`${snapBaseUrl()}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: authorizationHeader(),
    },
    body: JSON.stringify({
      transaction_details: { order_id: orderId, gross_amount: packageInfo.amount },
      item_details: [{
        id: `afksnap-${packageInfo.id}`,
        price: packageInfo.amount,
        quantity: 1,
        name: `AFKSnap ${packageInfo.name} - ${packageInfo.credits} credit`,
      }],
      customer_details: { first_name: user.name, email: user.email },
      callbacks: {
        finish: `${process.env.CLIENT_URL?.split(",")[0] || "http://localhost:5173"}/upgrade?payment=finish&order_id=${encodeURIComponent(orderId)}`,
      },
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.token || !data.redirect_url) {
    throw new AppError(502, data.error_messages?.join(", ") || "Midtrans gagal membuat transaksi", "PaymentGatewayError");
  }
  return { token: data.token, redirectUrl: data.redirect_url };
}

async function getTransactionStatus(orderId) {
  if (!isConfigured()) throw new AppError(503, "Midtrans belum dikonfigurasi. Isi MIDTRANS_SERVER_KEY pada server/.env.", "ConfigurationError");

  const response = await fetch(`${apiBaseUrl()}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { Accept: "application/json", Authorization: authorizationHeader() },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.status_message || data.error_messages?.join(", ") || "Status transaksi Midtrans gagal diperiksa";
    throw new AppError(response.status === 404 ? 404 : 502, message, "PaymentGatewayError");
  }
  return data;
}

module.exports = {
  PACKAGES,
  createSnapTransaction,
  getTransactionStatus,
  environment,
  isConfigured,
  notificationSignature,
  verifyNotification,
};
