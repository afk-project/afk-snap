"use strict";

module.exports = (sequelize, DataTypes) => {
  const GenerationJob = sequelize.define("GenerationJob", {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    roomId: { type: DataTypes.INTEGER, allowNull: true },
    generationType: { type: DataTypes.STRING, allowNull: false, defaultValue: "solo-real" },
    mode: { type: DataTypes.ENUM("studio", "group"), defaultValue: "studio" },
    style: { type: DataTypes.ENUM("photorealistic", "animation", "superhero"), defaultValue: "photorealistic" },
    format: { type: DataTypes.ENUM("square", "card", "story"), defaultValue: "square" },
    layout: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2, validate: { isIn: [[1, 2, 3, 6]] } },
    prompt: DataTypes.TEXT,
    cost: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.ENUM("queued", "processing", "completed", "failed"),
      defaultValue: "queued",
    },
    progress: { type: DataTypes.INTEGER, defaultValue: 0 },
    resultUrl: DataTypes.TEXT,
    errorMessage: DataTypes.TEXT,
  });

  GenerationJob.associate = (models) => {
    GenerationJob.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    GenerationJob.belongsTo(models.Room, { foreignKey: "roomId", as: "room" });
    GenerationJob.hasMany(models.Asset, { foreignKey: "generationJobId", as: "assets" });
  };
  return GenerationJob;
};
