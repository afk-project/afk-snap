"use strict";

module.exports = (sequelize, DataTypes) => {
  const PasswordResetToken = sequelize.define("PasswordResetToken", {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    usedAt: { type: DataTypes.DATE, allowNull: true },
  });

  PasswordResetToken.associate = (models) => {
    PasswordResetToken.belongsTo(models.User, { foreignKey: "userId", as: "user" });
  };
  return PasswordResetToken;
};
