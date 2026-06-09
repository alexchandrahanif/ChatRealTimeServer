const Controller = require("../controllers/groupChat")
const upload = require("../helpers/multer")
const authentication = require("../middleware/authentication")

const groupChatRouter = require("express").Router()
const file = upload()

groupChatRouter.get("/personal/:GroupId", authentication, Controller.getAllChat)
groupChatRouter.get("/:id", authentication, Controller.getOneChat)
groupChatRouter.post("/", authentication, file.array("messageImage", 10), Controller.createChat)
groupChatRouter.patch("/:id", authentication, Controller.updateChat)
groupChatRouter.delete("/:id", authentication, Controller.deleteChat)

module.exports = groupChatRouter
