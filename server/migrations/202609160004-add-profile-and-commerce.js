"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "birthday", { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn("Users", "avatarAnimation", { type: Sequelize.STRING, allowNull: false, defaultValue: "float" });
    await queryInterface.addColumn("Users", "plan", { type: Sequelize.STRING, allowNull: false, defaultValue: "free" });

    await queryInterface.createTable("PasswordResetTokens", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      userId: { allowNull: false, type: Sequelize.INTEGER, references: { model: "Users", key: "id" }, onDelete: "CASCADE" },
      tokenHash: { allowNull: false, unique: true, type: Sequelize.STRING(64) },
      expiresAt: { allowNull: false, type: Sequelize.DATE },
      usedAt: { allowNull: true, type: Sequelize.DATE },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.createTable("PaymentOrders", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      userId: { allowNull: false, type: Sequelize.INTEGER, references: { model: "Users", key: "id" }, onDelete: "CASCADE" },
      orderId: { allowNull: false, unique: true, type: Sequelize.STRING },
      plan: { allowNull: false, type: Sequelize.STRING },
      amount: { allowNull: false, type: Sequelize.INTEGER },
      credits: { allowNull: false, type: Sequelize.INTEGER },
      status: { allowNull: false, type: Sequelize.STRING, defaultValue: "pending" },
      snapToken: Sequelize.TEXT,
      redirectUrl: Sequelize.TEXT,
      paidAt: Sequelize.DATE,
      rawNotification: Sequelize.JSONB,
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("PaymentOrders");
    await queryInterface.dropTable("PasswordResetTokens");
    await queryInterface.removeColumn("Users", "plan");
    await queryInterface.removeColumn("Users", "avatarAnimation");
    await queryInterface.removeColumn("Users", "birthday");
  },
};
