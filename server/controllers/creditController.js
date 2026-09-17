const { Wallet, CreditTransaction } = require("../models");

class CreditController {
  static async balance(req, res) {
    const wallet = await Wallet.findOne({ where: { userId: req.user.id } });
    res.json({ balance: wallet?.balance || 0 });
  }

  static async transactions(req, res) {
    const wallet = await Wallet.findOne({ where: { userId: req.user.id } });
    const transactions = wallet
      ? await CreditTransaction.findAll({ where: { walletId: wallet.id }, order: [["createdAt", "DESC"]], limit: 50 })
      : [];
    res.json({ data: transactions });
  }
}

module.exports = CreditController;
