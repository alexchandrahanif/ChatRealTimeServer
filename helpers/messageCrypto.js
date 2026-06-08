const crypto = require("crypto")

const PREFIX = "enc"

const getKey = () => {
  const secret = process.env.MESSAGE_SECRET || process.env.SECRET_KEY || "chat-realtime-message-secret"
  return crypto.createHash("sha256").update(secret).digest()
}

const encryptMessage = (message = "") => {
  if (!message) return ""
  if (String(message).startsWith(`${PREFIX}:`)) return message

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(String(message), "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${PREFIX}:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`
}

const decryptMessage = (message = "") => {
  if (!message || !String(message).startsWith(`${PREFIX}:`)) return message || ""

  try {
    const [, ivHex, tagHex, encryptedHex] = String(message).split(":")
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"))
    decipher.setAuthTag(Buffer.from(tagHex, "hex"))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, "hex")),
      decipher.final(),
    ])

    return decrypted.toString("utf8")
  } catch (error) {
    return ""
  }
}

const decryptRecord = (record) => {
  if (!record) return record
  const plain = record.toJSON ? record.toJSON() : { ...record }
  plain.message = decryptMessage(plain.message)
  return plain
}

const decryptRecords = (records = []) => records.map(decryptRecord)

module.exports = {
  decryptMessage,
  decryptRecord,
  decryptRecords,
  encryptMessage,
}
