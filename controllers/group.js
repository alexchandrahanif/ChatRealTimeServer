const { exclude } = require("../helpers/helper")
const remove = require("../helpers/removeFile")
const { User, Group, GroupMessage, GroupMember, Contact } = require("../models")
class Controller {
  // GET ALL
  static async getGroupPersonal(req, res, next) {
    try {
      const UserId = req.user.id
      const data = await Group.findAll({
        include: [
          {
            model: GroupMember,
            where: {
              UserId,
            },
            include: [
              {
                model: User,
                attributes: {
                  exclude,
                },
              },
            ],
          },
          {
            model: User,
            attributes: {
              exclude,
            },
          },
        ],
      })

      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Menampilkan Data Group",
        data: data,
      })
    } catch (error) {
      next(error)
    }
  }

  // GET ONE
  static async getOneGroup(req, res, next) {
    try {
      const { id } = req.params
      const data = await Group.findOne({
        where: {
          id,
        },
        include: [
          {
            model: User,
            attributes: {
              exclude,
            },
          },
        ],
      })

      if (!data) {
        throw { name: "Id Group Tidak Ditemukan" }
      }
      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Menampilkan Data Group",
        data: data,
      })
    } catch (error) {
      next(error)
    }
  }

  // CREATE
  static async createGroup(req, res, next) {
    try {
      const { name, description, MemberId } = req.body

      let body = {
        name,
        description,
        groupImage: req.file ? req.file.path : "",
        AdminId: req.user.id,
      }

      const data = await Group.create(body)

      const memberIds = Array.isArray(MemberId) ? MemberId : MemberId ? [MemberId] : []

      await Promise.all(memberIds.map((el) => {
        return GroupMember.create({
          UserId: el,
          GroupId: data.id,
          status: "MEMBER",
        })
      }))

      await GroupMember.create({
        UserId: req.user.id,
        GroupId: data.id,
        status: "ADMIN",
      })
      res.status(201).json({
        statusCode: 201,
        message: "Berhasil Membuat Group " + name,
        data: data,
      })
    } catch (error) {
      next(error)
    }
  }

  // UPDATE
  static async updateGroup(req, res, next) {
    try {
      const { id } = req.params
      const { name, description } = req.body

      const data = await Group.findOne({
        where: {
          id,
        },
      })

      if (!data) {
        throw { name: "Id Group Tidak Ditemukan" }
      }

      let body = { name, description }

      if (req.file) {
        remove(data.groupImage)
        body.groupImage = req.file.path
      }

      await Group.update(body, { where: { id } })

      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Mengubah Data Group",
      })
    } catch (error) {
      next(error)
    }
  }

  // DELETE
  static async deleteGroup(req, res, next) {
    try {
      const { id } = req.params
      const data = await Group.findOne({
        where: {
          id,
        },
      })

      if (!data) {
        throw { name: "Id Group Tidak Ditemukan" }
      }

      await Group.destroy({
        where: {
          id,
        },
      })

      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Menghapus Data Group",
      })
    } catch (error) {
      next(error)
    }
  }

  //! GET MEMBER
  static async getMember(req, res, next) {
    try {
      const { id } = req.params
      const dataMember = await GroupMember.findOne({
        where: {
          id,
        },
        include: [
          {
            model: User,
          },
          {
            model: Group,
          },
        ],
      })

      if (!dataMember) {
        throw { name: "Id Member Group Tidak Ditemukan" }
      }

      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Menampilkan Data Member",
        data: dataMember,
      })
    } catch (error) {
      next(error)
    }
  }

  //! CREATE NEW MEMBER
  static async createNewMember(req, res, next) {
    try {
      const { ContactId, GroupId } = req.body
      const dataGroup = await Group.findOne({
        where: {
          id: GroupId,
        },
      })
      const dataContact = await Contact.findOne({
        where: {
          id: ContactId,
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
          },
        ],
      })

      const dataAdmin = await GroupMember.findOne({
        where: {
          UserId: req.user.id,
          GroupId,
        },
      })

      if (!dataGroup) {
        throw { name: "Id Group Tidak Ditemukan" }
      }

      if (!dataContact) {
        throw { name: "Id Contact Tidak Ditemukan" }
      }

      if (!dataAdmin) {
        throw {
          name: "Maaf Anda Bukan Anggota Group",
          groupName: dataGroup.name,
        }
      }

      if (dataAdmin.status != "ADMIN") {
        throw {
          name: "Maaf Anda Bukan Admin Group",
          groupName: dataGroup.name,
        }
      }

      const dataMember = await GroupMember.create({
        UserId: dataContact.Teman.id,
        GroupId,
        status: "MEMBER",
      })

      res.status(201).json({
        statusCode: 201,
        message: `Berhasil Menambahkan ${dataContact.username} ke group ${dataGroup.name}`,
      })
    } catch (error) {
      next(error)
    }
  }

  //! UPDATE STATUS MEMBER
  static async updateStatusMember(req, res, next) {
    try {
      const { MemberId, GroupId } = req.params
      const { status } = req.body

      const dataGroup = await Group.findOne({
        where: {
          id: GroupId,
        },
      })
      const dataUser = await User.findOne({
        where: {
          id: MemberId,
        },
      })

      const dataAdmin = await GroupMember.findOne({
        where: {
          UserId: req.user.id,
          GroupId,
        },
      })

      if (!dataGroup) {
        throw { name: "Id Group Tidak Ditemukan" }
      }

      if (!dataUser) {
        throw { name: "Id User Tidak Ditemukan" }
      }

      if (!dataAdmin) {
        throw {
          name: "Maaf Anda Bukan Anggota Group",
          groupName: dataGroup.name,
        }
      }

      if (dataAdmin.status != "ADMIN") {
        throw {
          name: "Maaf Anda Bukan Admin Group",
          groupName: dataGroup.name,
        }
      }

      await GroupMember.update(
        { status },
        {
          where: {
            GroupId,
            UserId: MemberId,
          },
        },
      )

      res.status(200).json({
        statusCode: 200,
        message: `Berhasil Mengubah ${dataUser.username} Menjadi Admin group ${dataGroup.name}`,
      })
    } catch (error) {
      next(error)
    }
  }

  //! DELETE MEMBER
  static async deleteMember(req, res, next) {
    try {
      const { MemberId, GroupId } = req.params

      const dataGroup = await Group.findOne({
        where: {
          id: GroupId,
        },
      })
      const dataUser = await User.findOne({
        where: {
          id: MemberId,
        },
      })

      const dataAdmin = await GroupMember.findOne({
        where: {
          UserId: req.user.id,
          GroupId,
        },
      })

      if (!dataGroup) {
        throw { name: "Id Group Tidak Ditemukan" }
      }

      if (!dataUser) {
        throw { name: "Id User Tidak Ditemukan" }
      }

      if (!dataAdmin) {
        throw {
          name: "Maaf Anda Bukan Anggota Group",
          groupName: dataGroup.name,
        }
      }

      if (dataAdmin.status != "ADMIN") {
        throw {
          name: "Maaf Anda Bukan Admin Group",
          groupName: dataGroup.name,
        }
      }

      await GroupMember.destroy({
        where: {
          GroupId,
          UserId: MemberId,
        },
      })

      res.status(200).json({
        statusCode: 200,
        message: `Berhasil Menghapus ${dataUser.username} dari group ${dataGroup.name}`,
      })
    } catch (error) {
      next(error)
    }
  }

  //! LEAVE GROUP
  static async leaveGroup(req, res, next) {
    try {
      const { GroupId } = req.params

      const dataGroup = await Group.findOne({
        where: {
          id: GroupId,
        },
      })

      if (!dataGroup) {
        throw { name: "Id Group Tidak Ditemukan" }
      }

      await GroupMember.destroy({
        where: {
          GroupId,
          UserId: req.user.id,
        },
      })

      res.status(200).json({
        statusCode: 200,
        message: `Berhasil keluar dari group ${dataGroup.name}`,
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = Controller
