import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { promises as fs } from 'fs'
import { randomUUID } from 'crypto'
import { WebSocketServer } from 'ws'
import Game from './game.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000

const PUB_ROOT = path.join(__dirname, 'public')
app.use(express.static(PUB_ROOT))
app.get('/', (req, res) => res.sendFile(path.join(PUB_ROOT, 'index.html')))

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

const USERS_DIR = path.join(__dirname, 'users')
await fs.mkdir(USERS_DIR, { recursive: true })

// ── maps ────────────────────────────────────────────────────────────────────
const MAPS_DIR = path.join(__dirname, 'maps')
await fs.mkdir(MAPS_DIR, { recursive: true })

async function loadAsciiMap(name) {
  const p = path.join(MAPS_DIR, `${name}.txt`)
  try { return (await fs.readFile(p, 'utf8')).trim() } catch { return '' }
}


function validUsername(u) { return /^[a-zA-Z0-9_]{3,20}$/.test(u) }
function userPath(u) { return path.join(USERS_DIR, `${u}.json`) }
async function readUser(u) { try { return JSON.parse(await fs.readFile(userPath(u), 'utf8')) } catch { return null } }
async function writeUser(u, data) { await fs.writeFile(userPath(u), JSON.stringify(data, null, 2), 'utf8') }

