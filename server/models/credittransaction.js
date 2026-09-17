"use strict";

module.exports = (sequelize, DataTypes) => {
  const CreditTransaction = sequelize.define("CreditTransaction", {
    walletId: { type: DataTypes.INTEGER, allowNull: false },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    type: {
      type: DataTypes.ENUM("starter", "generation", "refund", "purchase", "admin"),
      allowNull: false,
    },
    referenceType: DataTypes.STRING,
    referenceId: DataTypes.STRING,
    description: DataTypes.STRING,
  });

  CreditTransaction.associate = (models) => {
    CreditTransaction.belongsTo(models.Wallet, { foreignKey: "walletId", as: "wallet" });
  };
  return CreditTransaction;
};
