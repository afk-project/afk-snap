"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Users", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      name: { allowNull: false, type: Sequelize.STRING },
      email: { allowNull: false, unique: true, type: Sequelize.STRING },
      password: { allowNull: true, type: Sequelize.STRING },
      googleId: { allowNull: true, unique: true, type: Sequelize.STRING },
      avatarUrl: Sequelize.TEXT,
      role: { allowNull: false, type: Sequelize.ENUM("user", "admin"), defaultValue: "user" },
      emailVerifiedAt: Sequelize.DATE,
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.createTable("Wallets", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      userId: {
        allowNull: false,
        unique: true,
        type: Sequelize.INTEGER,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
      },
      balance: { allowNull: false, type: Sequelize.INTEGER, defaultValue: 0 },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.createTable("CreditTransactions", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      walletId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: "Wallets", key: "id" },
        onDelete: "CASCADE",
      },
      amount: { allowNull: false, type: Sequelize.INTEGER },
      type: { allowNull: false, type: Sequelize.ENUM("starter", "generation", "refund", "purchase", "admin") },
      referenceType: Sequelize.STRING,
      referenceId: Sequelize.STRING,
      description: Sequelize.STRING,
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.createTable("Rooms", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      code: { allowNull: false, unique: true, type: Sequelize.STRING(12) },
      name: { allowNull: false, type: Sequelize.STRING },
      ownerId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
      },
      status: { type: Sequelize.ENUM("active", "generating", "closed"), defaultValue: "active" },
      maxParticipants: { type: Sequelize.INTEGER, defaultValue: 6 },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.createTable("RoomMembers", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      roomId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: "Rooms", key: "id" },
        onDelete: "CASCADE",
      },
      userId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
      },
      role: { type: Sequelize.ENUM("owner", "member"), defaultValue: "member" },
      ready: { type: Sequelize.BOOLEAN, defaultValue: false },
      joinedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addConstraint("RoomMembers", {
      fields: ["roomId", "userId"],
      type: "unique",
      name: "room_members_room_user_unique",
    });

    await queryInterface.createTable("Messages", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      roomId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: "Rooms", key: "id" },
        onDelete: "CASCADE",
      },
      userId: {
        allowNull: true,
        type: Sequelize.INTEGER,
        references: { model: "Users", key: "id" },
        onDelete: "SET NULL",
      },
      type: { type: Sequelize.ENUM("user", "assistant", "system"), defaultValue: "user" },
      content: { allowNull: false, type: Sequelize.TEXT },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.createTable("GenerationJobs", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      userId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
      },
      roomId: {
        allowNull: true,
        type: Sequelize.INTEGER,
        references: { model: "Rooms", key: "id" },
        onDelete: "SET NULL",
      },
      mode: { type: Sequelize.ENUM("studio", "group"), defaultValue: "studio" },
      style: { type: Sequelize.ENUM("photorealistic", "animation", "superhero"), defaultValue: "photorealistic" },
      format: { type: Sequelize.ENUM("square", "card", "story"), defaultValue: "square" },
      layout: { allowNull: false, type: Sequelize.INTEGER, defaultValue: 2 },
      prompt: Sequelize.TEXT,
      cost: { allowNull: false, type: Sequelize.INTEGER },
      status: { type: Sequelize.ENUM("queued", "processing", "completed", "failed"), defaultValue: "queued" },
      progress: { type: Sequelize.INTEGER, defaultValue: 0 },
      resultUrl: Sequelize.TEXT,
      errorMessage: Sequelize.TEXT,
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.createTable("Assets", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      userId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
      },
      roomId: {
        allowNull: true,
        type: Sequelize.INTEGER,
        references: { model: "Rooms", key: "id" },
        onDelete: "SET NULL",
      },
      generationJobId: {
        allowNull: true,
        type: Sequelize.INTEGER,
        references: { model: "GenerationJobs", key: "id" },
        onDelete: "SET NULL",
      },
      kind: { allowNull: false, type: Sequelize.ENUM("source", "result", "export") },
      url: { allowNull: false, type: Sequelize.TEXT },
      mimeType: Sequelize.STRING,
      originalName: Sequelize.STRING,
      metadata: Sequelize.JSONB,
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.createTable("Templates", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      name: { allowNull: false, type: Sequelize.STRING },
      slug: { allowNull: false, unique: true, type: Sequelize.STRING },
      description: Sequelize.TEXT,
      style: { allowNull: false, type: Sequelize.ENUM("photorealistic", "animation", "superhero") },
      prompt: { allowNull: false, type: Sequelize.TEXT },
      thumbnailUrl: Sequelize.TEXT,
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Templates");
    await queryInterface.dropTable("Assets");
    await queryInterface.dropTable("GenerationJobs");
    await queryInterface.dropTable("Messages");
    await queryInterface.dropTable("RoomMembers");
    await queryInterface.dropTable("Rooms");
    await queryInterface.dropTable("CreditTransactions");
    await queryInterface.dropTable("Wallets");
    await queryInterface.dropTable("Users");
  },
};
