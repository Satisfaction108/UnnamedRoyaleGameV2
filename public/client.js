const GameClient = (() => {

  const $ = (id) => document.getElementById(id)

  const INTERP_DELAY_MS = 120
  const MAX_SNAPSHOTS = 90
  const OFFSET_SMOOTH = 0.12
  const CAM_SMOOTH = 0.2
  const STROKE_W = 4

  const SPEC_PAN_PX_PER_S = 1000
  const ZOOM_MIN = 0.5
  const ZOOM_MAX = 3.0
  const ZOOM_SMOOTH = 0.22
  const ZOOM_STEP_KEYS = 1.12
const ZOOM_WHEEL_BASE = 1.0015
const FOV_MARGIN = 100   // world-unit padding so client view < server FOV (prevents pop-in)


  let ws = null
  let canvas = null
  let ctx = null
  let running = false
  let anim = 0

  let myId = null
  let world = { w: 2000, h: 2000 }
  let mazeWalls = []   // ← NEW: server-provided walls (world units)

  let dpr = Math.min(window.devicePixelRatio || 1, 3)
  let viewW = 0, viewH = 0

  let keys = { w: false, a: false, s: false, d: false }

  const snapshots = []
  let serverOffset = 0

const names = new Map()
const tanks = new Map()


// damage flash state
const hurtUntil = new Map()      // id -> timestamp (performance.now()) until which we flash
const lastHealthSeen = new Map() // id -> last health we saw from server

// recoil state (per player -> per-barrel value in [0..1])
const recoil = new Map()
// tuning
const RECOIL_KICK = 1.0                 // how hard the kick sets the value
const RECOIL_RECOVER_PER_S = 7.0        // how fast it returns to 0
const RECOIL_DIST_SCALE = 0.35          // travel fraction of barrel length
const RECOIL_DIST_MIN = 4               // minimum world-units travel

// 💥 bullet death FX (grow + fade)
const bulletFades = []   // {x,y,size,sides,start,duration}




  const camera = { x: 0, y: 0 }
  let zoom = 1
  let targetZoom = 1

  let isSpectator = false
  const specKeys = { up: false, left: false, down: false, right: false }

let announceText = null
let announceUntil = 0
let exitCountdownSecs = 0
let exitCountdownStart = 0

const STAT_COLORS = ['#f59e0b','#ec4899','#8b5cf6','#3b82f6','#eab308','#ef4444','#22c55e','#06b6d4']
let statLabels = ['Health Regen','Max Health','Body Damage','Bullet Speed','Bullet Penetration','Bullet Damage','Reload','Movement Speed']
let statPoints = 33
let statLevels = new Array(8).fill(0)

// UI tween levels (smoothly animate toward statLevels)
let statUiLevels = new Array(8).fill(0)

// click animation per row
let statAnim = new Array(8).fill(0)   // store last-activated timestamp (ms)

// bar rects for mouse clicks (canvas-space px)
let statRects = new Array(8).fill(null)



// ⏳ WoT-style prebattle countdown + roster
let battleStartAt = 0          // server ms
let countdownActive = false
let rosterSlide = 0            // 0 = shown, 1 = fully pulled up
let rosterCache = []           // from matchStart.roster

// 🌫️ dark overlay (0..1 alpha)
let overlayAlpha = 0           // current opacity
const OVERLAY_ON = 0.60        // 60% during countdown
const OVERLAY_FADE_PER_SEC = 1.8 // fade speed after start (~330ms from .6 → 0)



  let mouseCssX = 0, mouseCssY = 0
  let lastAimSent = 0
  let lastAngleSent = 0

let lastFrameTs = 0
// firing
let mouseDown = false
let autofireEnabled = false
let fireAccumMs = 0
const FIRE_INTERVAL_MS = 60  // client throttle; server still enforces reloads

  function start(m) {
  ws = window.__wsRef
myId = m.id || m.you || null
world = { w: m.w || 2000, h: m.h || 2000 }
mazeWalls = Array.isArray(m.walls) ? m.walls : []   // ← NEW

names.clear()
const teamById = (window.__teamById = new Map())
let myTeam = 0
if (Array.isArray(m.roster)) {
  m.roster.forEach((r) => {
    names.set(r.id, r.name || `P-${String(r.id).slice(0, 4)}`)
    if (typeof r.team === 'number') {
      teamById.set(r.id, r.team)
      if (r.id === myId) myTeam = r.team
    }
  })
}
window.__myTeam = myTeam

tanks.clear()
if (Array.isArray(m.tanks)) m.tanks.forEach(({ id, tank }) => tanks.set(id, tank))

// ⏳ countdown & roster
battleStartAt = (typeof m.battleStartAt === 'number') ? m.battleStartAt : 0
countdownActive = battleStartAt > 0
rosterSlide = 0
rosterCache = Array.isArray(m.roster) ? m.roster.slice() : []

if (Array.isArray(m.statLevels)) statLevels = m.statLevels.slice(0,8)
if (typeof m.statPoints === 'number') statPoints = m.statPoints|0
if (Array.isArray(m.statLabels)) statLabels = m.statLabels.slice(0,8)

// sync UI tween + reset animations
statUiLevels = statLevels.slice(0,8)
statAnim = new Array(8).fill(0)
statRects = new Array(8).fill(null)


// 🌫️ turn on the dark overlay for the countdown
overlayAlpha = OVERLAY_ON


// reset damage flash memory
hurtUntil.clear()
lastHealthSeen.clear()

// reset recoil
recoil.clear()




  canvas = $('gameCanvas')
  ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })
  resizeCanvas()
  window.addEventListener('resize', onResize, { passive: true })

    canvas.addEventListener('mousedown', onStatBarClick, { passive: false })

  $('queueScreen') && ($('queueScreen').hidden = true)
  $('gameView') && ($('gameView').hidden = false)

  window.addEventListener('keydown', onKey, { passive: false })
  window.addEventListener('keyup', onKey, { passive: false })
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerdown', onPointerDown, { passive: true })
  window.addEventListener('pointerup', onPointerUp, { passive: true })
  window.addEventListener('blur', onPointerUp, { passive: true }) // safety
  window.addEventListener('wheel', onWheel, { passive: false })

  running = true
  lastFrameTs = performance.now()
  anim = requestAnimationFrame(loop)

  announceText = null
  announceUntil = 0
  exitCountdownSecs = 0
  exitCountdownStart = 0
  isSpectator = false
  zoom = targetZoom = 1

  // firing state
  mouseDown = false
  autofireEnabled = false
  fireAccumMs = 0
}



