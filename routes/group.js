const Controller = require("../controllers/group")
const upload = require("../helpers/multer")
const authentication = require("../middleware/authentication")

const groupRouter = require("express").Router()
const file = upload()

// MEMBER
groupRouter.get("/member/:id", authentication, Controller.getMember)
groupRouter.post("/member", authentication, Controller.createNewMember)
groupRouter.patch(
  "/member/:GroupId/:MemberId",
  authentication,
  Controller.updateStatusMember,
)
groupRouter.delete(
  "/member/leave/:GroupId",
  authentication,
  Controller.leaveGroup,
)

groupRouter.delete(
  "/member/:GroupId/:MemberId",
  authentication,
  Controller.deleteMember,
)

// GROUP
groupRouter.get("/personal", authentication, Controller.getGroupPersonal)
groupRouter.get("/:id", authentication, Controller.getOneGroup)
groupRouter.post("/", authentication, file.single("groupImage"), Controller.createGroup)
groupRouter.patch("/:id", authentication, file.single("groupImage"), Controller.updateGroup)
groupRouter.delete("/:id", authentication, Controller.deleteGroup)

module.exports = groupRouter
