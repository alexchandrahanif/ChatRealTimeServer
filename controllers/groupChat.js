const { exclude } = require("../helpers/helper")
const { decryptRecord, decryptRecords, encryptMessage } = require("../helpers/messageCrypto")
const { User, GroupMessage, Group, GroupMember } = require("../models")
class Controller {
  // GET ALL
  static async getAllChat(req, res, next) {
    try {
      const { GroupId } = req.params

      const dataGroup = await Group.findOne({ where: { id: GroupId } })
      const member = await GroupMember.findOne({ where: { GroupId, UserId: req.user.id } })

      if (!dataGroup) {
        throw { name: "Id Group Tidak Ditemukan" }
      }

      if (!member) {
        throw { name: "Maaf Anda Bukan Anggota Group", groupName: dataGroup.name }
      }

      const dataChatGroup = await GroupMessage.findAll({
        where: {
          GroupId,
        },
        include: [
          {
            model: User,
            as: "PengirimGroup",
            attributes: {
              exclude,
            },
          },
        ],
        order: [["createdAt", "ASC"]],
      })

      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Menampilkan Chat Group",
        data: decryptRecords(dataChatGroup),
      })
    } catch (error) {
      next(error)
    }
  }

  // GET ONE
  static async getOneChat(req, res, next) {
    try {
      const { id } = req.params

      const dataChat = await GroupMessage.findOne({
        where: {
          id,
        },
        include: [
          {
            model: User,
            as: "PengirimGroup",
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
      const { GroupId, message } = req.body

      const SenderId = req.user.id

      const dataSender = await User.findOne({ where: { id: SenderId } })

      const dataGroup = await Group.findOne({ where: { id: GroupId } })
      const member = await GroupMember.findOne({ where: { GroupId, UserId: SenderId } })

      if (!dataGroup) {
        throw { name: "Id Group Tidak Ditemukan" }
      }

      if (!member) {
        throw { name: "Maaf Anda Bukan Anggota Group", groupName: dataGroup.name }
      }

      if (!dataSender) {
        throw { name: "Id User Tidak Ditemukan" }
      }

      const files = req.files?.length ? req.files : req.file ? [req.file] : []
      const images = files.map((file) => file.path)
      const payloads = images.length
        ? images.map((messageImage, index) => ({
            GroupId,
            SenderId,
            message: index === 0 ? encryptMessage(message) : encryptMessage(""),
            messageImage,
            readMessageStatus: false,
            isUpdate: false,
          }))
        : [{ GroupId, SenderId, message: encryptMessage(message), messageImage: "", readMessageStatus: false, isUpdate: false }]

      const createdChats = await GroupMessage.bulkCreate(payloads, { returning: true })
      const dataChat = createdChats[0]

      // Kirim pesan menggunakan Socket.IO
      // io.emit("chat message", { SenderId, ReceiverId, message, messageImage })

      res.status(201).json({
        statusCode: 201,
        message: "Berhasil Membuat Chat Group Baru",
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

      const dataChat = await GroupMessage.findOne({
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

      await GroupMessage.update(
        { message: encryptMessage(nextMessage), messageImage: req.body.action === "withdraw" ? "" : dataChat.messageImage, isUpdate: true },
        { where: { id } },
      )

      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Memperbaharui Chat",
      })
    } catch (error) {
      next(error)
    }
  }

  // UPDATE STATUS
  // static async updateStatusChat(req, res, next) {
  //   try {
  //     const { SenderId } = req.params

  //     const dataChat = await GroupMessage.update(
  //       { readMessageStatus: true },
  //       {
  //         where: {
  //           SenderId,
  //           ReceiverId: req.user.id,
  //         },
  //       },
  //     )

  //     await res.status(200).json({
  //       statusCode: 200,
  //       message: "Berhasil Memperbaharui Status Read Chat",
  //     })
  //   } catch (error) {
  //     next(error)
  //   }
  // }

  // DELETE
  static async deleteChat(req, res, next) {
    try {
      const { id } = req.params

      const dataChat = await GroupMessage.findOne({
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

      await GroupMessage.destroy({
        where: {
          id,
        },
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