function stop() {
  running = false
  try { cancelAnimationFrame(anim) } catch {}
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('keyup', onKey)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('blur', onPointerUp)
  window.removeEventListener('wheel', onWheel)

  $('gameView') && ($('gameView').hidden = true)
  snapshots.length = 0
names.clear()
tanks.clear()
hurtUntil.clear()
lastHealthSeen.clear()
recoil.clear()



  mouseDown = false
  autofireEnabled = false
  fireAccumMs = 0
}


function handle(msg) {
  if (msg.type === 'matchStart') { start(msg); return true }
  if (!running) return false

  if (msg.type === 'state') {
    if (typeof msg.ts === 'number') {
      const estimate = Date.now() - msg.ts
      serverOffset += (estimate - serverOffset) * OFFSET_SMOOTH
    }
    const map = new Map()
    const teamById = window.__teamById || new Map()
    for (const p of msg.players || []) {
      // carry team info from server, or fall back to roster mapping
      const team = (typeof p.team === 'number') ? p.team : teamById.get(p.id)
      if (typeof team === 'number') teamById.set(p.id, team)

      map.set(p.id, {
        x: p.x, y: p.y,
        rot: p.rot ?? 0,
        size: p.size,
        health: p.health, maxHealth: p.maxHealth,
        alive: p.alive !== false,
        shape: p.shape ?? (tanks.get(p.id)?.shape || 0),
        team,
      })

      // 👇 damage detection: if health dropped vs last snapshot, start a flash
      const prev = lastHealthSeen.get(p.id)
      if (typeof prev === 'number' && p.health < prev) {
        hurtUntil.set(p.id, performance.now() + 200) // ~200ms flash
      }
      lastHealthSeen.set(p.id, p.health)
    }

    // store bullets as a Map keyed by id for interpolation
    const bulletsMap = new Map()
    for (const b of (msg.bullets || [])) bulletsMap.set(b.id, b)

    // 🔁 recoil: kick when a NEW bullet appears (compare with prev snapshot)
    const prevBullets = snapshots.length ? snapshots[snapshots.length - 1].bullets : undefined
    if (msg.bullets && msg.bullets.length) {
      for (const b of msg.bullets) {
        const isNew = !prevBullets || !prevBullets.has(b.id)
        if (isNew && b.ownerId) {
          const ang = Math.atan2(b.vy || 0, b.vx || 0)
          kickRecoil(b.ownerId, ang, map)
        }
      }
    }

    // 💀 detect bullet deaths (present before, missing now) → spawn fade FX
    // Delay start by INTERP_DELAY_MS to align with render-time disappearance.
    if (prevBullets) {
      for (const [id, b] of prevBullets.entries()) {
        if (!bulletsMap.has(id)) {
          bulletFades.push({
            x: b.x, y: b.y,
            size: b.size ?? b.r ?? 3,
            sides: b.sides ?? 0,
            start: performance.now() + INTERP_DELAY_MS,
            duration: 220, // ms
          })
        }
      }
    }

    snapshots.push({ ts: msg.ts ?? Date.now() - serverOffset, map, bullets: bulletsMap })

    if (snapshots.length > MAX_SNAPSHOTS) snapshots.shift()

    const me = map.get(myId)
    const newSpectator = me ? !me.alive : true
    if (newSpectator !== isSpectator) {
      isSpectator = newSpectator
      if (!isSpectator) {
        // keep current zoom; next frame we auto-fit to cameraSize FOV
        targetZoom = zoom
        specKeys.up = specKeys.left = specKeys.down = false; specKeys.right = false
      }
    }

    return true
  }

  if (msg.type === 'announcement' && typeof msg.text === 'string') {
    announceText = msg.text
    announceUntil = performance.now() + 4000
    return true
  }

  if (msg.type === 'exitCountdown' && typeof msg.seconds === 'number') {
    exitCountdownSecs = Math.max(0, Math.floor(msg.seconds))
    exitCountdownStart = performance.now()
    return true
  }

  if (msg.type === 'stats') {
  if (typeof msg.points === 'number') statPoints = msg.points|0
  if (Array.isArray(msg.levels)) statLevels = msg.levels.slice(0,8)
  return true
}
  if (msg.type === 'matchEnd') { stop(); window.__onMatchEnd && window.__onMatchEnd(msg); return true }
  return false
}


  function onKey(e) {
  const k = e.key.toLowerCase()
  const isMoveKey = ['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(k)
  const isZoomKey = k === '-' || k === '_' || k === '+' || k === '='
  if (isMoveKey || (isSpectator && isZoomKey)) e.preventDefault()

  if (e.type === 'keydown') {
    if (isSpectator) {
      if (k === 'w' || k === 'arrowup') specKeys.up = true
      if (k === 'a' || k === 'arrowleft') specKeys.left = true
      if (k === 's' || k === 'arrowdown') specKeys.down = true
      if (k === 'd' || k === 'arrowright') specKeys.right = true
      if (isZoomKey) {
        if (k === '-' || k === '_') targetZoom = clamp(targetZoom / ZOOM_STEP_KEYS, ZOOM_MIN, ZOOM_MAX)
        if (k === '+' || k === '=') targetZoom = clamp(targetZoom * ZOOM_STEP_KEYS, ZOOM_MIN, ZOOM_MAX)
      }
    } else {
      // autofire toggle
// autofire toggle
if (k === 'e') {
  autofireEnabled = !autofireEnabled
  announceText = `Autofire ${autofireEnabled ? 'Enabled.' : 'Disabled.'}`
  announceUntil = performance.now() + 1800
  return
}

if (k >= '1' && k <= '8') {
  const idx = (k.charCodeAt(0) - '1'.charCodeAt(0)) | 0
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'upgrade', index: idx }))
  }
  statAnim[idx] = performance.now()    // 🔔 bump animation
  e.preventDefault()
  return
}



      let changed = false
      if (k === 'w' || k === 'arrowup') { if (!keys.w) { keys.w = true; changed = true } }
      if (k === 'a' || k === 'arrowleft') { if (!keys.a) { keys.a = true; changed = true } }
      if (k === 's' || k === 'arrowdown') { if (!keys.s) { keys.s = true; changed = true } }
      if (k === 'd' || k === 'arrowright') { if (!keys.d) { keys.d = true; changed = true } }
      if (changed && ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'input', ...keys }))
    }
  } else {
    if (isSpectator) {
      if (k === 'w' || k === 'arrowup') specKeys.up = false
      if (k === 'a' || k === 'arrowleft') specKeys.left = false
      if (k === 's' || k === 'arrowdown') specKeys.down = false
      if (k === 'd' || k === 'arrowright') specKeys.right = false
    } else {
      let changed = false
      if (k === 'w' || k === 'arrowup') { if (keys.w) { keys.w = false; changed = true } }
      if (k === 'a' || k === 'arrowleft') { if (keys.a) { keys.a = false; changed = true } }
      if (k === 's' || k === 'arrowdown') { if (keys.s) { keys.s = false; changed = true } }
      if (k === 'd' || k === 'arrowright') { if (keys.d) { keys.d = false; changed = true } }
      if (changed && ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'input', ...keys }))
    }
  }
}

  function onPointerMove(e) {
    mouseCssX = e.clientX
    mouseCssY = e.clientY
  }

