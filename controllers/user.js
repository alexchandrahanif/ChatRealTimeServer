const formatPhoneNumber = require("../helpers/formatPhoneNumber")
const {
  comparePassword,
  createAccessToken,
  hashingPassword,
} = require("../helpers/helper")
const emailSend = require("../helpers/nodemailer")
const { User } = require("../models")
const moment = require("moment")

const { Op } = require("sequelize")

class Controller {
  // REGISTER
  static async register(req, res, next) {
    try {
      const { username, email, password, confirmPassword, phoneNumber, about } =
        req.body

      const formattedPhoneNumber = formatPhoneNumber(phoneNumber || "")

      if (!/^\S+@\S+\.\S+$/.test(email || "")) {
        throw { name: "Format Email Tidak Valid" }
      }

      if (!/^0\d{9,14}$/.test(formattedPhoneNumber)) {
        throw { name: "Format Nomor Telepon Tidak Valid" }
      }

      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/.test(password || "")) {
        throw { name: "Format Password Tidak Valid" }
      }

      let code = Math.floor(1000 + Math.random() * 9000)

      let body = {
        username,
        email,
        password,
        phoneNumber: formattedPhoneNumber,
        about,
        code,
        failed: 0,
      }

      if (password !== confirmPassword) {
        throw { name: "Password dan Konfirmasi Password Tidak Sama" }
      }

      const message = `Kode OTP : ${code}, berlaku selama 5 menit`

      const data = await User.create(body)

      // emailSend(data, message)

      res.status(201).json({
        statusCode: 201,
        message: `Selamat ${data.username}, anda Berhasil Register`,
        data: data,
      })
    } catch (error) {
      next(error)
    }
  }

  // LOGIN
  static async login(req, res, next) {
    try {
      const { phoneNumber, password } = req.body

      const data = await User.findOne({
        where: {
          phoneNumber: formatPhoneNumber(phoneNumber || ""),
        },
      })

      if (!data) {
        throw { name: "Nomor Telepon/Password Salah" }
      }

      if (!comparePassword(password, data.password)) {
        throw { name: "Nomor Telepon/Password Salah" }
      }

      const payload = {
        id: data.id,
        email: data.email,
      }
      const authorization = createAccessToken(payload)

      res.status(201).json({
        statusCode: 201,
        message: `Selamat ${data.username}, anda Berhasil Login`,
        id: data.id,
        username: data.username,
        email: data.email,
        phoneNumber: data.phoneNumber,
        authorization: authorization,
      })
    } catch (error) {
      next(error)
    }
  }

  // GET ALL USER
  static async getAllUsers(req, res, next) {
    try {
      const { limit, page, search, tanggal } = req.query

      let pagination = {
        where: {},
        attributes: {
          exclude: ["password"],
        },
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
          [Op.or]: [
            { username: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } },
          ],
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

      let dataUser = await User.findAndCountAll(pagination)

      let totalPage = Math.ceil(dataUser.count / (limit ? limit : 50))

      // SUKSES
      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Mendapatkan Semua Data User",
        data: dataUser.rows,
        totaldataUser: dataUser.count,
        totalPage: totalPage,
      })
    } catch (error) {
      next(error)
    }
  }

  // GET ONE USER
  static async getProfile(req, res, next) {
    try {
      const { id } = req.user
      const data = await User.findOne({
        where: {
          id,
        },
        attributes: {
          exclude: ["password"],
        },
      })

      if (!data) {
        throw { name: "Id User Tidak Ditemukan" }
      }

      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Menampilkan Data User",
        data: data,
      })
    } catch (error) {
      next(error)
    }
  }

  // GET ONE USER
  static async getUser(req, res, next) {
    try {
      const { phoneNumber } = req.params
      const data = await User.findOne({
        where: {
          phoneNumber,
        },
        attributes: {
          exclude: ["password"],
        },
      })

      if (!data) {
        throw { name: "Id User Tidak Ditemukan" }
      }

      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Menampilkan Data User",
        data: data,
      })
    } catch (error) {
      next(error)
    }
  }

  // UPDATE USER
  static async updateUser(req, res, next) {
    try {
      const { id } = req.params
      const { username, about } = req.body

      const data = await User.findOne({
        where: {
          id,
        },
      })

      if (!data) {
        throw { name: "Id User Tidak Ditemukan" }
      }

      await User.update(
        { username, about, avatar: req.file ? req.file.path : "" },
        { where: { id } },
      )

      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Memperbaharui Data User",
      })
    } catch (error) {
      next(error)
    }
  }

  // UPDATE PROFILE
  static async updateProfile(req, res, next) {
    try {
      const { id } = req.user
      const {
        username,
        phoneNumber,
        about,
        currentPassword,
        newPassword,
        confirmPassword,
      } = req.body
      const formattedPhoneNumber = formatPhoneNumber(phoneNumber || "")

      if (!/^0\d{9,14}$/.test(formattedPhoneNumber)) {
        throw { name: "Format Nomor Telepon Tidak Valid" }
      }

      const data = await User.findOne({ where: { id } })

      if (!data) {
        throw { name: "Id User Tidak Ditemukan" }
      }

      const updatePayload = {
        username,
        phoneNumber: formattedPhoneNumber,
        about,
        avatar: req.file ? req.file.path : data.avatar,
      }

      if (newPassword || confirmPassword || currentPassword) {
        if (!currentPassword) {
          throw { name: "Mohon Masukkan Password Sebelumnya" }
        }

        if (!comparePassword(currentPassword, data.password)) {
          throw { name: "Password Sebelumnya Salah" }
        }

        if (newPassword !== confirmPassword) {
          throw { name: "Password dan Konfirmasi Password Tidak Sama" }
        }

        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/.test(newPassword || "")) {
          throw { name: "Format Password Tidak Valid" }
        }

        updatePayload.password = hashingPassword(newPassword)
      }

      await User.update(
        updatePayload,
        { where: { id } },
      )

      const updatedProfile = await User.findOne({
        where: { id },
        attributes: { exclude: ["password"] },
      })

      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Memperbaharui Profile",
        data: updatedProfile,
      })
    } catch (error) {
      next(error)
    }
  }

  // Verify Code
  static async verifyCode(req, res, next) {
    try {
      const { id } = req.params
      const { code } = req.body

      const data = await User.findOne({
        where: {
          id,
        },
      })

      if (!data) {
        throw { name: "Id User Tidak Ditemukan" }
      }

      if (data.code == 1) {
        throw { name: "Akun Anda Sudah Aktif" }
      }

      let kesalahan = data.failed

      const codeCreatedAt = data.createdAt
      const time1 = `${new Date().toISOString().slice(0, 10)} ${new Date()
        .toISOString()
        .slice(11, 19)}`

      const time2 = `${codeCreatedAt.toISOString().slice(0, 10)} ${codeCreatedAt
        .toISOString()
        .slice(11, 19)}`

      function DeferentTime(time1, time2) {
        const startTime = new Date(time1)
        const endTime = new Date(time2)
        const difference = endTime.getTime() - startTime.getTime()
        const resultInMinutes = Math.abs(Math.round(difference / 60000))
        return resultInMinutes
      }

      const deferent = DeferentTime(time1, time2)

      if (deferent > 5) {
        await User.destroy({
          where: {
            id,
          },
        })
        throw { name: "Maaf, Kode Anda Sudah Kadaluarsa", menit: deferent - 5 }
      }

      if (code == data.code) {
        await User.update({ isActive: true, code: 1 }, { where: { id } })
      } else {
        await User.update({ failed: kesalahan + 1 }, { where: { id } })

        const data = await User.findOne({ where: { id } })

        if (data.failed == 1) {
          throw {
            name: "Maaf, Kode Tidak Cocok",
            kesempatan: 2,
          }
        }
        if (data.failed == 2) {
          throw {
            name: "Maaf, Kode Tidak Cocok",
            kesempatan: 1,
          }
        }
        if (data.failed > 2) {
          await User.destroy({
            where: {
              id,
            },
          })

          throw {
            name: "Maaf, Kesempatan Anda Habis",
          }
        }
      }

      await res.status(200).json({
        statusCode: 200,
        message: "Berhasil Status Anda Aktif",
      })
    } catch (error) {
      next(error)
    }
  }

  // UPDATE STATUS ACTIVE USER
  static async updateStatusActiveUser(req, res, next) {
    try {
      const { id } = req.params
      const { statusActive } = req.body

      const data = await User.findOne({
        where: {
          id,
        },
      })

      if (!data) {
        throw { name: "Id User Tidak Ditemukan" }
      }

      await User.update(
        { statusActive },
        {
          where: {
            id,
          },
        },
      )

      res.status(200).json({
        statusCode: 200,
        message: `Berhasil Memperbaharui Status Active ${data.username}`,
      })
    } catch (error) {
      next(error)
    }
  }

  // DELETE USER
  static async deleteUser(req, res, next) {
    try {
      const { id } = req.params
      const data = await User.findOne({
        where: {
          id,
        },
      })

      if (!data) {
        throw { name: "Id User Tidak Ditemukan" }
      }

      await User.destroy({
        where: {
          id,
        },
      })

      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Menghapus Data User",
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = Controller
