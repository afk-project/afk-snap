"use strict";

const { hashPassword } = require("../helpers/bcrypt");

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      name: { type: DataTypes.STRING, allowNull: false },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: { msg: "Format email tidak valid" } },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: { len: { args: [6, 255], msg: "Password minimal 6 karakter" } },
      },
      googleId: { type: DataTypes.STRING, allowNull: true, unique: true },
      avatarUrl: DataTypes.TEXT,
      birthday: { type: DataTypes.DATEONLY, allowNull: true },
      avatarAnimation: { type: DataTypes.STRING, allowNull: false, defaultValue: "float" },
      plan: { type: DataTypes.STRING, allowNull: false, defaultValue: "free" },
      role: { type: DataTypes.ENUM("user", "admin"), allowNull: false, defaultValue: "user" },
      emailVerifiedAt: DataTypes.DATE,
    },
    {
      hooks: {
        beforeCreate(user) {
          if (user.password) user.password = hashPassword(user.password);
        },
        beforeUpdate(user) {
          if (user.changed("password") && user.password) user.password = hashPassword(user.password);
        },
      },
    },
  );

  User.associate = (models) => {
    User.hasOne(models.Wallet, { foreignKey: "userId", as: "wallet" });
    User.hasMany(models.Room, { foreignKey: "ownerId", as: "ownedRooms" });
    User.belongsToMany(models.Room, { through: models.RoomMember, foreignKey: "userId", as: "rooms" });
    User.hasMany(models.Message, { foreignKey: "userId", as: "messages" });
    User.hasMany(models.Asset, { foreignKey: "userId", as: "assets" });
    User.hasMany(models.GenerationJob, { foreignKey: "userId", as: "generationJobs" });
    User.hasMany(models.PasswordResetToken, { foreignKey: "userId", as: "passwordResetTokens" });
    User.hasMany(models.PaymentOrder, { foreignKey: "userId", as: "paymentOrders" });
  };

  User.prototype.toJSON = function toJSON() {
    const values = { ...this.get() };
    delete values.password;
    delete values.googleId;
    return values;
  };

  return User;
};
