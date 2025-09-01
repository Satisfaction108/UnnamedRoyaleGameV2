const GameClient = (() => {
  const $ = id => document.getElementById(id)

  const RENDER_W = 1600
  const RENDER_H = 900

  const INTERP_DELAY_MS = 120
  const MAX_SNAPSHOTS    = 90
  const OFFSET_SMOOTH    = 0.12
  const CAM_SMOOTH       = 0.20

  let ws = null
  let canvas = null
  let ctx = null
  let running = false
  let anim = 0

  let myId = null
  let world = { w: 2000, h: 2000 }

  let keys = { w:false, a:false, s:false, d:false }

  // snapshots for interpolation
  const snapshots = []
  let serverOffset = 0

  // names: id -> username
  const names = new Map()

  const camera = { x: 0, y: 0 }

  function start(m){
    ws = window.__wsRef
    myId = m.you
    world = { w: m.w || 2000, h: m.h || 2000 }

    // load roster (id->name)
    if (Array.isArray(m.roster)) {
      names.clear()
      m.roster.forEach(r => names.set(r.id, r.name || `P-${String(r.id).slice(0,4)}`))
    }

    canvas = $('gameCanvas')
    ctx = canvas.getContext('2d', { alpha:false, desynchronized:true })
    canvas.width = RENDER_W
    canvas.height = RENDER_H
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'

    $('queueScreen').hidden = true
    $('gameView').hidden = false

    window.addEventListener('keydown', onKey, { passive:false })
    window.addEventListener('keyup', onKey, { passive:false })

    running = true
    anim = requestAnimationFrame(loop)
  }

  function stop(){
    running = false
    try{ cancelAnimationFrame(anim) }catch{}
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('keyup', onKey)
    $('gameView').hidden = true
    snapshots.length = 0
    names.clear()
  }

  function handle(msg){
    if (msg.type === 'matchStart'){ start(msg); return true }
    if (!running) return false

    if (msg.type === 'state'){
      if (typeof msg.ts === 'number'){
        const estimate = Date.now() - msg.ts
        serverOffset += (estimate - serverOffset) * OFFSET_SMOOTH
      }
      const map = new Map()
      for (const p of msg.players || []) map.set(p.id, { x:p.x, y:p.y })
      snapshots.push({ ts: msg.ts ?? Date.now() - serverOffset, map })
      if (snapshots.length > MAX_SNAPSHOTS) snapshots.shift()
      return true
    }

    if (msg.type === 'matchEnd'){ stop(); window.__onMatchEnd && window.__onMatchEnd(); return true }
    return false
  }

  function onKey(e){
    const k = e.key.toLowerCase()
    if (['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright',' '].includes(k)) e.preventDefault()
    let changed = false
    if (e.type === 'keydown') {
      if (k==='w'||k==='arrowup'){ if(!keys.w){ keys.w=true; changed=true } }
      if (k==='a'||k==='arrowleft'){ if(!keys.a){ keys.a=true; changed=true } }
      if (k==='s'||k==='arrowdown'){ if(!keys.s){ keys.s=true; changed=true } }
      if (k==='d'||k==='arrowright'){ if(!keys.d){ keys.d=true; changed=true } }
    } else {
      if (k==='w'||k==='arrowup'){ if(keys.w){ keys.w=false; changed=true } }
      if (k==='a'||k==='arrowleft'){ if(keys.a){ keys.a=false; changed=true } }
      if (k==='s'||k==='arrowdown'){ if(keys.s){ keys.s=false; changed=true } }
      if (k==='d'||k==='arrowright'){ if(keys.d){ keys.d=false; changed=true } }
    }
    if (changed && ws && ws.readyState===1) ws.send(JSON.stringify({ type:'input', ...keys }))
  }

  function getInterpolated(renderServerTime){
    if (snapshots.length === 0) return []
    if (snapshots.length === 1) {
      const only = snapshots[0].map
      return [...only.entries()].map(([id, p]) => ({ id, x:p.x, y:p.y }))
    }
    let i = snapshots.length - 2
    while (i >= 0 && snapshots[i].ts > renderServerTime) i--
    const a = Math.max(0, i)
    const b = Math.min(snapshots.length - 1, a + 1)
    const s0 = snapshots[a], s1 = snapshots[b]
    const t0 = s0.ts, t1 = s1.ts
    const t = (t1 === t0) ? 1 : Math.max(0, Math.min(1, (renderServerTime - t0) / (t1 - t0)))

    const out = []
    const ids = new Set([...s0.map.keys(), ...s1.map.keys()])
    ids.forEach(id => {
      const p0 = s0.map.get(id) || s1.map.get(id)
      const p1 = s1.map.get(id) || s0.map.get(id)
      const x = p0.x + (p1.x - p0.x) * t
      const y = p0.y + (p1.y - p0.y) * t
      out.push({ id, x, y })
    })
    return out
  }

  function loop(){
    if (!running) return

    const renderServerTime = Date.now() - serverOffset - INTERP_DELAY_MS
    const players = getInterpolated(renderServerTime)

    const me = players.find(p => p.id === myId)
    if (me){
      camera.x += (me.x - camera.x) * CAM_SMOOTH
      camera.y += (me.y - camera.y) * CAM_SMOOTH
    }

    ctx.clearRect(0,0,RENDER_W,RENDER_H)
    drawWorld()
    drawPlayers(players)

    anim = requestAnimationFrame(loop)
  }

  function drawWorld(){
    ctx.fillStyle = '#05080f'
    ctx.fillRect(0,0,RENDER_W,RENDER_H)

    const left   = worldToScreenX(0)
    const top    = worldToScreenY(0)
    const right  = worldToScreenX(world.w)
    const bottom = worldToScreenY(world.h)
    const w = right - left
    const h = bottom - top

    ctx.fillStyle = '#0b1220'
    ctx.fillRect(left, top, w, h)

    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 2
    ctx.strokeRect(left + 1, top + 1, w - 2, h - 2)

    ctx.save()
    ctx.beginPath()
    ctx.rect(left, top, w, h)
    ctx.clip()

    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 1

    const grid = 100
    const startX = 0
    const endX   = world.w
    const startY = 0
    const endY   = world.h

    ctx.beginPath()
    for (let x = startX; x <= endX; x += grid) {
      const sx = worldToScreenX(x)
      ctx.moveTo(sx, top); ctx.lineTo(sx, bottom)
    }
    for (let y = startY; y <= endY; y += grid) {
      const sy = worldToScreenY(y)
      ctx.moveTo(left, sy); ctx.lineTo(right, sy)
    }
    ctx.stroke()
    ctx.restore()
  }

  function drawPlayers(ps){
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.font = '20px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'

    for (const p of ps){
      const x = worldToScreenX(p.x)
      const y = worldToScreenY(p.y)

      // circle
      ctx.fillStyle = (p.id===myId) ? '#34d399' : '#60a5fa'
      ctx.beginPath()
      ctx.arc(x, y, 14, 0, Math.PI*2)
      ctx.fill()

      // label
      const label = names.get(p.id) || `P-${String(p.id).slice(0,4)}`
      const offset = 18
      // subtle stroke for readability
      ctx.lineWidth = 4
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'
      ctx.strokeText(label, x, y - 14 - 4)
      // fill (own name slightly tinted)
      ctx.fillStyle = (p.id===myId) ? '#e6fff4' : '#f3f7ff'
      ctx.fillText(label, x, y - 14 - 4)
    }
  }

  function worldToScreenX(wx){ return Math.floor((wx - camera.x) + RENDER_W/2) }
  function worldToScreenY(wy){ return Math.floor((wy - camera.y) + RENDER_H/2) }

  function exit(){
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type:'leaveGame' }))
    stop()
    window.__onMatchEnd && window.__onMatchEnd()
  }

  return { handle, exit }
})()

window.GameClient = GameClient
console.log('[Client] GameClient ready')
