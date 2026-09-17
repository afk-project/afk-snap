"use strict";

const bcrypt = require("bcryptjs");

const accounts = [
  {
    name: "AFKSnap Admin",
    email: "admin@afksnap.id",
    password: "Admin123!",
    role: "admin",
    balance: 100,
  },
  {
    name: "AFKSnap Demo",
    email: "demo@afksnap.id",
    password: "Demo123!",
    role: "user",
    balance: 25,
  },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const emails = accounts.map((account) => account.email);

    await queryInterface.sequelize.transaction(async (transaction) => {
      const existingUsers = await queryInterface.sequelize.query(
        `SELECT "id", "email" FROM "Users" WHERE "email" IN (:emails)`,
        { replacements: { emails }, type: Sequelize.QueryTypes.SELECT, transaction },
      );
      const existingEmails = new Set(existingUsers.map((user) => user.email));
      const now = new Date();
      const missingUsers = accounts
        .filter((account) => !existingEmails.has(account.email))
        .map((account) => ({
          name: account.name,
          email: account.email,
          password: bcrypt.hashSync(account.password, 10),
          googleId: null,
          avatarUrl: null,
          role: account.role,
          emailVerifiedAt: now,
          createdAt: now,
          updatedAt: now,
        }));

      if (missingUsers.length) {
        await queryInterface.bulkInsert("Users", missingUsers, { transaction });
      }

      const users = await queryInterface.sequelize.query(
        `SELECT "id", "email" FROM "Users" WHERE "email" IN (:emails)`,
        { replacements: { emails }, type: Sequelize.QueryTypes.SELECT, transaction },
      );
      const userIds = users.map((user) => user.id);
      const existingWallets = await queryInterface.sequelize.query(
        `SELECT "id", "userId" FROM "Wallets" WHERE "userId" IN (:userIds)`,
        { replacements: { userIds }, type: Sequelize.QueryTypes.SELECT, transaction },
      );
      const walletUserIds = new Set(existingWallets.map((wallet) => wallet.userId));
      const walletsToCreate = users
        .filter((user) => !walletUserIds.has(user.id))
        .map((user) => ({
          userId: user.id,
          balance: accounts.find((account) => account.email === user.email).balance,
          createdAt: now,
          updatedAt: now,
        }));

      if (walletsToCreate.length) {
        await queryInterface.bulkInsert("Wallets", walletsToCreate, { transaction });
      }

      const wallets = await queryInterface.sequelize.query(
        `SELECT w."id", w."userId", u."email"
         FROM "Wallets" w
         JOIN "Users" u ON u."id" = w."userId"
         WHERE u."email" IN (:emails)`,
        { replacements: { emails }, type: Sequelize.QueryTypes.SELECT, transaction },
      );
      const walletIds = wallets.map((wallet) => wallet.id);
      const existingTransactions = await queryInterface.sequelize.query(
        `SELECT "walletId" FROM "CreditTransactions"
         WHERE "walletId" IN (:walletIds) AND "referenceType" = 'SeedAccount'`,
        { replacements: { walletIds }, type: Sequelize.QueryTypes.SELECT, transaction },
      );
      const creditedWalletIds = new Set(existingTransactions.map((item) => item.walletId));
      const transactionsToCreate = wallets
        .filter((wallet) => !creditedWalletIds.has(wallet.id))
        .map((wallet) => {
          const account = accounts.find((item) => item.email === wallet.email);
          return {
            walletId: wallet.id,
            amount: account.balance,
            type: account.role === "admin" ? "admin" : "starter",
            referenceType: "SeedAccount",
            referenceId: account.email,
            description: `Credit awal akun ${account.role}`,
            createdAt: now,
            updatedAt: now,
          };
        });

      if (transactionsToCreate.length) {
        await queryInterface.bulkInsert("CreditTransactions", transactionsToCreate, { transaction });
      }
    });
  },

  async down(queryInterface) {
    const emails = accounts.map((account) => account.email);
    await queryInterface.sequelize.query(
      `DELETE FROM "Users" WHERE "email" IN (:emails)`,
      { replacements: { emails } },
    );
  },
};
