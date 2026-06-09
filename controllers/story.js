const { Op } = require("sequelize")
const { Contact, Story, StoryView, User } = require("../models")
const { exclude } = require("../helpers/helper")

const STORY_DURATION_MS = 24 * 60 * 60 * 1000

const cleanupExpiredStories = () => Story.destroy({ where: { expiresAt: { [Op.lte]: new Date() } } })

class Controller {
  static async getStories(req, res, next) {
    try {
      await cleanupExpiredStories()

      const myContacts = await Contact.findAll({ where: { PemilikId: req.user.id } })
      const myContactIds = myContacts.map((contact) => contact.ContactId)
      const reverseContacts = await Contact.findAll({
        where: {
          PemilikId: { [Op.in]: myContactIds },
          ContactId: req.user.id,
        },
      })
      const mutualContactIds = reverseContacts.map((contact) => contact.PemilikId)

      const stories = await Story.findAll({
        where: {
          expiresAt: { [Op.gt]: new Date() },
          [Op.or]: [{ UserId: req.user.id }, { UserId: { [Op.in]: mutualContactIds } }],
        },
        include: [
          { model: User, as: "Owner", attributes: { exclude } },
          {
            model: StoryView,
            as: "Views",
            include: [{ model: User, as: "Viewer", attributes: { exclude } }],
          },
        ],
        order: [["createdAt", "DESC"]],
      })

      const safeStories = stories.map((story) => {
        const plain = story.toJSON()
        plain.viewedByMe = String(plain.UserId) === String(req.user.id) || plain.Views.some((view) => String(view.UserId) === String(req.user.id))
        plain.viewCount = plain.Views.length
        if (String(plain.UserId) !== String(req.user.id)) {
          plain.Views = []
          plain.viewCount = undefined
        }
        return plain
      })

      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Menampilkan Story",
        data: safeStories,
      })
    } catch (error) {
      next(error)
    }
  }

  static async createStory(req, res, next) {
    try {
      const { text } = req.body
      const image = req.file ? req.file.path : ""

      if (!text?.trim() && !image) {
        throw { name: "Story Kosong" }
      }

      const story = await Story.create({
        UserId: req.user.id,
        text: text?.trim() || "",
        image,
        expiresAt: new Date(Date.now() + STORY_DURATION_MS),
      })

      req.app.get("io")?.emit("storyCreated", { UserId: req.user.id, storyId: story.id })

      res.status(201).json({
        statusCode: 201,
        message: "Berhasil Membuat Story",
        data: story,
      })
    } catch (error) {
      next(error)
    }
  }

  static async viewStory(req, res, next) {
    try {
      await cleanupExpiredStories()
      const { id } = req.params
      const story = await Story.findOne({ where: { id, expiresAt: { [Op.gt]: new Date() } } })

      if (!story) {
        throw { name: "Id Story Tidak Ditemukan" }
      }

      if (String(story.UserId) !== String(req.user.id)) {
        const mutualContact = await Contact.findOne({ where: { PemilikId: req.user.id, ContactId: story.UserId } })
        const reverseContact = await Contact.findOne({ where: { PemilikId: story.UserId, ContactId: req.user.id } })
        if (!mutualContact || !reverseContact) {
          throw { name: "Forbidden" }
        }
      }

      if (String(story.UserId) !== String(req.user.id)) {
        await StoryView.findOrCreate({
          where: { StoryId: id, UserId: req.user.id },
          defaults: { StoryId: id, UserId: req.user.id },
        })
      }

      req.app.get("io")?.emit("storyViewed", { storyId: id, UserId: req.user.id })

      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Membaca Story",
      })
    } catch (error) {
      next(error)
    }
  }

  static async deleteStory(req, res, next) {
    try {
      const { id } = req.params
      const story = await Story.findOne({ where: { id } })

      if (!story) {
        throw { name: "Id Story Tidak Ditemukan" }
      }

      if (String(story.UserId) !== String(req.user.id)) {
        throw { name: "Forbidden" }
      }

      await Story.destroy({ where: { id } })
      req.app.get("io")?.emit("storyDeleted", { storyId: id, UserId: req.user.id })

      res.status(200).json({
        statusCode: 200,
        message: "Berhasil Menghapus Story",
      })
    } catch (error) {
      next(error)
    }
  }
}

Controller.cleanupExpiredStories = cleanupExpiredStories
module.exports = Controller
