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
        const unreadCount = await PersonalMessage.count({
          where: {
            SenderId: otherUser.id,
            ReceiverId: req.user.id,
            readMessageStatus: false,
          },
        })

        conversations.push({
          user: otherUser,
          lastMessage: decryptRecord(message),
          unreadCount,
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

      const files = req.files?.length ? req.files : req.file ? [req.file] : []
      const images = files.map((file) => file.path)

      const encryptedMessage = encryptMessage(message)

      const payloads = images.length
        ? images.map((messageImage, index) => ({
            SenderId,
            ReceiverId,
            message: index === 0 ? encryptedMessage : encryptMessage(""),
            messageImage,
            readMessageStatus: false,
            isUpdate: false,
          }))
        : [{ SenderId, ReceiverId, message: encryptedMessage, messageImage: "", readMessageStatus: false, isUpdate: false }]

      const createdChats = await PersonalMessage.bulkCreate(payloads, { returning: true })
      const dataChat = createdChats[0]

      req.app.get("io")?.emit("newPersonalMessage", {
        SenderId,
        ReceiverId,
        message,
        messageImage: images[0] || "",
        data: decryptRecord(dataChat),
      })

      res.status(201).json({
        statusCode: 201,
        message: "Berhasil Membuat Chat Baru",
        data: createdChats.map(decryptRecord),
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

      if (String(dataChat.SenderId) !== String(req.user.id)) {
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

      await PersonalMessage.update(
        { readMessageStatus: true },
        {
          where: {
            SenderId,
            ReceiverId: req.user.id,
          },
        },
      )

      req.app.get("io")?.emit("personalMessageUpdated", {
        SenderId,
        ReceiverId: req.user.id,
      })

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

      if (String(dataChat.SenderId) !== String(req.user.id)) {
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
