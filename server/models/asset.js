"use strict";

module.exports = (sequelize, DataTypes) => {
  const Asset = sequelize.define("Asset", {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    roomId: { type: DataTypes.INTEGER, allowNull: true },
    generationJobId: { type: DataTypes.INTEGER, allowNull: true },
    kind: { type: DataTypes.ENUM("source", "result", "export"), allowNull: false },
    url: { type: DataTypes.TEXT, allowNull: false },
    mimeType: DataTypes.STRING,
    originalName: DataTypes.STRING,
    metadata: DataTypes.JSONB,
  });

  Asset.associate = (models) => {
    Asset.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    Asset.belongsTo(models.Room, { foreignKey: "roomId", as: "room" });
    Asset.belongsTo(models.GenerationJob, { foreignKey: "generationJobId", as: "generationJob" });
  };
  return Asset;
};
