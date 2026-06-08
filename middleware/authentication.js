const { verifyAccessToken } = require("../helpers/helper")
const { User } = require("../models/index")

const authentication = async (req, res, next) => {
  try {
    const { authorization } = req.headers
    if (!authorization) {
      throw { name: "Invalid authorization" }
    }

    let payload = verifyAccessToken(authorization)
    let dataUser = await User.findOne({
      where: {
        id: payload.id,
      },
    })

    if (!dataUser) {
      throw { name: "Invalid authorization" }
    }

    req.user = {
      id: dataUser.id,
      email: dataUser.email,
    }

    next()
  } catch (error) {
    next(error)
  }
}

module.exports = authentication
