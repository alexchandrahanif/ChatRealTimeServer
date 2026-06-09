const Controller = require("../controllers/story")
const upload = require("../helpers/multer")
const authentication = require("../middleware/authentication")

const storyRouter = require("express").Router()
const file = upload()

storyRouter.get("/", authentication, Controller.getStories)
storyRouter.post("/", authentication, file.single("image"), Controller.createStory)
storyRouter.patch("/:id/view", authentication, Controller.viewStory)
storyRouter.delete("/:id", authentication, Controller.deleteStory)

module.exports = storyRouter