function onPointerDown() {
  if (isSpectator) return
  mouseDown = true
  // instant first shot; repeat handled in loop() with throttle
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'shoot' }))
}

function onPointerUp() {
  mouseDown = false
}


function onWheel(e) {
  if (!isSpectator) return
  e.preventDefault()
  // reverse direction: wheel up -> zoom in
  const factor = Math.pow(ZOOM_WHEEL_BASE, -e.deltaY)
  targetZoom = clamp(targetZoom * factor, ZOOM_MIN, ZOOM_MAX)
}


  function onResize() {
    const newDpr = Math.min(window.devicePixelRatio || 1, 3)
    if (newDpr !== dpr) dpr = newDpr
    resizeCanvas()
  }
  function resizeCanvas() {
    const cssW = window.innerWidth
    const cssH = window.innerHeight
    canvas.width  = Math.max(1, Math.round(cssW * dpr))
    canvas.height = Math.max(1, Math.round(cssH * dpr))
    canvas.style.width = cssW + 'px'
    canvas.style.height = cssH + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = true
    viewW = cssW; viewH = cssH
  }

  function getInterpolated(renderServerTime) {
    if (snapshots.length === 0) return []
    if (snapshots.length === 1) {
      const only = snapshots[0].map
      return [...only.entries()].map(([id, p]) => ({ id, ...p }))
    }
    let i = snapshots.length - 2
    while (i >= 0 && snapshots[i].ts > renderServerTime) i--
    const a = Math.max(0, i), b = Math.min(snapshots.length - 1, a + 1)
    const s0 = snapshots[a], s1 = snapshots[b]
    const t0 = s0.ts, t1 = s1.ts
    const t = (t1 === t0) ? 1 : Math.max(0, Math.min(1, (renderServerTime - t0) / (t1 - t0)))
    const out = []
    const ids = new Set([...s0.map.keys(), ...s1.map.keys()])
    ids.forEach((id) => {
      const p0 = s0.map.get(id) || s1.map.get(id)
      const p1 = s1.map.get(id) || s0.map.get(id)
      const x = p0.x + (p1.x - p0.x) * t
      const y = p0.y + (p1.y - p0.y) * t
      const size = (p0.size ?? 16) + ((p1.size ?? 16) - (p0.size ?? 16)) * t
      const health = p1.health ?? p0.health ?? 0
      const maxHealth = p1.maxHealth ?? p0.maxHealth ?? 1
      const alive = p1.alive ?? p0.alive ?? true
      const shape = p1.shape ?? p0.shape ?? (tanks.get(id)?.shape || 0)
      const rot = lerpAngle(p0.rot ?? 0, p1.rot ?? 0, t)
      out.push({ id, x, y, size, health, maxHealth, alive, shape, rot })
    })
    return out
  }

