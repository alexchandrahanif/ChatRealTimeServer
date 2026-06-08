const { exclude } = require("../helpers/helper")
const { User, Contact } = require("../models")
class Controller {
  // GET ALL
  static async getAll(req, res, next) {
    try {
      const { limit, page, search, tanggal } = req.query

      let pagination = {
        where: {},
        include: [
          {
            model: User,
            as: "Pemilik",
            attributes: {
              exclude: exclude,
            },
          },
          {
            model: User,
            as: "Teman",
            attributes: {
              exclude: exclude,
            },
          },
        ],
        limit: limit ? limit : 50,
        order: [["username", "asc"]],
      }

      if (limit) {
        pagination.limit = limit
      }

      if (page && limit) {
        pagination.offset = (page - 1) * limit
      }

      if (search) {
        pagination.where = {
          [Op.or]: [{ username: { [Op.iLike]: `%${search}%` } }],
        }
      }

      if (tanggal) {
        const pagi = moment().format(`${tanggal} 00:00`)
        const masuk = moment().format(`${tanggal} 23:59`)
        pagination.where = {
          createdAt: {
            [Op.between]: [pagi, masuk],
          },
        }
      }

      let dataContact = await Contact.findAndCountAll(pagination)

      let totalPage = Math.ceil(dataContact.count / (limit ? limit : 50))

      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Mendapatkan Semua Data Contact",
        data: dataContact.rows,
        totaldataContact: dataContact.count,
        totalPage: totalPage,
      })
    } catch (error) {
      next(error)
    }
  }

  // GER ALL BY PERSONAL
  static async getAllPersonal(req, res, next) {
    try {
      const { id } = req.user

      const data = await User.findOne({ where: { id } })

      if (!data) {
        throw { name: "Id User Tidak Ditemukan" }
      }

      const dataContact = await Contact.findAll({
        where: {
          PemilikId: id,
        },
        include: [
          {
            model: User,
            as: "Teman",
            attributes: {
              exclude: exclude,
            },
          },
        ],
      })

      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Menampilkan Data Contact By Personal",
        data: dataContact,
      })
    } catch (error) {
      next(error)
    }
  }

  // GET ONE
  static async getOne(req, res, next) {
    try {
      const { phoneNumber } = req.params
      const data = await Contact.findOne({
        where: {
          PemilikId: req.user.id,
        },
        include: [
          {
            model: User,
            as: "Pemilik",
            attributes: {
              exclude: exclude,
            },
          },
          {
            model: User,
            as: "Teman",
            attributes: {
              exclude: exclude,
            },
            where: {
              phoneNumber: phoneNumber,
            },
          },
        ],
      })

      if (!data) {
        throw { name: "Id Contact Tidak Ditemukan" }
      }
      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Menampilkan Data Contact",
        data: data,
      })
    } catch (error) {
      next(error)
    }
  }

  // CREATE
  static async create(req, res, next) {
    try {
      const { username, phoneNumber } = req.body

      const dataTeman = await User.findOne({
        where: {
          phoneNumber,
        },
      })

      if (!dataTeman) {
        throw { name: "Nomor Telepon Tidak Terdaftar Sebagai Pengguna" }
      }

      const dataContact = await Contact.findOne({
        where: {
          PemilikId: req.user.id,
          ContactId: dataTeman.id,
        },
      })

      const dataSendiri = await User.findOne({
        where: {
          id: req.user.id,
          phoneNumber,
        },
      })

      if (dataSendiri) {
        throw { name: "Anda Tidak Bisa Menyimpan Kontak Sendiri" }
      }

      if (dataContact) {
        throw { name: "Sudah Terdaftar", username: dataContact.username }
      }

      let body = { username, ContactId: dataTeman.id, PemilikId: req.user.id }

      const data = await Contact.create(body)

      res.status(201).json({
        statusCode: 201,
        message: "Berhasil Membuat Data Contact",
        data: data,
      })
    } catch (error) {
      next(error)
    }
  }

  // UPDATE
  static async update(req, res, next) {
    try {
      const { id } = req.params
      const { username } = req.body

      let body = { username }

      const data = await Contact.findOne({
        where: {
          id,
          PemilikId: req.user.id,
        },
      })

      if (!data) {
        throw { name: "Id Contact Tidak Ditemukan" }
      }

      await Contact.update(body, { where: { id, PemilikId: req.user.id } })

      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Mengubah Data Contact",
      })
    } catch (error) {
      next(error)
    }
  }

  // DELETE
  static async delete(req, res, next) {
    try {
      const { id } = req.params
      const data = await Contact.findOne({
        where: {
          id,
          PemilikId: req.user.id,
        },
      })

      if (!data) {
        throw { name: "Id Contact Tidak Ditemukan" }
      }

      await Contact.destroy({
        where: {
          id,
          PemilikId: req.user.id,
        },
      })

      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Menghapus Data Contact",
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = Controller
