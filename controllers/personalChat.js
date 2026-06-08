const { Op } = require("sequelize")
const { User, PersonalMessage } = require("../models")
const { exclude } = require("../helpers/helper")
const { decryptRecord, decryptRecords, encryptMessage } = require("../helpers/messageCrypto")

class Controller {
  // GET CONVERSATIONS
  static async getConversations(req, res, next) {
    try {
      const messages = await PersonalMessage.findAll({
        where: {
          [Op.or]: [{ SenderId: req.user.id }, { ReceiverId: req.user.id }],
        },
        include: [
          {
            model: User,
            as: "Pengirim",
            attributes: { exclude },
          },
          {
            model: User,
            as: "Penerima",
            attributes: { exclude },
          },
        ],
        order: [["createdAt", "DESC"]],
      })

      const conversations = []
      const seenUserIds = new Set()

      for (const message of messages) {
        const otherUser = message.SenderId === req.user.id ? message.Penerima : message.Pengirim

        if (!otherUser || seenUserIds.has(otherUser.id)) continue

        seenUserIds.add(otherUser.id)
        conversations.push({
          user: otherUser,
          lastMessage: decryptRecord(message),
        })
      }

      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Menampilkan Conversations",
        data: conversations,
      })
    } catch (error) {
      next(error)
    }
  }

  // GET ALL
  static async getAllChat(req, res, next) {
    try {
      const { ReceiverId } = req.params

      const dataReceiver = await User.findOne({ where: { id: ReceiverId } })
      const dataSender = await User.findOne({
        where: { id: req.user.id },
      })

      if (!dataReceiver || !dataSender) {
        throw { name: "Id User Tidak Ditemukan" }
      }

      const dataChat = await PersonalMessage.findAll({
        where: {
          [Op.or]: [
            { SenderId: req.user.id, ReceiverId },
            { SenderId: ReceiverId, ReceiverId: req.user.id },
          ],
        },
        include: [
          {
            model: User,
            as: "Pengirim",
            attributes: {
              exclude,
            },
          },
          {
            model: User,
            as: "Penerima",
            attributes: {
              exclude,
            },
          },
        ],
        order: [["createdAt", "ASC"]],
      })

      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Menampilkan Chat",
        data: decryptRecords(dataChat),
      })
    } catch (error) {
      next(error)
    }
  }

  // GET ONE
  static async getOneChat(req, res, next) {
    try {
      const { id } = req.params

      const dataChat = await PersonalMessage.findOne({
        where: {
          id,
        },
        include: [
          {
            model: User,
            as: "Pengirim",
            attributes: {
              exclude,
            },
          },
          {
            model: User,
            as: "Penerima",
            attributes: {
              exclude,
            },
          },
        ],
      })

      if (!dataChat) {
        throw { name: "Id Chat Tidak Ditemukan" }
      }

      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Menampilkan Chat",
        data: decryptRecord(dataChat),
      })
    } catch (error) {
      next(error)
    }
  }

  // CREATE
  static async createChat(req, res, next) {
    try {
      let SenderId = req.user.id
      const { ReceiverId, message } = req.body
      const dataReceiver = await User.findOne({ where: { id: ReceiverId } })

      if (!dataReceiver) {
        throw { name: "Id User Tidak Ditemukan" }
      }

      let messageImage = req.file ? req.file.path : ""

      const encryptedMessage = encryptMessage(message)

      const dataChat = await PersonalMessage.create({
        SenderId,
        ReceiverId,
        message: encryptedMessage,
        messageImage: messageImage,
        readMessageStatus: false,
        isUpdate: false,
      })

      req.app.get("io")?.emit("newPersonalMessage", {
        SenderId,
        ReceiverId,
        message,
        messageImage,
        data: decryptRecord(dataChat),
      })

      res.status(201).json({
        statusCode: 201,
        message: "Berhasil Membuat Chat Baru",
        data: decryptRecord(dataChat),
      })
    } catch (error) {
      next(error)
    }
  }

  // UPDATE
  static async updateChat(req, res, next) {
    try {
      const { id } = req.params
      const { message } = req.body

      const dataChat = await PersonalMessage.findOne({
        where: {
          id,
        },
      })

      if (!dataChat) {
        throw { name: "Id Chat Tidak Ditemukan" }
      }

      if (dataChat.SenderId !== req.user.id) {
        throw { name: "Forbidden" }
      }

      const nextMessage = req.body.action === "withdraw" ? "Pesan ditarik" : message

      await PersonalMessage.update(
        { message: encryptMessage(nextMessage), messageImage: req.body.action === "withdraw" ? "" : dataChat.messageImage, isUpdate: true },
        { where: { id } },
      )

      req.app.get("io")?.emit("personalMessageUpdated", {
        id: Number(id),
        SenderId: dataChat.SenderId,
        ReceiverId: dataChat.ReceiverId,
      })

      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Memperbaharui Chat",
      })
    } catch (error) {
      next(error)
    }
  }

  // UPDATE STATUS
  static async updateStatusChat(req, res, next) {
    try {
      const { SenderId } = req.params

      const dataChat = await PersonalMessage.update(
        { readMessageStatus: true },
        {
          where: {
            SenderId,
            ReceiverId: req.user.id,
          },
        },
      )

      await res.status(200).json({
        statusCode: 200,
        message: "Berhasil Memperbaharui Status Read Chat",
      })
    } catch (error) {
      next(error)
    }
  }

  // DELETE
  static async deleteChat(req, res, next) {
    try {
      const { id } = req.params

      const dataChat = await PersonalMessage.findOne({
        where: {
          id,
        },
      })

      if (!dataChat) {
        throw { name: "Id Chat Tidak Ditemukan" }
      }

      if (dataChat.SenderId !== req.user.id) {
        throw { name: "Forbidden" }
      }

      await PersonalMessage.destroy({
        where: {
          id,
        },
      })

      req.app.get("io")?.emit("personalMessageDeleted", {
        id: Number(id),
        SenderId: dataChat.SenderId,
        ReceiverId: dataChat.ReceiverId,
      })

      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Menghapus Chat",
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = Controller