function getInterpolatedBullets(renderServerTime) {
  if (snapshots.length === 0) return []
  if (snapshots.length === 1) {
    const only = snapshots[0].bullets || new Map()
    return [...only.values()]
  }
  let i = snapshots.length - 2
  while (i >= 0 && (snapshots[i].ts > renderServerTime)) i--
  const a = Math.max(0, i), b = Math.min(snapshots.length - 1, a + 1)
  const s0 = snapshots[a], s1 = snapshots[b]
  const t0 = s0.ts, t1 = s1.ts
  const t = (t1 === t0) ? 1 : Math.max(0, Math.min(1, (renderServerTime - t0) / (t1 - t0)))

  const B0 = s0.bullets || new Map()
  const B1 = s1.bullets || new Map()
  const ids = new Set([...B0.keys(), ...B1.keys()])
  const out = []
  ids.forEach((id) => {
    const b0 = B0.get(id)
    const b1 = B1.get(id)
    if (b0 && b1) {
      // normal interpolate between snapshots
      out.push({
        id,
        x: b0.x + (b1.x - b0.x) * t,
        y: b0.y + (b1.y - b0.y) * t,
        r: b1.r ?? b0.r,
        size: b1.size ?? b0.size,
        sides: b1.sides ?? b0.sides,
        strokeWidth: b1.strokeWidth ?? b0.strokeWidth,
      })
    } else if (!b0 && b1) {
      // newly spawned: backtrack a bit for smoothness
      const dt = (renderServerTime - t1) / 1000 // negative
      out.push({
        id: b1.id,
        x: b1.x + (b1.vx || 0) * dt,
        y: b1.y + (b1.vy || 0) * dt,
        r: b1.r,
        size: b1.size,
        sides: b1.sides,
        strokeWidth: b1.strokeWidth,
      })
    } else {
      // was present, now gone (b0 && !b1) → DO NOT extrapolate (prevents ghosting)
      // intentionally skip
    }
  })
  return out
}



  function loop(now) {
  if (!running) return
  const dt = Math.max(0.001, (now - lastFrameTs) / 1000)
  lastFrameTs = now

if (!isSpectator) {
  // Fit the entire screen inside the server FOV square (minus margin)
  const myTank = tanks.get(myId)
  const csRaw = (myTank?.cameraSize ?? 500)
  const half = Math.max(64, csRaw - FOV_MARGIN)  // shrink a bit vs server to hide cull edge
  // We must ensure both width and height fit inside 2*half
  const needZoomW = viewW / (2 * half)
  const needZoomH = viewH / (2 * half)
  targetZoom = Math.max(needZoomW, needZoomH)
}
zoom += (targetZoom - zoom) * ZOOM_SMOOTH


  const renderServerTime = Date.now() - serverOffset - INTERP_DELAY_MS
const players = getInterpolated(renderServerTime)

// ⏱ server-time countdown (no INTERP delay)
if (countdownActive && battleStartAt) {
  const nowServer = Date.now() - serverOffset
  // keep overlay locked at 60% while waiting
  overlayAlpha = OVERLAY_ON
  if (nowServer >= battleStartAt) {
    countdownActive = false
    announceText = 'Battle!'
    announceUntil = performance.now() + 1200
  }
} else {
  // fade overlay out after start
  if (overlayAlpha > 0) {
    overlayAlpha = Math.max(0, overlayAlpha - OVERLAY_FADE_PER_SEC * dt)
  }
  // pull the roster up and away after start
  if (rosterSlide < 1) {
    rosterSlide = Math.min(1, rosterSlide + dt * 1.6)
  }
}


  const me = players.find(p => p.id === myId)

  if (isSpectator) {
    const vx = (specKeys.right ? 1 : 0) - (specKeys.left ? 1 : 0)
    const vy = (specKeys.down ? 1 : 0) - (specKeys.up ? 1 : 0)
    let len = Math.hypot(vx, vy)
    if (len > 0) {
      const inv = 1 / len
      camera.x += (vx * SPEC_PAN_PX_PER_S * inv) * dt / zoom
      camera.y += (vy * SPEC_PAN_PX_PER_S * inv) * dt / zoom
    }
  } else if (me) {
    camera.x += (me.x - camera.x) * CAM_SMOOTH
    camera.y += (me.y - camera.y) * CAM_SMOOTH
    maybeSendAim(me)

    // hold-to-fire / autofire (client throttle; server enforces reload)
    fireAccumMs += dt * 1000
    if ((mouseDown || autofireEnabled) && ws && ws.readyState === 1 && fireAccumMs >= FIRE_INTERVAL_MS) {
      ws.send(JSON.stringify({ type: 'shoot' }))
      fireAccumMs = 0
    }
  }

  // recoil decay
  updateRecoil(dt)


  camera.x = clamp(camera.x, 0, world.w)
  camera.y = clamp(camera.y, 0, world.h)

  // render
  ctx.clearRect(0, 0, viewW, viewH)
drawWorld()
drawPlayers(players)
const bullets = getInterpolatedBullets(renderServerTime)
drawBullets(bullets)
drawBulletDeaths()
drawAnnouncements()
drawExitCountdown()
if (countdownActive || rosterSlide < 1) drawCountdownAndRoster()
if (me && !me.alive) drawDeathOverlay()

drawStatBar()  // 📊 new


  anim = requestAnimationFrame(loop)

}


  function maybeSendAim(me) {
    const wx = camera.x - (viewW / 2) / zoom + mouseCssX / zoom
    const wy = camera.y - (viewH / 2) / zoom + mouseCssY / zoom
    const angle = Math.atan2(wy - me.y, wx - me.x)
    const now = performance.now()
    const delta = angleDelta(angle, lastAngleSent)
    if ((Math.abs(delta) > 0.02 && now - lastAimSent > 16) || now - lastAimSent > 150) {
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'aim', angle }))
        lastAimSent = now
        lastAngleSent = angle
      }
    }
  }

