"use strict"
const { DataTypes } = require("sequelize")

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("StoryViews", {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: Sequelize.literal("uuid_generate_v4()"),
      },
      StoryId: {
        allowNull: false,
        type: DataTypes.UUID,
        references: { model: "Stories", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      UserId: {
        allowNull: false,
        type: DataTypes.UUID,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    })
    await queryInterface.addConstraint("StoryViews", {
      fields: ["StoryId", "UserId"],
      type: "unique",
      name: "story_views_story_user_unique",
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable("StoryViews")
  },
}
