const GameClient = (() => {
  const $ = id => document.getElementById(id)
  const RENDER_W = 1600
  const RENDER_H = 900

  let ws = null
  let canvas = null
  let ctx = null
  let running = false
  let anim = 0

  let myId = null
  let world = { w: 2000, h: 2000 }
  let players = []
  let keys = { w:false, a:false, s:false, d:false }

  const camera = { x: 0, y: 0, follow: true }
  let dragging = false

  function start(m){
    ws = window.__wsRef
    myId = m.you
    world = { w: m.w || 2000, h: m.h || 2000 }

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
    canvas.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    canvas.addEventListener('mousemove', onMove)

    running = true
    anim = requestAnimationFrame(loop)
  }

  function stop(){
    running = false
    try{ cancelAnimationFrame(anim) }catch{}
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('keyup', onKey)
    canvas?.removeEventListener('mousedown', onDown)
    window.removeEventListener('mouseup', onUp)
    canvas?.removeEventListener('mousemove', onMove)
    $('gameView').hidden = true
  }

  function handle(msg){
    if (msg.type === 'matchStart'){ start(msg); return true }
    if (!running) return false
    if (msg.type === 'state'){ players = msg.players || []; return true }
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
      if (k==='c'){ camera.follow = !camera.follow }
    } else {
      if (k==='w'||k==='arrowup'){ if(keys.w){ keys.w=false; changed=true } }
      if (k==='a'||k==='arrowleft'){ if(keys.a){ keys.a=false; changed=true } }
      if (k==='s'||k==='arrowdown'){ if(keys.s){ keys.s=false; changed=true } }
      if (k==='d'||k==='arrowright'){ if(keys.d){ keys.d=false; changed=true } }
    }
    if (changed && ws && ws.readyState===1) ws.send(JSON.stringify({ type:'input', ...keys }))
  }

  function onDown(){ dragging = true }
  function onUp(){ dragging = false }
  function onMove(e){
    if (!dragging) return
    const dx = e.movementX / canvas.clientWidth * RENDER_W
    const dy = e.movementY / canvas.clientHeight * RENDER_H
    camera.x -= dx
    camera.y -= dy
    camera.follow = false
  }

  function loop(){
    if (!running) return

    const me = players.find(p=>p.id===myId)
    if (camera.follow && me){ camera.x = me.x; camera.y = me.y }

    ctx.clearRect(0,0,RENDER_W,RENDER_H)
    drawWorld()
    drawPlayers()

    anim = requestAnimationFrame(loop)
  }

  function drawWorld(){
    ctx.fillStyle = '#0b1220'
    ctx.fillRect(0,0,RENDER_W,RENDER_H)

    ctx.strokeStyle = '#1f2a44'
    ctx.lineWidth = 1

    const grid = 80
    const left = screenToWorldX(0), right = screenToWorldX(RENDER_W)
    const top = screenToWorldY(0), bottom = screenToWorldY(RENDER_H)

    const startX = Math.floor(left / grid) * grid
    const endX = Math.ceil(right / grid) * grid
    const startY = Math.floor(top / grid) * grid
    const endY = Math.ceil(bottom / grid) * grid

    ctx.beginPath()
    for (let x = startX; x <= endX; x += grid) {
      const sx = worldToScreenX(x)
      ctx.moveTo(sx, 0); ctx.lineTo(sx, RENDER_H)
    }
    for (let y = startY; y <= endY; y += grid) {
      const sy = worldToScreenY(y)
      ctx.moveTo(0, sy); ctx.lineTo(RENDER_W, sy)
    }
    ctx.stroke()
  }

  function drawPlayers(){
    for (const p of players){
      const x = worldToScreenX(p.x)
      const y = worldToScreenY(p.y)
      ctx.fillStyle = (p.id===myId) ? '#34d399' : '#60a5fa'
      ctx.beginPath()
      ctx.arc(x, y, 14, 0, Math.PI*2)
      ctx.fill()
    }
  }

  function worldToScreenX(wx){ return Math.floor((wx - camera.x) + RENDER_W/2) }
  function worldToScreenY(wy){ return Math.floor((wy - camera.y) + RENDER_H/2) }
  function screenToWorldX(sx){ return (sx - RENDER_W/2) + camera.x }
  function screenToWorldY(sy){ return (sy - RENDER_H/2) + camera.y }

  function exit(){
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type:'leaveGame' }))
    stop()
    window.__onMatchEnd && window.__onMatchEnd()
  }

return { handle, exit }
})()

// expose globally so mainmenu.js can call it
window.GameClient = GameClient
console.log('[Client] GameClient ready')