function drawWorld() {
  ctx.fillStyle = '#05080f'
  ctx.fillRect(0, 0, viewW, viewH)
  const left = worldToScreenX(0)
  const top = worldToScreenY(0)
  const right = worldToScreenX(world.w)
  const bottom = worldToScreenY(world.h)
  const w = right - left
  const h = bottom - top
  ctx.fillStyle = '#0b1220'
  ctx.fillRect(left, top, w, h)
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 2
  ctx.strokeRect(Math.floor(left)+1.5, Math.floor(top)+1.5, Math.floor(w)-3, Math.floor(h)-3)
  ctx.save()
  ctx.beginPath()
  ctx.rect(left, top, w, h)
  ctx.clip()

  // grid
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 1
  const grid = 100
  ctx.beginPath()
  for (let x = 0; x <= world.w; x += grid) {
    const sx = worldToScreenX(x) + 0.5
    ctx.moveTo(sx, top)
    ctx.lineTo(sx, bottom)
  }
  for (let y = 0; y <= world.h; y += grid) {
    const sy = worldToScreenY(y) + 0.5
    ctx.moveTo(left, sy)
    ctx.lineTo(right, sy)
  }
  ctx.stroke()

  // 🧱 walls (world units → screen)
  for (const wall of mazeWalls) {
    const sx = worldToScreenX(wall.x)
    const sy = worldToScreenY(wall.y)
    const sw = Math.floor(wall.width * zoom)
    const sh = Math.floor(wall.height * zoom)
    ctx.fillStyle = wall.color || '#334155'
    ctx.fillRect(sx, sy, sw, sh)
    const stroke = wall.strokeWidth ?? 4
    if (stroke > 0) {
      ctx.lineWidth = stroke
      ctx.strokeStyle = darker(wall.color || '#334155', 0.4)
      ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1)
    }
  }

  ctx.restore()
}


function drawPlayers(ps) {
  const now = performance.now()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.font = '20px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'
  for (const p of ps) {
    const tank = tanks.get(p.id)
    const x = worldToScreenX(p.x)
    const y = worldToScreenY(p.y)
    const rWorld = Math.max(8, p.size || tank?.size || 16)
    const r = rWorld * zoom

    const teamById = window.__teamById || new Map()
    const myTeam = (window.__myTeam ?? teamById.get(myId) ?? 0)
    let theirTeam = (typeof p.team === 'number') ? p.team : teamById.get(p.id)
    if (typeof theirTeam !== 'number') theirTeam = -1

    const fill = !p.alive ? '#4b5563' : (theirTeam === myTeam ? '#34d399' : '#60a5fa')
    const stroke = darker(fill, 0.6)

if (tank?.barrels?.length) {
  ensureRecoilArrayFor(p.id, tank.barrels.length)
  ctx.lineWidth = STROKE_W
  ctx.fillStyle = '#9ca3af'
  ctx.strokeStyle = '#4b5563'
  for (let bi = 0; bi < tank.barrels.length; bi++) {
    const b = tank.barrels[bi]
    const bb = readBarrel(b)
    const lenWorld = (bb.length || 0)
    const len = lenWorld * zoom
    const wid = (bb.width || 0) * zoom
    const baseFwdWorld = (bb.forwardOffset || 0)
    const side = (bb.sidewaysOffset || 0) * zoom
    const dir = (bb.directionRadians || 0) + (p.rot || 0)

    // recoil distance in world units, scaled by current recoil value
    const rArr = recoil.get(p.id)
    const rVal = rArr ? rArr[bi] || 0 : 0
    const recoilWorld = (Math.max(RECOIL_DIST_MIN, lenWorld * RECOIL_DIST_SCALE)) * rVal

    const fwd = (baseFwdWorld - recoilWorld) * zoom
    drawBarrelRot(x, y, len, wid, fwd, side, dir)
  }
}


    // body
    ctx.lineWidth = STROKE_W
    ctx.fillStyle = fill
    ctx.strokeStyle = stroke
    const sides = tank?.shape ?? p.shape ?? 0
    if (sides === 0) {
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill(); ctx.stroke()
    } else {
      const verts = regularPolygonScreen(x, y, r, sides, p.rot || 0)
      ctx.beginPath()
      ctx.moveTo(verts[0].x, verts[0].y)
      for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y)
      ctx.closePath()
      ctx.fill(); ctx.stroke()
    }

// 🔥 damage flash along actual tank shape
const until = hurtUntil.get(p.id) || 0
const msLeft = until - now
if (msLeft > 0) {
  const a = Math.min(1, Math.max(0, msLeft / 200)) // fade 0..1
  ctx.save()
  ctx.globalAlpha = 0.7 * a
  ctx.lineWidth = Math.max(2, r * 0.28)
  ctx.strokeStyle = 'rgb(255,64,64)'
  ctx.lineJoin = 'round'
  if ((tank?.shape ?? p.shape ?? 0) === 0) {
    // circle tanks
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.stroke()
  } else {
    // polygon tanks
    const verts = regularPolygonScreen(x, y, r, tank?.shape ?? p.shape, p.rot || 0)
    ctx.beginPath()
    ctx.moveTo(verts[0].x, verts[0].y)
    for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y)
    ctx.closePath()
    ctx.stroke()
  }
  ctx.restore()
}


    // health bar + name
    const pct = Math.max(0, Math.min(1, (p.health || 0) / (p.maxHealth || 1)))
    const barW = Math.max(30, r * 2)
    const barH = 6
    const barX = Math.round(x - barW / 2)
    const barY = Math.round(y - r - 14)
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(barX, barY, barW, barH)
    ctx.fillStyle = '#b91c1c'; ctx.fillRect(barX, barY, barW, barH)
    ctx.fillStyle = '#22c55e'; ctx.fillRect(barX, barY, Math.round(barW * pct), barH)
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1
    ctx.strokeRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1)
    const label = names.get(p.id) || `P-${String(p.id).slice(0, 4)}`
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.strokeText(label, x, barY - 4)
    ctx.fillStyle = (theirTeam === myTeam) ? '#e6fff4' : '#f3f7ff'; ctx.fillText(label, x, barY - 4)
  }
}


