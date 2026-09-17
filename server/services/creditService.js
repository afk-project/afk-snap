const { Wallet, CreditTransaction } = require("../models");
const AppError = require("../helpers/errors");

const STARTER_CREDITS = Number(process.env.STARTER_CREDITS || 10);

async function createStarterWallet(userId, transaction) {
  const wallet = await Wallet.create({ userId, balance: STARTER_CREDITS }, { transaction });
  await CreditTransaction.create(
    {
      walletId: wallet.id,
      amount: STARTER_CREDITS,
      type: "starter",
      description: "Bonus credit pengguna baru",
    },
    { transaction },
  );
  return wallet;
}

async function charge(userId, amount, referenceId, transaction) {
  const wallet = await Wallet.findOne({ where: { userId }, transaction, lock: transaction.LOCK.UPDATE });
  if (!wallet || wallet.balance < amount) {
    throw new AppError(402, "Credit tidak cukup. Silakan isi ulang credit.", "InsufficientCredit");
  }
  wallet.balance -= amount;
  await wallet.save({ transaction });
  await CreditTransaction.create(
    {
      walletId: wallet.id,
      amount: -amount,
      type: "generation",
      referenceType: "GenerationJob",
      referenceId: String(referenceId),
      description: "Generate foto AI",
    },
    { transaction },
  );
  return wallet;
}

async function refund(userId, amount, referenceId) {
  const wallet = await Wallet.findOne({ where: { userId } });
  if (!wallet) return null;
  await wallet.increment("balance", { by: amount });
  await CreditTransaction.create({
    walletId: wallet.id,
    amount,
    type: "refund",
    referenceType: "GenerationJob",
    referenceId: String(referenceId),
    description: "Pengembalian credit karena proses gagal",
  });
  return wallet.reload();
}

module.exports = { STARTER_CREDITS, createStarterWallet, charge, refund };
