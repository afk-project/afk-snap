"use strict";

module.exports = (sequelize, DataTypes) => {
  const Wallet = sequelize.define("Wallet", {
    userId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    balance: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
  });

  Wallet.associate = (models) => {
    Wallet.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    Wallet.hasMany(models.CreditTransaction, { foreignKey: "walletId", as: "transactions" });
  };
  return Wallet;
};
