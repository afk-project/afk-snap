const AppError = require("../helpers/errors");
const { CreditTransaction, PaymentOrder, User, Wallet, sequelize } = require("../models");

function paymentStatus(payload = {}) {
  const status = String(payload.transaction_status || "pending").toLowerCase();
  const accepted = !payload.fraud_status || payload.fraud_status === "accept";
  const successful = ["settlement", "capture"].includes(status)
    && String(payload.status_code) === "200"
    && accepted;
  if (successful) return "paid";
  return {
    pending: "pending",
    authorize: "pending",
    deny: "failed",
    cancel: "cancelled",
    expire: "expired",
    failure: "failed",
    refund: "refunded",
    partial_refund: "refunded",
  }[status] || "pending";
}

async function applyPaymentStatus(orderId, payload) {
  return sequelize.transaction(async (transaction) => {
    const order = await PaymentOrder.findOne({
      where: { orderId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!order) throw new AppError(404, "Order pembayaran tidak ditemukan", "NotFound");
    if (Number(payload.gross_amount) !== order.amount) {
      throw new AppError(400, "Nominal pembayaran tidak sesuai", "PaymentAmountMismatch");
    }

    // Lock pada order membuat webhook dan sinkronisasi manual aman dijalankan bersamaan.
    if (order.status === "paid") return { order, credited: false, balance: null };

    const status = paymentStatus(payload);
    if (status !== "paid") {
      await order.update({ status, rawNotification: payload }, { transaction });
      return { order, credited: false, balance: null };
    }

    const wallet = await Wallet.findOne({
      where: { userId: order.userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!wallet) throw new AppError(404, "Wallet pengguna tidak ditemukan", "NotFound");

    wallet.balance += order.credits;
    await wallet.save({ transaction });
    await CreditTransaction.create({
      walletId: wallet.id,
      amount: order.credits,
      type: "purchase",
      referenceType: "PaymentOrder",
      referenceId: order.orderId,
      description: `Pembelian paket ${order.plan}`,
    }, { transaction });
    await User.update({ plan: order.plan }, { where: { id: order.userId }, transaction });
    await order.update({ status: "paid", paidAt: new Date(), rawNotification: payload }, { transaction });
    return { order, credited: true, balance: wallet.balance };
  });
}

async function ensurePaidOrderCredited(orderId) {
  return sequelize.transaction(async (transaction) => {
    const order = await PaymentOrder.findOne({ where: { orderId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!order) throw new AppError(404, "Order pembayaran tidak ditemukan", "NotFound");
    if (order.status !== "paid") return { order, credited: false, balance: null };

    const wallet = await Wallet.findOne({ where: { userId: order.userId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!wallet) throw new AppError(404, "Wallet pengguna tidak ditemukan", "NotFound");
    const existingCredit = await CreditTransaction.findOne({
      where: { walletId: wallet.id, referenceType: "PaymentOrder", referenceId: order.orderId, type: "purchase" },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (existingCredit) return { order, credited: false, balance: wallet.balance };

    wallet.balance += order.credits;
    await wallet.save({ transaction });
    await CreditTransaction.create({
      walletId: wallet.id,
      amount: order.credits,
      type: "purchase",
      referenceType: "PaymentOrder",
      referenceId: order.orderId,
      description: `Pemulihan pembelian paket ${order.plan}`,
    }, { transaction });
    await User.update({ plan: order.plan }, { where: { id: order.userId }, transaction });
    return { order, credited: true, balance: wallet.balance };
  });
}

module.exports = { applyPaymentStatus, ensurePaidOrderCredited, paymentStatus };
