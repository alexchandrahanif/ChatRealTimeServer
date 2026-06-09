"use strict"
const { Model } = require("sequelize")
module.exports = (sequelize, DataTypes) => {
  class StoryView extends Model {
    static associate(models) {
      StoryView.belongsTo(models.Story, { foreignKey: "StoryId" })
      StoryView.belongsTo(models.User, { foreignKey: "UserId", as: "Viewer" })
    }
  }

  StoryView.init(
    {
      StoryId: DataTypes.UUID,
      UserId: DataTypes.UUID,
    },
    {
      sequelize,
      modelName: "StoryView",
      indexes: [{ unique: true, fields: ["StoryId", "UserId"] }],
    },
  )

  return StoryView
}
