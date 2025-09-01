import express from "express"
import path from "path"
import cookieParser from "cookie-parser"
import { promises as fs } from "fs"
import crypto from "crypto"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000
const usersDir = path.join(__dirname, "users")
await fs.mkdir(usersDir, { recursive: true })

const sessions = new Map()

const isValidUsername = s => /^[a-zA-Z0-9_]{3,20}$/.test(s)
const isValidPassword = s => typeof s === "string" && s.length >= 6
const userFile = u => path.join(usersDir, `${u}.json`)
const newToken = () => crypto.randomBytes(24).toString("hex")
const cookieOpts = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" }

app.use(express.json())
app.use(cookieParser())
app.use(express.static(path.join(__dirname, "public")))

const loadUser = async u => {
  try { return JSON.parse(await fs.readFile(userFile(u), "utf8")) } catch { return null }
}
const saveUser = async data => {
  await fs.writeFile(userFile(data.username), JSON.stringify(data, null, 2))
}

app.post("/api/signup", async (req, res) => {
  const { username, password } = req.body || {}
  if (!isValidUsername(username)) return res.status(400).json({ ok: false, error: "invalid_username" })
  if (!isValidPassword(password)) return res.status(400).json({ ok: false, error: "invalid_password" })
  if (await loadUser(username)) return res.status(409).json({ ok: false, error: "user_exists" })
  const user = { username, password, createdAt: Date.now() }
  await saveUser(user)
  const token = newToken()
  sessions.set(token, username)
  res.cookie("sessionId", token, cookieOpts)
  res.json({ ok: true, username })
})

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {}
  const user = await loadUser(username)
  if (!user || user.password !== password) return res.status(401).json({ ok: false, error: "bad_credentials" })
  const token = newToken()
  sessions.set(token, username)
  res.cookie("sessionId", token, cookieOpts)
  res.json({ ok: true, username })
})

app.get("/api/me", async (req, res) => {
  const token = req.cookies.sessionId
  const username = token ? sessions.get(token) : null
  if (!username) return res.json({ ok: false })
  const user = await loadUser(username)
  if (!user) return res.json({ ok: false })
  res.json({ ok: true, username: user.username, createdAt: user.createdAt })
})

app.post("/api/logout", (req, res) => {
  const token = req.cookies.sessionId
  if (token) sessions.delete(token)
  res.clearCookie("sessionId", cookieOpts)
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
