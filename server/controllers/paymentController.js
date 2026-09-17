const crypto = require("crypto");
const AppError = require("../helpers/errors");
const { PaymentOrder, Wallet } = require("../models");
const { PACKAGES, createSnapTransaction, environment, getTransactionStatus, isConfigured, verifyNotification } = require("../services/midtransService");
const { applyPaymentStatus, ensurePaidOrderCredited } = require("../services/paymentSettlementService");

const publicPackages = () => Object.values(PACKAGES).map((item) => ({ ...item }));

class PaymentController {
  static async packages(_req, res) {
    res.json({ packages: publicPackages(), midtransConfigured: isConfigured(), midtransEnvironment: environment() });
  }

  static async checkout(req, res) {
    const packageInfo = PACKAGES[String(req.body.plan || "").toLowerCase()];
    if (!packageInfo || packageInfo.id === "free") throw new AppError(400, "Paket berbayar tidak valid", "ValidationError");

    const orderId = `AFKSNAP-${Date.now()}-${req.user.id}-${crypto.randomBytes(3).toString("hex")}`;
    const order = await PaymentOrder.create({
      userId: req.user.id,
      orderId,
      plan: packageInfo.id,
      amount: packageInfo.amount,
      credits: packageInfo.credits,
    });
    try {
      const snap = await createSnapTransaction({ orderId, packageInfo, user: req.user });
      await order.update({ snapToken: snap.token, redirectUrl: snap.redirectUrl });
      res.status(201).json({ order, redirectUrl: snap.redirectUrl });
    } catch (error) {
      await order.update({ status: "failed" });
      throw error;
    }
  }

  static async orders(req, res) {
    const orders = await PaymentOrder.findAll({ where: { userId: req.user.id }, order: [["createdAt", "DESC"]], limit: 20 });
    res.json({ orders });
  }

  static async notification(req, res) {
    if (!verifyNotification(req.body)) throw new AppError(401, "Signature notifikasi Midtrans tidak valid", "InvalidSignature");
    const result = await applyPaymentStatus(req.body.order_id, req.body);
    if (result.credited) req.app.get("io")?.to(`user:${result.order.userId}`).emit("wallet:updated", { balance: result.balance });
    res.json({ received: true });
  }

  static async sync(req, res) {
    const where = { userId: req.user.id };
    if (req.body.orderId) where.orderId = req.body.orderId;

    let orders = await PaymentOrder.findAll({ where, order: [["createdAt", "DESC"]], limit: req.body.orderId ? 1 : 5 });
    if (req.body.orderId && !orders.length) throw new AppError(404, "Order pembayaran tidak ditemukan", "NotFound");
    if (!req.body.orderId && !orders.length) {
      const latest = await PaymentOrder.findOne({ where: { userId: req.user.id }, order: [["createdAt", "DESC"]] });
      if (latest) orders = [latest];
    }

    const results = [];
    for (const order of orders) {
      if (order.status === "paid") {
        const repaired = await ensurePaidOrderCredited(order.orderId);
        results.push({ orderId: order.orderId, status: "paid", credited: repaired.credited, recovered: repaired.credited });
        if (repaired.credited) req.app.get("io")?.to(`user:${req.user.id}`).emit("wallet:updated", { balance: repaired.balance });
        continue;
      }
      if (!order.snapToken) continue;
      try {
        const remoteStatus = await getTransactionStatus(order.orderId);
        const applied = await applyPaymentStatus(order.orderId, remoteStatus);
        results.push({
          orderId: order.orderId,
          status: applied.order.status,
          transactionStatus: remoteStatus.transaction_status,
          paymentType: remoteStatus.payment_type,
          credited: applied.credited,
        });
        if (applied.credited) req.app.get("io")?.to(`user:${req.user.id}`).emit("wallet:updated", { balance: applied.balance });
      } catch (error) {
        if (error.status === 404) results.push({ orderId: order.orderId, status: order.status, message: "Transaksi belum tercatat di Midtrans" });
        else throw error;
      }
    }

    const wallet = await Wallet.findOne({ where: { userId: req.user.id } });
    res.json({ results, credited: results.some((item) => item.credited), status: results[0]?.status || "not_found", balance: wallet?.balance || 0 });
  }
}

module.exports = PaymentController;
