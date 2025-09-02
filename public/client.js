const GameClient = (() => {
  const $ = (id) => document.getElementById(id)

  // interpolation / camera
  const INTERP_DELAY_MS = 120
  const MAX_SNAPSHOTS = 90
  const OFFSET_SMOOTH = 0.12
  const CAM_SMOOTH = 0.2
  const STROKE_W = 4

  // spectator tuning
  const SPEC_PAN_PX_PER_S = 1000       // panning speed in screen px/s
  const ZOOM_MIN = 0.5
  const ZOOM_MAX = 3.0
  const ZOOM_SMOOTH = 0.22             // smoothing for zoom easing
  const ZOOM_STEP_KEYS = 1.12          // +/- keys scale per press
  const ZOOM_WHEEL_BASE = 1.0015       // wheel scaling base (applied to deltaY)

  let ws = null
  let canvas = null
  let ctx = null
  let running = false
  let anim = 0

  let myId = null
  let world = { w: 2000, h: 2000 }

  // HiDPI
  let dpr = Math.min(window.devicePixelRatio || 1, 3)
  let viewW = 0, viewH = 0

  // movement keys sent to server (when alive)
  let keys = { w: false, a: false, s: false, d: false }

  // snapshots
  const snapshots = []
  let serverOffset = 0

  // names & tanks
  const names = new Map()   // id -> username
  const tanks = new Map()   // id -> { name, shape, size, barrels }

  // camera & zoom
  const camera = { x: 0, y: 0 }
  let zoom = 1
  let targetZoom = 1

  // spectator state
  let isSpectator = false
  const specKeys = { up: false, left: false, down: false, right: false }

  // UI
  let announceText = null
  let announceUntil = 0
  let exitCountdownSecs = 0
  let exitCountdownStart = 0

  // mouse aim
  let mouseCssX = 0, mouseCssY = 0
  let lastAimSent = 0
  let lastAngleSent = 0

  // frame timing
  let lastFrameTs = 0

  function start(m) {
    ws = window.__wsRef
    myId = m.you
    world = { w: m.w || 2000, h: m.h || 2000 }

    names.clear()
    if (Array.isArray(m.roster)) {
      m.roster.forEach((r) => names.set(r.id, r.name || `P-${String(r.id).slice(0, 4)}`))
    }
    tanks.clear()
    if (Array.isArray(m.tanks)) {
      m.tanks.forEach(({ id, tank }) => tanks.set(id, tank))
    }

    canvas = $('gameCanvas')
    ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })
    resizeCanvas()
    window.addEventListener('resize', onResize, { passive: true })

    $('queueScreen') && ($('queueScreen').hidden = true)
    $('gameView') && ($('gameView').hidden = false)

    window.addEventListener('keydown', onKey, { passive: false })
    window.addEventListener('keyup', onKey, { passive: false })
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: false }) // wheel zoom

    running = true
    lastFrameTs = performance.now()
    anim = requestAnimationFrame(loop)

    announceText = null
    announceUntil = 0
    exitCountdownSecs = 0
    exitCountdownStart = 0
    isSpectator = false
    zoom = targetZoom = 1
  }

  function stop() {
    running = false
    try { cancelAnimationFrame(anim) } catch {}
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('keyup', onKey)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('wheel', onWheel)
    $('gameView') && ($('gameView').hidden = true)
    snapshots.length = 0
    names.clear()
    tanks.clear()
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
      for (const p of msg.players || []) {
        map.set(p.id, {
          x: p.x, y: p.y,
          rot: p.rot ?? 0,
          size: p.size,
          health: p.health, maxHealth: p.maxHealth,
          alive: p.alive !== false,
          shape: p.shape ?? (tanks.get(p.id)?.shape || 0),
        })
      }
      snapshots.push({ ts: msg.ts ?? Date.now() - serverOffset, map })
      if (snapshots.length > MAX_SNAPSHOTS) snapshots.shift()

      const me = map.get(myId)
      const newSpectator = me ? !me.alive : true
      if (newSpectator !== isSpectator) {
        isSpectator = newSpectator
        if (!isSpectator) {
          // back alive: restore default view
          targetZoom = zoom = 1
          specKeys.up = specKeys.left = specKeys.down = specKeys.right = false
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

    if (msg.type === 'matchEnd') { stop(); window.__onMatchEnd && window.__onMatchEnd(msg); return true }
    return false
  }

  /* ====== input ====== */
  function onKey(e) {
    const k = e.key.toLowerCase()
    const isMoveKey = ['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(k)
    const isZoomKey = k === '-' || k === '_' || k === '+' || k === '='

    if (isMoveKey || (isSpectator && isZoomKey)) e.preventDefault()

    if (e.type === 'keydown') {
      if (isSpectator) {
        // spectator camera control
        if (k === 'w' || k === 'arrowup') specKeys.up = true
        if (k === 'a' || k === 'arrowleft') specKeys.left = true
        if (k === 's' || k === 'arrowdown') specKeys.down = true
        if (k === 'd' || k === 'arrowright') specKeys.right = true

        if (isZoomKey) {
          if (k === '-' || k === '_') targetZoom = clamp(targetZoom / ZOOM_STEP_KEYS, ZOOM_MIN, ZOOM_MAX)
          if (k === '+' || k === '=') targetZoom = clamp(targetZoom * ZOOM_STEP_KEYS, ZOOM_MIN, ZOOM_MAX)
        }
      } else {
        // alive: send movement to server (unchanged)
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

  function onWheel(e) {
    if (!isSpectator) return
    e.preventDefault()
    const factor = Math.pow(ZOOM_WHEEL_BASE, e.deltaY)
    targetZoom = clamp(targetZoom * factor, ZOOM_MIN, ZOOM_MAX)
  }

  /* ====== HiDPI ====== */
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

  /* ====== interpolation ====== */
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

  /* ====== render loop ====== */
  function loop(now) {
    if (!running) return
    const dt = Math.max(0.001, (now - lastFrameTs) / 1000)
    lastFrameTs = now

    // zoom easing
    zoom += (targetZoom - zoom) * ZOOM_SMOOTH
    if (!isSpectator) zoom = targetZoom = 1 // keep gameplay exactly as before

    const renderServerTime = Date.now() - serverOffset - INTERP_DELAY_MS
    const players = getInterpolated(renderServerTime)

    const me = players.find(p => p.id === myId)

    if (isSpectator) {
      // WASD pans in screen pixels -> convert to world units by dividing by zoom
      const vx = (specKeys.right ? 1 : 0) - (specKeys.left ? 1 : 0)
      const vy = (specKeys.down ? 1 : 0) - (specKeys.up ? 1 : 0)
      let len = Math.hypot(vx, vy)
      if (len > 0) {
        const inv = 1 / len
        camera.x += (vx * SPEC_PAN_PX_PER_S * inv) * dt / zoom
        camera.y += (vy * SPEC_PAN_PX_PER_S * inv) * dt / zoom
      }
    } else if (me) {
      // follow player smoothly (unchanged)
      camera.x += (me.x - camera.x) * CAM_SMOOTH
      camera.y += (me.y - camera.y) * CAM_SMOOTH
      maybeSendAim(me) // only send aim while alive
    }

    // clamp camera CENTER to world border (no viewport-margin clamp)
    camera.x = clamp(camera.x, 0, world.w)
    camera.y = clamp(camera.y, 0, world.h)

    ctx.clearRect(0, 0, viewW, viewH)
    drawWorld()
    drawPlayers(players)
    drawAnnouncements()
    drawExitCountdown()
    if (me && !me.alive) drawDeathOverlay()

    anim = requestAnimationFrame(loop)
  }

  /* ====== aim sending (only when alive) ====== */
  function maybeSendAim(me) {
    // mouse in world space (zoom-aware)
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

  /* ====== drawing ====== */
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
    ctx.restore()
  }

  function drawPlayers(ps) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.font = '20px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'

    for (const p of ps) {
      const tank = tanks.get(p.id)
      const x = worldToScreenX(p.x)
      const y = worldToScreenY(p.y)
      const rWorld = Math.max(8, p.size || tank?.size || 16)
      const r = rWorld * zoom

      // COLORS
      const fill = !p.alive ? '#4b5563' : (p.id === myId ? '#34d399' : '#60a5fa')
      const stroke = darker(fill, 0.6)

      // --- UNDERLAY: BARRELS FIRST (below body) ---
      if (tank?.barrels?.length) {
        ctx.lineWidth = STROKE_W
        ctx.fillStyle = '#9ca3af'   // grey
        ctx.strokeStyle = '#4b5563' // darker grey
        for (const b of tank.barrels) {
          const [len, wid, fwd, side, dir] = b
          drawBarrelRot(x, y, len * zoom, wid * zoom, fwd * zoom, side * zoom, (p.rot || 0) + dir)
        }
      }

      // --- BODY ON TOP OF BARRELS ---
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

      // --- UI OVERLAY (health + name) ---
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
      ctx.fillStyle = p.id === myId ? '#e6fff4' : '#f3f7ff'; ctx.fillText(label, x, barY - 4)
    }
  }

  function drawBarrelRot(cx, cy, len, wid, fwd, side, angle) {
    const cos = Math.cos(angle), sin = Math.sin(angle)

    // offset the base by rotated forward/side offsets
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

  /* ====== helpers ====== */
  function regularPolygonScreen(cx, cy, r, sides, rot = 0) {
    const out = []
    for (let i = 0; i < sides; i++) {
      const a = rot + (i * 2 * Math.PI) / sides
      out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
    }
    return out
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

  // zoom-aware transforms
  function worldToScreenX(wx) { return Math.floor((wx - camera.x) * zoom + viewW / 2) }
  function worldToScreenY(wy) { return Math.floor((wy - camera.y) * zoom + viewH / 2) }

  function lerpAngle(a, b, t) {
    const two = Math.PI * 2
    let diff = ((b - a + Math.PI) % (two)) - Math.PI
    return a + diff * t
  }
  function angleDelta(a, b) {
    const two = Math.PI * 2
    let d = ((a - b + Math.PI) % two) - Math.PI
    return d
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

  function onExitClick() {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'leaveGame' }))
    stop()
    window.__onMatchEnd && window.__onMatchEnd()
  }

  return { handle, exit: onExitClick }
})()

window.GameClient = GameClient
console.log('[Client] GameClient ready (hi-res + rotation + barrel-underlay + spectator cam center-clamp)')
