"use strict"
const { Model } = require("sequelize")
module.exports = (sequelize, DataTypes) => {
  class Story extends Model {
    static associate(models) {
      Story.belongsTo(models.User, { foreignKey: "UserId", as: "Owner" })
      Story.hasMany(models.StoryView, { foreignKey: "StoryId", as: "Views" })
    }
  }

  Story.init(
    {
      UserId: DataTypes.UUID,
      text: DataTypes.TEXT,
      image: DataTypes.STRING,
      expiresAt: DataTypes.DATE,
    },
    { sequelize, modelName: "Story" },
  )

  return Story
}
