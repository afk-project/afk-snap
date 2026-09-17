"use strict";

module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define("Message", {
    roomId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    type: { type: DataTypes.ENUM("user", "assistant", "system"), defaultValue: "user" },
    content: { type: DataTypes.TEXT, allowNull: false, validate: { notEmpty: true } },
  });

  Message.associate = (models) => {
    Message.belongsTo(models.Room, { foreignKey: "roomId", as: "room" });
    Message.belongsTo(models.User, { foreignKey: "userId", as: "user" });
  };
  return Message;
};
