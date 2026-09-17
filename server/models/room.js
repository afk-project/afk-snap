"use strict";

module.exports = (sequelize, DataTypes) => {
  const Room = sequelize.define("Room", {
    code: { type: DataTypes.STRING(12), allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    ownerId: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.ENUM("active", "generating", "closed"), defaultValue: "active" },
    maxParticipants: { type: DataTypes.INTEGER, defaultValue: 6, validate: { min: 2, max: 6 } },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
  });

  Room.associate = (models) => {
    Room.belongsTo(models.User, { foreignKey: "ownerId", as: "owner" });
    Room.belongsToMany(models.User, { through: models.RoomMember, foreignKey: "roomId", as: "members" });
    Room.hasMany(models.RoomMember, { foreignKey: "roomId", as: "memberships" });
    Room.hasMany(models.Message, { foreignKey: "roomId", as: "messages" });
    Room.hasMany(models.Asset, { foreignKey: "roomId", as: "assets" });
    Room.hasMany(models.GenerationJob, { foreignKey: "roomId", as: "generationJobs" });
  };
  return Room;
};