const sessions = new Map()
function parseCookies(header='') {
  const out = {}
  header.split(';').forEach(kv => {
    const i = kv.indexOf('=')
    if (i > -1) out[kv.slice(0,i).trim()] = decodeURIComponent(kv.slice(i+1).trim())
  })
  return out
}
function setCookie(res, name, value, opts={}) {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  if (opts.path) parts.push(`Path=${opts.path}`)
  if (opts.httpOnly) parts.push('HttpOnly')
  if (opts.maxAge != null) parts.push(`Max-Age=${opts.maxAge}`)
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`)
  if (opts.secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}
function getSession(req) {
  const sid = parseCookies(req.headers.cookie || '').sid
  return sid ? sessions.get(sid) || null : null
}
function requireAuth(req, res) {
  const sess = getSession(req)
  if (!sess) { res.status(401).json({ ok:false, error:'not_logged_in' }); return null }
  return sess
}

app.post('/api/signup', async (req, res) => {
  try {
    const { username, password } = req.body || {}
    if (!validUsername(username)) return res.status(400).json({ ok:false, error:'invalid_username' })
    if (typeof password !== 'string' || password.length < 6) return res.status(400).json({ ok:false, error:'invalid_password' })
    if (await readUser(username)) return res.status(409).json({ ok:false, error:'username_taken' })
    const user = { username, password, premium:'none', wins:0, losses:0, prisms:0, createdAt:Date.now() }
    await writeUser(username, user)
    const sid = randomUUID()
    sessions.set(sid, { username })
    setCookie(res, 'sid', sid, { path:'/', httpOnly:true, maxAge:60*60*24*7, sameSite:'Lax' })
    res.json({ ok:true, username:user.username, premium:user.premium })
  } catch {
    res.status(500).json({ ok:false, error:'signup_failed' })
  }
})

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {}
    if (!validUsername(username)) return res.status(400).json({ ok:false, error:'invalid_username' })
    const user = await readUser(username)
    if (!user || user.password !== password) return res.status(401).json({ ok:false, error:'bad_credentials' })
    const sid = randomUUID()
    sessions.set(sid, { username })
    setCookie(res, 'sid', sid, { path:'/', httpOnly:true, maxAge:60*60*24*7, sameSite:'Lax' })
    res.json({ ok:true, username:user.username, premium:user.premium })
  } catch {
    res.status(500).json({ ok:false, error:'login_failed' })
  }
})

app.post('/api/logout', async (req, res) => {
  try {
    const sid = parseCookies(req.headers.cookie || '').sid
    if (sid) sessions.delete(sid)
    setCookie(res, 'sid', '', { path:'/', httpOnly:true, maxAge:0, sameSite:'Lax' })
    res.json({ ok:true })
  } catch {
    res.status(500).json({ ok:false })
  }
})

app.get('/api/me', async (req, res) => {
  const sess = requireAuth(req, res); if (!sess) return
  const user = await readUser(sess.username)
  if (!user) return res.status(401).json({ ok:false, error:'not_logged_in' })
  res.json({ ok:true, username:user.username, premium:user.premium||'none', wins:user.wins||0, losses:user.losses||0, prisms:user.prisms||0 })
})

const server = app.listen(PORT, () => console.log(`HTTP listening on http://localhost:${PORT}`))

// Attach directly to the HTTP server on /ws (simpler & more robust)
const wss = new WebSocketServer({ server, path: '/ws' })
const queues = { '1v1': [], '2v2': [], '3v3': [] }
const inGame = new Map()
const MODE_PLAYERS = { '1v1': 2, '2v2': 4, '3v3': 6 }

function send(ws, obj) { try { ws.send(JSON.stringify(obj)) } catch {} }
function countsByMode() {
  return {
    '1v1': queues['1v1'].length,
    '2v2': queues['2v2'].length,
    '3v3': queues['3v3'].length,
  }
}
function broadcastQueue(reason = '') {
  const counts = countsByMode()
  const total = counts['1v1'] + counts['2v2'] + counts['3v3']
  if (reason) console.log(`[QUEUE] totals=${JSON.stringify(counts)} :: ${reason}`)
  else console.log(`[QUEUE] totals=${JSON.stringify(counts)}`)
  // keep 'n' for backward-compat, but also send {counts}
  wss.clients.forEach(c => {
    if (c.readyState === 1) send(c, { type:'queueCount', n: total, counts })
  })
}
function removeFromAllQueues(ws) {
  for (const k of Object.keys(queues)) {
    const i = queues[k].indexOf(ws)
    if (i !== -1) queues[k].splice(i, 1)
  }
}


wss.on('connection', (ws, req) => {
  ws._id = randomUUID()
  ws._status = 'idle'
  const sess = getSession(req)
  ws._user = sess?.username || `guest-${String(ws._id).slice(0, 6)}`
  console.log(`[WS] connect id=${ws._id} user=${ws._user}`)
  send(ws, { type:'hello' })

ws.on('message', async raw => {
  let msg = null
  try { msg = JSON.parse(raw) } catch { return }
  if (!msg) return

  if (msg.type === 'joinQueue') {
  if (inGame.has(ws)) return
  const mode = (msg && typeof msg.mode === 'string' && ['1v1','2v2','3v3'].includes(msg.mode)) ? msg.mode : '1v1'

  // ensure the user isn't in any other queue
  removeFromAllQueues(ws)

  // put into selected queue
  ws._status = 'queue'
  queues[mode].push(ws)
  console.log(`[QUEUE] + ${ws._user} joined (${mode}) id=${ws._id}`)
  send(ws, { type:'queued', mode })
  broadcastQueue(`join by ${ws._user} (${mode})`)

  const need = MODE_PLAYERS[mode]
  while (queues[mode].length >= need) {
    const party = queues[mode].splice(0, need)
    for (const s of party) s._status = 'ingame'

    // assign teams: first half = team 0, second half = team 1
    const half = need / 2
    const players = party.map((sock, i) => ({
      id: randomUUID(),
      ws: sock,
      name: sock._user,
      team: (i < half) ? 0 : 1
    }))

    const mapGrid = await loadAsciiMap('default_1')   // ← NEW: choose default map
    const game = new Game(players, { mapGrid })
    players.forEach(p => inGame.set(p.ws, game))
    console.log(`[MATCH] starting ${mode} game ${game.id} :: players=${party.map(s=>s._user).join(',')}`)
    broadcastQueue('match formed')

    game.onEnd = (reason) => {
      players.forEach(p => inGame.delete(p.ws))
      for (const s of party) { try { s._status = 'idle' } catch {} }
      console.log(`[MATCH] game ${game.id} ended :: reason=${reason}`)
    }


    game.onEnd = (reason) => {
      players.forEach(p => inGame.delete(p.ws))
      for (const s of party) { try { s._status = 'idle' } catch {} }
      console.log(`[MATCH] game ${game.id} ended :: reason=${reason}`)
    }
  }
}


if (msg.type === 'leaveQueue') {
  removeFromAllQueues(ws)
  ws._status = 'idle'
  console.log(`[QUEUE] - ${ws._user} left (id=${ws._id})`)
  broadcastQueue(`leave by ${ws._user}`)
}

  if (msg.type === 'leaveGame') {
    const game = inGame.get(ws)
    if (game) {
      console.log(`[GAME] ${ws._user} requested leave in game ${game.id}`)
      game.end('left')
    }
  }
})


ws.on('close', () => {
  console.log(`[WS] disconnect id=${ws._id} user=${ws._user}`)
  removeFromAllQueues(ws)
  broadcastQueue(`disconnect ${ws._user}`)
  const game = inGame.get(ws)
  if (game) game.end('dc')
})

})