function drawBullets(bullets) {
  if (!bullets?.length) return
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'
  for (const b of bullets) {
    const sx = worldToScreenX(b.x)
    const sy = worldToScreenY(b.y)
    const rad = Math.max(2, (b.size ?? b.r ?? 3) * zoom)
    const sides = Math.max(0, b.sides | 0)
    ctx.lineWidth = Math.max(1, (b.strokeWidth ?? 2) * (0.75 + 0.25 * zoom))

    if (sides === 0) {
      ctx.beginPath()
      ctx.arc(sx, sy, rad, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    } else {
      const verts = []
      for (let i = 0; i < sides; i++) {
        const a = (i * 2 * Math.PI) / sides
        verts.push({ x: sx + Math.cos(a) * rad, y: sy + Math.sin(a) * rad })
      }
      ctx.beginPath()
      ctx.moveTo(verts[0].x, verts[0].y)
      for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
  }
  ctx.restore()
}

// 💀 NEW: quick death puff — grows and fades out
function drawBulletDeaths() {
  if (!bulletFades.length) return
  const now = performance.now()
  ctx.save()
  for (let i = bulletFades.length - 1; i >= 0; i--) {
    const fx = bulletFades[i]
    const t = Math.min(1, (now - fx.start) / fx.duration)
    const alpha = 1 - t
    if (alpha <= 0) { bulletFades.splice(i, 1); continue }

    const sx = worldToScreenX(fx.x)
    const sy = worldToScreenY(fx.y)
    const base = Math.max(2, fx.size * zoom)
    const rad = base * (1 + 0.8 * t) // grow up to ~1.8x

    ctx.globalAlpha = alpha
    ctx.fillStyle = 'rgba(255,255,255,1)'
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'
    ctx.lineWidth = Math.max(1, 2 * (0.75 + 0.25 * zoom))

    if ((fx.sides | 0) === 0) {
      ctx.beginPath()
      ctx.arc(sx, sy, rad, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    } else {
      const verts = []
      for (let k = 0; k < fx.sides; k++) {
        const a = (k * 2 * Math.PI) / fx.sides
        verts.push({ x: sx + Math.cos(a) * rad, y: sy + Math.sin(a) * rad })
      }
      ctx.beginPath()
      ctx.moveTo(verts[0].x, verts[0].y)
      for (let k = 1; k < verts.length; k++) ctx.lineTo(verts[k].x, verts[k].y)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
  }
  ctx.restore()
}


  function readBarrel(b) {
    if (Array.isArray(b)) {
      const [length, width, forwardOffset, sidewaysOffset, directionRadians] = b
      return { length, width, forwardOffset, sidewaysOffset, directionRadians }
    }
    return {
      length: b.length, width: b.width,
      forwardOffset: b.forwardOffset, sidewaysOffset: b.sidewaysOffset,
      directionRadians: b.directionRadians
    }
  }

  function drawBarrelRot(cx, cy, len, wid, fwd, side, angle) {
    const cos = Math.cos(angle), sin = Math.sin(angle)
    const ox = cx + cos * fwd - sin * side
    const oy = cy + sin * fwd + cos * side
    const hx = (wid / 2) * -sin
    const hy = (wid / 2) *  cos
    const tipx = ox + cos * len
    const tipy = oy + sin * len
    const p1 = { x: ox + hx,   y: oy + hy }
    const p2 = { x: ox - hx,   y: oy - hy }
    const p3 = { x: tipx - hx, y: tipy - hy }
    const p4 = { x: tipx + hx, y: tipy + hy }
    ctx.beginPath()
    ctx.moveTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.lineTo(p3.x, p3.y)
    ctx.lineTo(p4.x, p4.y)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  function drawAnnouncements() {
    if (!announceText || performance.now() > announceUntil) return
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.font = '28px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'
    const text = announceText
    const w = ctx.measureText(text).width + 28
    const h = 40
    const x = (viewW - w) / 2
    const y = 18
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2; ctx.strokeRect(x+0.5, y+0.5, w-1, h-1)
    ctx.fillStyle = '#ffffff'; ctx.fillText(text, viewW / 2, y + 8)
    ctx.restore()
  }

  function drawExitCountdown() {
    if (!exitCountdownSecs) return
    const elapsed = Math.floor((performance.now() - exitCountdownStart) / 1000)
    const remain = Math.max(0, exitCountdownSecs - elapsed)
    if (remain <= 0) return
    const text = `Exiting battle in ${remain}s...`
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.font = '22px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fillText(text, viewW / 2, viewH - 20)
    ctx.restore()
  }

  function drawDeathOverlay() {
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, viewW, viewH)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'bold 72px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'
    ctx.fillStyle = '#ffdddd'
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'
    ctx.lineWidth = 6
    ctx.strokeText('YOU DIED', viewW / 2, viewH / 2 - 10)
    ctx.fillText('YOU DIED', viewW / 2, viewH / 2 - 10)
    ctx.font = '20px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fillText('Spectating until the battle ends…', viewW / 2, viewH / 2 + 36)
    ctx.restore()
  }

  function regularPolygonScreen(cx, cy, r, sides, rot = 0) {
    const out = []
    for (let i = 0; i < sides; i++) {
      const a = rot + (i * 2 * Math.PI) / sides
      out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
    }
    return out
  }
  function ensureRecoilArrayFor(pid, n) {
  let arr = recoil.get(pid)
  if (!arr || arr.length !== n) {
    arr = new Float32Array(n)
    recoil.set(pid, arr)
  }
}

function kickRecoil(ownerId, bulletAngle, recentPlayersMap) {
  const tank = tanks.get(ownerId)
  if (!tank?.barrels?.length) return
  ensureRecoilArrayFor(ownerId, tank.barrels.length)
  const arr = recoil.get(ownerId)
  const shooter = recentPlayersMap?.get(ownerId)
  const rot = shooter?.rot || 0

  // pick the barrel whose forward direction is closest to the bullet's angle
  let bestI = 0, bestDiff = Infinity
  for (let i = 0; i < tank.barrels.length; i++) {
    const bb = readBarrel(tank.barrels[i])
    const dir = rot + (bb.directionRadians || 0)
    const diff = Math.abs(angleDelta(bulletAngle, dir))
    if (diff < bestDiff) { bestDiff = diff; bestI = i }
  }

  arr[bestI] = Math.min(1, arr[bestI] + RECOIL_KICK)
}

function updateRecoil(dt) {
  const k = RECOIL_RECOVER_PER_S * dt
  for (const [pid, arr] of recoil) {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.max(0, arr[i] - k)
    }
  }
}

  function darker(hex, f = 0.6) {
    const { r, g, b } = hexToRgb(hex)
    return `rgb(${Math.max(0, (r * f) | 0)},${Math.max(0, (g * f) | 0)},${Math.max(0, (b * f) | 0)})`
  }
  function hexToRgb(hex) {
    if (hex.startsWith('#')) hex = hex.slice(1)
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
    const num = parseInt(hex, 16)
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
  }
  function worldToScreenX(wx) { return Math.floor((wx - camera.x) * zoom + viewW / 2) }
  function worldToScreenY(wy) { return Math.floor((wy - camera.y) * zoom + viewH / 2) }
  function lerpAngle(a, b, t) { const two = Math.PI * 2; let diff = ((b - a + Math.PI) % two) - Math.PI; return a + diff * t }
  function angleDelta(a, b) { const two = Math.PI * 2; let d = ((a - b + Math.PI) % two) - Math.PI; return d }
  function drawCountdownAndRoster() {
  // ----- COUNTDOWN -----
  if (countdownActive && battleStartAt) {
    const nowServer = Date.now() - serverOffset
    const msLeft = Math.max(0, battleStartAt - nowServer)
    const secs = Math.ceil(msLeft / 1000)
    const within = (msLeft / 1000) % 1
    const scale = 1.0 + 0.35 * (1 - within)  // pulse down each second

    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

// dark overlay that fades out after start
if (overlayAlpha > 0) {
  ctx.fillStyle = `rgba(0,0,0,${overlayAlpha.toFixed(3)})`
  ctx.fillRect(0, 0, viewW, viewH)
}


    // header
    ctx.font = '600 22px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fillText('Battle starts in', viewW / 2, viewH * 0.32)

    // big pulsing number
    ctx.translate(viewW / 2, viewH * 0.42)
    ctx.scale(scale, scale)
    ctx.lineWidth = 10
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'
    ctx.fillStyle = '#eaf2ff'
    ctx.font = 'bold 120px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'
    ctx.strokeText(String(secs), 0, 0)
    ctx.fillText(String(secs), 0, 0)
    ctx.restore()
  }

  // ----- ROSTER (pull-up animation) -----
  const baseY = Math.round(viewH * 0.64)
  const y = Math.round(baseY - rosterSlide * (baseY + 120))  // slide upward offscreen
  const cardW = Math.min(720, Math.floor(viewW * 0.72))
  const cardH = Math.min(320, Math.max(120, 60 + (rosterCache.length * 36)))
  const x = Math.round((viewW - cardW) / 2)

  // background card
  ctx.save()
  ctx.globalAlpha = 1 - 0.9 * rosterSlide
  ctx.fillStyle = 'rgba(12,18,33,0.92)'
  ctx.fillRect(x, y, cardW, cardH)
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 2
  ctx.strokeRect(x + 0.5, y + 0.5, cardW - 1, cardH - 1)

  // split allies vs enemies
  const teamById = window.__teamById || new Map()
  const myTeam = (window.__myTeam ?? teamById.get(myId) ?? 0)
  const left = rosterCache.filter(r => (r.team ?? 0) === myTeam)
  const right = rosterCache.filter(r => (r.team ?? 0) !== myTeam)

  drawRosterColumn(x + 16, y + 18, Math.floor((cardW - 32) / 2), cardH - 36, left, true)
  drawRosterColumn(x + Math.floor(cardW / 2) + 16, y + 18, Math.floor((cardW - 32) / 2) - 16, cardH - 36, right, false)

  // VS label
  ctx.font = '700 18px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('VS', x + cardW / 2, y + cardH / 2)

  ctx.restore()
}

function drawRosterColumn(cx, cy, cw, ch, list, allies) {
  const rowH = 32
  ctx.save()
  ctx.font = '600 14px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  const title = allies ? 'Allies' : 'Enemies'
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillText(title, cx, cy - 4)
  const startY = cy + 18
  for (let i = 0; i < list.length; i++) {
    const r = list[i]
    const t = tanks.get(r.id)
    const ny = startY + i * rowH
    // icon
    const icX = cx
    const icY = ny + 10
    drawTankIcon(icX, icY, t, allies)
    // name
    ctx.fillStyle = allies ? '#c7ffe8' : '#e7efff'
    ctx.fillText(r.name || `P-${String(r.id).slice(0,4)}`, icX + 40, icY)
    // tank name (dim)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.fillText(String(t?.name || 'Unknown'), icX + 200, icY)
  }
  ctx.restore()
}

function drawTankIcon(x, y, t, allies) {
  const sides = t?.shape ?? 0
  const bodyR = Math.max(10, Math.min(16, (t?.size || 16) * 0.7)) * zoom
  const sx = Math.round(x)
  const sy = Math.round(y)
  const baseAngle = allies ? 0 : Math.PI     // face each other
  const uiScale = 0.7                        // shrink world dims for UI icon

  ctx.save()
  ctx.lineWidth = 3

  // --- BARRELS (if any) ---
  if (t?.barrels?.length) {
    ctx.fillStyle = '#9ca3af'
    ctx.strokeStyle = '#4b5563'
    for (let i = 0; i < t.barrels.length; i++) {
      const bb = readBarrel(t.barrels[i])
      const len = (bb.length || 0) * uiScale * zoom
      const wid = (bb.width  || 6) * uiScale * zoom
      const fwd = (bb.forwardOffset   || 0) * uiScale * zoom
      const side = (bb.sidewaysOffset || 0) * uiScale * zoom
      const dir  = baseAngle + (bb.directionRadians || 0)
      drawBarrelRot(sx, sy, len, wid, fwd, side, dir)
    }
  }

  // --- HULL ---
  ctx.fillStyle = allies ? '#34d399' : '#60a5fa'
  ctx.strokeStyle = allies ? 'rgba(0,50,30,0.7)' : 'rgba(15,30,60,0.7)'
  if (sides === 0) {
    ctx.beginPath(); ctx.arc(sx, sy, bodyR, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  } else {
    const verts = []
    for (let i = 0; i < sides; i++) {
      const a = baseAngle + (i * 2 * Math.PI) / sides
      verts.push({ x: sx + Math.cos(a) * bodyR, y: sy + Math.sin(a) * bodyR })
    }
    ctx.beginPath(); ctx.moveTo(verts[0].x, verts[0].y)
    for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y)
    ctx.closePath(); ctx.fill(); ctx.stroke()
  }
  ctx.restore()
}


  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
  function onExitClick() {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'leaveGame' }))
    stop()
    window.__onMatchEnd && window.__onMatchEnd()
  }



