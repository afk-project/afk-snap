"use strict";

module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Template", {
    name: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: DataTypes.TEXT,
    style: { type: DataTypes.ENUM("photorealistic", "animation", "superhero"), allowNull: false },
    prompt: { type: DataTypes.TEXT, allowNull: false },
    thumbnailUrl: DataTypes.TEXT,
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
  });
};
