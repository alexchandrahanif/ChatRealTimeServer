"use strict"
const { Model } = require("sequelize")
const { hashingPassword } = require("../helpers/helper")
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsToMany(models.Group, {
        through: models.GroupMember,
        foreignKey: "UserId",
      })
      User.hasMany(models.Group, {
        foreignKey: "AdminId",
      })

      User.hasMany(models.GroupMember, {
        foreignKey: "UserId",
      })

      User.hasMany(models.GroupMessage, {
        foreignKey: "UserId",
        as: "PengirimGroup",
      })

      User.hasMany(models.PersonalMessage, {
        foreignKey: "SenderId",
        as: "Pengirim",
      })

      User.hasMany(models.PersonalMessage, {
        foreignKey: "ReceiverId",
        as: "Penerima",
      })

      User.hasOne(models.Contact, {
        foreignKey: "ContactId",
        as: "Contact",
      })

      User.hasMany(models.Contact, {
        foreignKey: "PemilikId",
        as: "Pemilik",
      })

      User.hasMany(models.Story, {
        foreignKey: "UserId",
        as: "Stories",
      })

      User.hasMany(models.StoryView, {
        foreignKey: "UserId",
        as: "StoryViews",
      })
    }
  }
  User.init(
    {
      username: DataTypes.STRING,
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          msg: "Email sudah terdaftar!",
        },
        validate: {
          notEmpty: {
            msg: "Email tidak boleh kosong!",
          },
          notNull: {
            msg: "Email tidak boleh kosong!",
          },
          isEmail: {
            msg: "Must Format Email",
          },
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "Password tidak boleh kosong!",
          },
          notNull: {
            msg: "Password tidak boleh kosong!",
          },
        },
      },
      phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          msg: "Nomor telepon sudah terdaftar!",
        },
        validate: {
          notEmpty: {
            msg: "Nomor telepon tidak boleh kosong!",
          },
          notNull: {
            msg: "Nomor telepon tidak boleh kosong!",
          },
        },
      },
      avatar: DataTypes.STRING,
      about: DataTypes.STRING,
      code: DataTypes.STRING,
      failed: DataTypes.INTEGER,
      expiredCode: DataTypes.DATE,
      lastLogin: DataTypes.DATE,
      isActive: DataTypes.BOOLEAN,
      statusActive: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "User",
    },
  )

  User.beforeCreate((data) => {
    data.password = hashingPassword(data.password)
  })

  return User
}
