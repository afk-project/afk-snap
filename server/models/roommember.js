"use strict";

module.exports = (sequelize, DataTypes) => {
  const RoomMember = sequelize.define(
    "RoomMember",
    {
      roomId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      role: { type: DataTypes.ENUM("owner", "member"), defaultValue: "member" },
      ready: { type: DataTypes.BOOLEAN, defaultValue: false },
      joinedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    { indexes: [{ unique: true, fields: ["roomId", "userId"] }] },
  );

  RoomMember.associate = (models) => {
    RoomMember.belongsTo(models.Room, { foreignKey: "roomId", as: "room" });
    RoomMember.belongsTo(models.User, { foreignKey: "userId", as: "user" });
  };
  return RoomMember;
};