function onStatBarClick(e){
  // translate to canvas pixels
  const r = canvas.getBoundingClientRect()
  const sx = canvas.width  / r.width
  const sy = canvas.height / r.height
  const mx = (e.clientX - r.left) * sx
  const my = (e.clientY - r.top)  * sy

  for (let i = 0; i < statRects.length; i++){
    const R = statRects[i]
    if (!R) continue
    if (mx >= R.x && mx <= R.x + R.w && my >= R.y && my <= R.y + R.h){
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'upgrade', index: i }))
      }
      statAnim[i] = performance.now()  // 🔔 bump animation
      e.preventDefault()
      return
    }
  }
}


function drawStatBar(){
  const now = performance.now()

  // layout: top-left corner
  const pad = 14
  const rowH = 36
  const gap  = 6
  const barW = 300   // all bars same length
  const x = Math.floor(pad)
  const y0 = Math.floor(pad)

  // smooth UI tween toward real levels
  for (let i = 0; i < 8; i++){
    const target = statLevels[i] | 0
    const cur = statUiLevels[i] || 0
    statUiLevels[i] = cur + (target - cur) * 0.18
  }

  ctx.save()
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'

  // title bubble with remaining points
  ctx.font = 'bold 20px Inter, system-ui, -apple-system, Segoe UI'
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'
  ctx.lineWidth = 4
  const title = `x${statPoints|0}`
  ctx.strokeText(title, x + barW + 22, y0 - 2)
  ctx.fillText(title,  x + barW + 22, y0 - 2)

  // rows
  ctx.font = '16px Inter, system-ui, -apple-system, Segoe UI'
  for (let i = 0; i < 8; i++){
    const y = y0 + 20 + i * (rowH + gap)

    // clickable rect (canvas pixels)
    statRects[i] = { x, y, w: barW, h: rowH }

    // animation state
    const start = statAnim[i] || 0
    const prog  = start ? Math.min(1, (now - start) / 260) : 1
    const bump  = start ? (1 - (prog*prog)) : 0          // quick ease-out
    const glowA = start ? (1 - prog) * 0.7 : 0

    // base track (same length for all)
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(x, y, barW, rowH)

    // subtle border
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 2
    ctx.strokeRect(x+0.5, y+0.5, barW-1, rowH-1)

    // left-aligned label
    ctx.fillStyle = '#e5e7eb'
    ctx.fillText(statLabels[i] || `Stat ${i+1}`, x + 12, y + rowH/2)

    // level fill (tweened), does not affect total bar length
    const lvl = statUiLevels[i]
    const frac = Math.min(1, lvl / 10)
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.fillRect(x, y, barW * frac, rowH)

    // right key cap
    const keyW = 64
    const kx = x + barW - keyW
    ctx.fillStyle = STAT_COLORS[i] || '#64748b'
    ctx.fillRect(kx, y, keyW, rowH)
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(kx+0.5, y+0.5, keyW-1, rowH-1)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#111827'
    ctx.font = 'bold 15px Inter, system-ui, -apple-system, Segoe UI'
    ctx.fillText(`[${i+1}] +`, kx + keyW/2, y + rowH/2)
    ctx.textAlign = 'left'

    // click bump “glow” overlay
    if (glowA > 0){
      ctx.save()
      ctx.globalAlpha = glowA
      ctx.fillStyle = STAT_COLORS[i] || '#ffffff'
      // slightly expand vertically for a satisfying bump
      const by = y - 2 - 2*bump
      const bh = rowH + 4 + 4*bump
      ctx.fillRect(x, by, barW, bh)
      ctx.restore()
    }
  }

  ctx.restore()
}


  return { handle, exit: onExitClick }
})()



window.GameClient = GameClient
console.log('[Client] GameClient ready (+bullets, click-to-shoot, barrel objects)')
