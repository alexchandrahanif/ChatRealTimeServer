require("dotenv").config()

const router = require("./routes")
const handleError = require("./middleware/handleError")

const cors = require("cors")
const express = require("express")

const http = require("http")
const socketIO = require("socket.io")
const { verifyAccessToken } = require("./helpers/helper")
const { User } = require("./models")

const app = express()
const server = http.createServer(app)
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173"
const io = socketIO(server, { cors: { origin: clientOrigin } })
app.set("io", io)

const port = process.env.PORT || 3000

const corsOptions = {
  origin: clientOrigin,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
}

app.use(cors(corsOptions))

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use("/", router)
app.use("/upload", express.static("upload"))
app.use(handleError)

const onlineUsers = {}

io.on("connection", (socket) => {
  const { token } = socket.handshake.query

  let userId = null

  if (token && token !== "null") {
    try {
      const data = verifyAccessToken(token)

      userId = data.id
      onlineUsers[userId] = true
      User.update({ statusActive: true }, { where: { id: userId } })
        .then(() => io.emit("updateOnlineStatus", { userId, status: true, lastLogin: null }))
        .catch(() => io.emit("updateOnlineStatus", { userId, status: true, lastLogin: null }))
    } catch (error) {
      socket.disconnect(true)
      return
    }
  }

  socket.on("typing", () => {
    if (!userId) return
    io.emit("userTyping", { userId, isTyping: true })
  })

  socket.on("stopTyping", () => {
    if (!userId) return
    io.emit("userTyping", { userId, isTyping: false })
  })

  socket.on("disconnect", () => {
    if (userId) {
      onlineUsers[userId] = false
      const lastLogin = new Date()
      User.update(
        { statusActive: false, lastLogin },
        { where: { id: userId } },
      )
        .then(() => io.emit("updateOnlineStatus", { userId, status: false, lastLogin }))
        .catch(() => io.emit("updateOnlineStatus", { userId, status: false, lastLogin }))
    }
  })
})

server.listen(port, () => {
  console.log(`REAL TIME CHAT SERVER CONNECTED!`)
})
