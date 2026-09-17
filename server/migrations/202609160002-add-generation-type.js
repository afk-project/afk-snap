"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("GenerationJobs", "generationType", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "solo-real",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("GenerationJobs", "generationType");
  },
};
