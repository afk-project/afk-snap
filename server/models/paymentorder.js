"use strict";

module.exports = (sequelize, DataTypes) => {
  const PaymentOrder = sequelize.define("PaymentOrder", {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    orderId: { type: DataTypes.STRING, allowNull: false, unique: true },
    plan: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    credits: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" },
    snapToken: DataTypes.TEXT,
    redirectUrl: DataTypes.TEXT,
    paidAt: DataTypes.DATE,
    rawNotification: DataTypes.JSONB,
  });

  PaymentOrder.associate = (models) => {
    PaymentOrder.belongsTo(models.User, { foreignKey: "userId", as: "user" });
  };
  return PaymentOrder;
};
