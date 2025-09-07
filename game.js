import { randomUUID } from 'node:crypto'
import TANK_DEFS from './tankdefs.js'
import BULLET_DEFS from './bulletdefs.js'

export default class Game {
  constructor(players) {
    this.id = randomUUID()
    this.players = players
    this.bounds = { w: 1200, h: 800 }
    this.speed = 300
    this.state = new Map()
    this.inputs = new Map()
    this.closed = false
    this.finishing = false

    const spawn = [
      { x: this.bounds.w * 0.25, y: this.bounds.h * 0.5 },
      { x: this.bounds.w * 0.75, y: this.bounds.h * 0.5 },
    ]

    const roster = players.map(p => ({
      id: p.id,
      name: p.name || `P-${String(p.id).slice(0, 4)}`,
    }))

    const tankKeys = Object.keys(TANK_DEFS)
    function normBarrel(b) {
      if (Array.isArray(b)) {
        const [length, width, forwardOffset, sidewaysOffset, directionRadians] = b
        return { length, width, forwardOffset, sidewaysOffset, directionRadians, bulletType: 'Basic', reload: 0.30 }
      }
      const nb = { ...b }
      nb.bulletType = nb.bulletType || 'Basic'
      nb.reload = typeof nb.reload === 'number' ? nb.reload : 0.30
      return nb
    }

    this.bullets = []
    this._bulletSeq = 1

    players.forEach((p, i) => {
      const tk = tankKeys[Math.floor(Math.random() * tankKeys.length)]
      const def = TANK_DEFS[tk]
      const bodyDamage = Math.round(20 + def.size * 3)
      const barrels = (def.barrels || []).map(normBarrel)
this.state.set(p.id, {
  x: spawn[i % spawn.length].x,
  y: spawn[i % spawn.length].y,
  rot: 0,
  size: def.size,
  health: def.maxHealth,
  maxHealth: def.maxHealth,
  bodyDamage,
  alive: true,
  tankId: tk,
  shape: def.shape,
  barrels,
  reloadTimers: new Array(barrels.length).fill(0),

  // 🔁 knockback velocity (world units per second)
  knockVx: 0,
  knockVy: 0,
})

// ✅ make sure inputs exist so movement works
this.inputs.set(p.id, { w: false, a: false, s: false, d: false })
    })

    const tanksForPlayers = players.map(p => {
      const st = this.state.get(p.id)
            return {
        id: p.id,
        tank: { name: st.tankId, shape: st.shape, size: st.size, barrels: st.barrels },
      }
    })

    players.forEach((p) => {
      const st = this.state.get(p.id)
      safeSend(p.ws, {
        type: 'matchStart',
        gameId: this.id,
        you: p.id,
        w: this.bounds.w,
        h: this.bounds.h,
        roster,
        tanks: tanksForPlayers,
      })

      const onMessage = (msg) => {
        try {
          const d = JSON.parse(msg)
          if (d.type === 'input' && this.inputs.has(p.id)) {
            const st = this.state.get(p.id)
            if (!st?.alive) return
            const inp = this.inputs.get(p.id)
            if (typeof d.w === 'boolean') inp.w = d.w
            if (typeof d.a === 'boolean') inp.a = d.a
            if (typeof d.s === 'boolean') inp.s = d.s
            if (typeof d.d === 'boolean') inp.d = d.d
          }
          if (d.type === 'aim') {
            const st = this.state.get(p.id)
            if (!st?.alive) return
            if (typeof d.angle === 'number' && Number.isFinite(d.angle)) st.rot = normalizeAngle(d.angle)
          }
          if (d.type === 'shoot') {
            const st = this.state.get(p.id)
            if (!st?.alive) return
            this._shootFromTank(p.id, st)
          }
          if (d.type === 'leaveGame') this.end('left')
        } catch {}
      }
      const onClose = () => this.end('dc')
      p._gHandlers = { onMessage, onClose }
      p.ws.on('message', onMessage)
      p.ws.on('close', onClose)
    })

    this.loop = setInterval(() => this.tick(), 1000 / 30)
  }


_spawnBullet(ownerId, x, y, angle, spec, width) {
  const bspec = BULLET_DEFS[spec] || BULLET_DEFS.Basic
  const speed = bspec.speed
  const cos = Math.cos(angle), sin = Math.sin(angle)

  // visual size (also used for collision radius).
  const size = (typeof bspec.size === 'number')
    ? bspec.size
    : Math.max(2, (width || 6) * 0.4)

  const b = {
    id: this._bulletSeq++,
    ownerId,
    x, y,
    vx: cos * speed,
    vy: sin * speed,
    // collision uses r; keep it in sync with visual size
    r: size,
    size,                              // 🔹 for client rendering
    sides: bspec.sides ?? 0,           // 🔹 0=circle, >=3 polygon
    strokeWidth: bspec.strokeWidth ?? 2, // 🔹 outline width in px
    damage: bspec.damage,
    health: bspec.health,
    bornAt: Date.now(),
    life: 0,
    maxLife: 3.0,
  }
  this.bullets.push(b)
}


  _shootFromTank(pid, st) {
    for (let i = 0; i < st.barrels.length; i++) {
      if (st.reloadTimers[i] > 0) continue
      const b = st.barrels[i]
      const dir = (st.rot || 0) + (b.directionRadians || 0)
      const cos = Math.cos(dir), sin = Math.sin(dir)
      const fwd = b.forwardOffset || 0
      const side = b.sidewaysOffset || 0
      const len = b.length || 0
      const baseX = st.x + cos * fwd - sin * side
      const baseY = st.y + sin * fwd + cos * side
      const tipX = baseX + cos * len
      const tipY = baseY + sin * len
      this._spawnBullet(pid, tipX, tipY, dir, b.bulletType || 'Basic', b.width || 6)
      st.reloadTimers[i] = Math.max(0.05, b.reload || 0.30)
    }
  }

  tick() {
    const dt = 1 / 30

    for (const p of this.players) {
      const st = this.state.get(p.id)
      if (!st?.alive) continue
      for (let i = 0; i < st.reloadTimers.length; i++) {
        if (st.reloadTimers[i] > 0) st.reloadTimers[i] = Math.max(0, st.reloadTimers[i] - dt)
      }
    }

for (const p of this.players) {
  const inp = this.inputs.get(p.id)
  const st = this.state.get(p.id)
  if (!inp || !st || !st.alive) continue
  let dx = (inp.d ? 1 : 0) - (inp.a ? 1 : 0)
  let dy = (inp.s ? 1 : 0) - (inp.w ? 1 : 0)
  const len = Math.hypot(dx, dy)
  if (len > 0) { dx /= len; dy /= len }

  // base movement
  st.x += dx * this.speed * dt
  st.y += dy * this.speed * dt

  // ➕ apply knockback velocity then decay
  st.x += (st.knockVx || 0) * dt
  st.y += (st.knockVy || 0) * dt

  // viscous damping (tune as you like)
  const DAMP = 4.0
  st.knockVx = (st.knockVx || 0) * Math.max(0, 1 - DAMP * dt)
  st.knockVy = (st.knockVy || 0) * Math.max(0, 1 - DAMP * dt)

  // keep inside arena
  const r = getBoundingRadius(st)
  st.x = clamp(st.x, r, this.bounds.w - r)
  st.y = clamp(st.y, r, this.bounds.h - r)
}


    for (const b of this.bullets) {
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.life += dt
    }
    this.bullets = this.bullets.filter(b =>
      b.life < b.maxLife &&
      b.x >= -50 && b.x <= this.bounds.w + 50 &&
      b.y >= -50 && b.y <= this.bounds.h + 50 &&
      b.health > 0
    )

    for (let i = 0; i < this.bullets.length; i++) {
      const A = this.bullets[i]
      if (!A) continue
      for (let j = i + 1; j < this.bullets.length; j++) {
        const B = this.bullets[j]
        if (!B) continue
        const dx = B.x - A.x, dy = B.y - A.y
        const sumR = A.r + B.r
        if (dx * dx + dy * dy <= sumR * sumR) {
          if (A.health === B.health) {
            A.health = 0
            B.health = 0
          } else if (A.health > B.health) {
            A.health = A.health - B.health
            B.health = 0
          } else {
            B.health = B.health - A.health
            A.health = 0
          }
          if (A.health <= 0) { this.bullets[i] = null }
          if (B.health <= 0) { this.bullets[j] = null }
        }
      }
    }
    this.bullets = this.bullets.filter(Boolean)

const now = Date.now()
for (const b of this.bullets) {
  for (const p of this.players) {
    const st = this.state.get(p.id)
    if (!st?.alive) continue
    if (p.id === b.ownerId && now - b.bornAt < 120) continue
    const r = getBoundingRadius(st)
    const dx = st.x - b.x, dy = st.y - b.y
    const minD = r + b.r
    if (dx*dx + dy*dy <= minD*minD) {
      // apply damage
      st.health = Math.max(0, st.health - b.damage)

      // 💥 knockback: push along bullet direction, scaled by bullet size
      const speed = Math.hypot(b.vx || 0, b.vy || 0) || 1
      const ux = (b.vx || 0) / speed
      const uy = (b.vy || 0) / speed
      const KNOCK_PER_SIZE = 10   // tweak feel here
      const bulletSize = b.size ?? b.r ?? 3
      const impulse = KNOCK_PER_SIZE * bulletSize
      st.knockVx = (st.knockVx || 0) + ux * impulse
      st.knockVy = (st.knockVy || 0) + uy * impulse

      // bullet consumed
      b.health = 0
    }
  }
}
this.bullets = this.bullets.filter(b => b.health > 0)


    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        const aId = this.players[i].id
        const bId = this.players[j].id
        const A = this.state.get(aId)
        const B = this.state.get(bId)
        if (!A?.alive || !B?.alive) continue
        const shapeA = buildShape(A)
        const shapeB = buildShape(B)
        const mtv = computeMTV(shapeA, shapeB)
        if (mtv.overlap) {
          const pushX = (mtv.axis.x * mtv.depth) / 2
          const pushY = (mtv.axis.y * mtv.depth) / 2
          A.x -= pushX; A.y -= pushY
          B.x += pushX; B.y += pushY
          const rA = getBoundingRadius(A)
          const rB = getBoundingRadius(B)
          A.x = clamp(A.x, rA, this.bounds.w - rA)
          A.y = clamp(A.y, rA, this.bounds.h - rA)
          B.x = clamp(B.x, rB, this.bounds.w - rB)
          B.y = clamp(B.y, rB, this.bounds.h - rB)
          A.health -= B.bodyDamage * dt
          B.health -= A.bodyDamage * dt
        }
      }
    }

    for (const p of this.players) {
      const st = this.state.get(p.id)
      if (!st) continue
      if (st.alive && st.health <= 0) {
        st.health = 0
        st.alive = false
      }
    }

    if (!this.finishing) {
      const alive = this.players.filter(p => this.state.get(p.id)?.alive)
      if (alive.length === 1) {
        this.finishing = true
        const winner = alive[0]
        const winnerName = this.players.find(pp => pp.id === winner.id)?.name || `P-${String(winner.id).slice(0, 4)}`
        this.broadcast({ type: 'announcement', text: `[${winnerName}] has won the battle!` })
        this.broadcast({ type: 'exitCountdown', seconds: 5 })
        setTimeout(() => this.end('victory', { winnerId: winner.id }), 5000)
      } else if (alive.length === 0) {
        this.finishing = true
        this.broadcast({ type: 'announcement', text: `Draw!` })
        this.broadcast({ type: 'exitCountdown', seconds: 5 })
        setTimeout(() => this.end('draw'), 5000)
      }
    }

const payload = {
  type: 'state',
  ts: Date.now(),
  players: this.players.map((p) => {
    const st = this.state.get(p.id)
    return {
      id: p.id,
      x: st.x, y: st.y,
      rot: st.rot,
      size: st.size,
      health: st.health, maxHealth: st.maxHealth,
      alive: st.alive,
      shape: st.shape,
    }
  }),
  bullets: this.bullets.map(b => ({
    id: b.id, ownerId: b.ownerId, x: b.x, y: b.y, vx: b.vx, vy: b.vy,
    r: b.r, size: b.size, sides: b.sides, strokeWidth: b.strokeWidth
  }))
}



    this.broadcast(payload)
  }

  broadcast(obj) {
    for (const p of this.players) safeSend(p.ws, obj)
  }
end(reason = 'end', details = {}) {
  if (this.closed) return
  this.closed = true
  clearInterval(this.loop)
  try {
    this.players.forEach((p) => {
      safeSend(p.ws, { type: 'matchEnd', reason, ...details })
      const h = p._gHandlers
      if (h) {
        try { p.ws.off?.('message', h.onMessage) } catch {}
        try { p.ws.off?.('close',   h.onClose)   } catch {}
        try { p.ws.removeListener?.('message', h.onMessage) } catch {}
        try { p.ws.removeListener?.('close',   h.onClose)   } catch {}
        p._gHandlers = null
      }
    })
  } finally {
    if (this.onEnd) this.onEnd(reason, details)
  }
}
}

function getBoundingRadius(st) { return st.size }
function buildShape(st) {
  if (st.shape === 0) return { kind: 'circle', x: st.x, y: st.y, r: st.size }
  return { kind: 'polygon', verts: regularPolygon(st.x, st.y, st.size, st.shape, st.rot) }
}
function regularPolygon(cx, cy, r, sides, rot = 0) {
  const verts = []
  for (let i = 0; i < sides; i++) {
    const a = rot + (i * 2 * Math.PI) / sides
    verts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  return verts
}
function computeMTV(a, b) {
  if (a.kind === 'circle' && b.kind === 'circle') {
    const dx = b.x - a.x, dy = b.y - a.y
    const d = Math.hypot(dx, dy)
    const minDist = a.r + b.r
    if (d === 0) return { overlap: true, axis: { x: 1, y: 0 }, depth: minDist }
    if (d >= minDist) return { overlap: false, axis: { x: 0, y: 0 }, depth: 0 }
    const nx = dx / d, ny = dy / d
    return { overlap: true, axis: { x: nx, y: ny }, depth: minDist - d }
  }
  if (a.kind === 'polygon' && b.kind === 'polygon') return satPolyPoly(a.verts, b.verts)
  if (a.kind === 'polygon' && b.kind === 'circle') return satPolyCircle(a.verts, b)
  if (a.kind === 'circle' && b.kind === 'polygon') {
    const res = satPolyCircle(b.verts, a)
    return res.overlap ? { overlap: true, axis: { x: -res.axis.x, y: -res.axis.y }, depth: res.depth } : res
  }
  return { overlap: false, axis: { x: 0, y: 0 }, depth: 0 }
}
function satPolyPoly(A,B){ let minOverlap=Infinity,minAxis={x:0,y:0}; for(let pass=0; pass<2; pass++){ const P=pass===0?A:B; for(let i=0;i<P.length;i++){ const j=(i+1)%P.length; const edgeX=P[j].x-P[i].x, edgeY=P[j].y-P[i].y; const axis=normalize({x:-edgeY,y:edgeX}); const [minA,maxA]=projectPoly(A,axis); const [minB,maxB]=projectPoly(B,axis); const overlap=Math.min(maxA,maxB)-Math.max(minA,minB); if(overlap<=0) return {overlap:false,axis:{x:0,y:0},depth:0}; if(overlap<minOverlap){ minOverlap=overlap; const cA=centroid(A), cB=centroid(B); const dir=((cB.x-cA.x)*axis.x+(cB.y-cA.y)*axis.y)<0?-1:1; minAxis={x:axis.x*dir, y:axis.y*dir} }}} return {overlap:true,axis:minAxis,depth:minOverlap}}
function satPolyCircle(verts,circle){ let minOverlap=Infinity,minAxis={x:0,y:0}; for(let i=0;i<verts.length;i++){ const j=(i+1)%verts.length; const edgeX=verts[j].x-verts[i].x, edgeY=verts[j].y-verts[i].y; const axis=normalize({x:-edgeY,y:edgeX}); const [minP,maxP]=projectPoly(verts,axis); const cProj=circle.x*axis.x+circle.y*axis.y; const minC=cProj-circle.r, maxC=cProj+circle.r; const overlap=Math.min(maxP,maxC)-Math.max(minP,minC); if(overlap<=0) return {overlap:false,axis:{x:0,y:0},depth:0}; if(overlap<minOverlap){ minOverlap=overlap; const cPoly=centroid(verts); const dir=(((circle.x-cPoly.x)*axis.x+(circle.y-cPoly.y)*axis.y)<0)?-1:1; minAxis={x:axis.x*dir, y:axis.y*dir} } } let closest=null, minD2=Infinity; for(const v of verts){ const dx=circle.x-v.x, dy=circle.y-v.y; const d2=dx*dx+dy*dy; if(d2<minD2){ minD2=d2; closest=v }} if(closest){ const axis=normalize({x:circle.x-closest.x,y:circle.y-closest.y}); const [minP,maxP]=projectPoly(verts,axis); const cProj=circle.x*axis.x+circle.y*axis.y; const minC=cProj-circle.r, maxC=cProj+circle.r; const overlap=Math.min(maxP,maxC)-Math.max(minP,minC); if(overlap<=0) return {overlap:false,axis:{x:0,y:0},depth:0}; if(overlap<minOverlap){ minOverlap=overlap; minAxis=axis }} return {overlap:true,axis:minAxis,depth:minOverlap}}
function projectPoly(verts,axis){ let min=Infinity,max=-Infinity; for(const v of verts){ const p=v.x*axis.x+v.y*axis.y; if(p<min)min=p; if(p>max)max=p } return [min,max]}
function centroid(verts){ let x=0,y=0; for(const v of verts){ x+=v.x;y+=v.y } const n=verts.length||1; return {x:x/n,y:y/n}}
function normalize(v){ const m=Math.hypot(v.x,v.y); if(m===0) return {x:1,y:0}; return {x:v.x/m,y:v.y/m} }
function normalizeAngle(a){ const two=Math.PI*2; a=((a%two)+two)%two; if(a>Math.PI)a-=two; return a }
function clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)) }
function safeSend(ws,obj){ try{ if(ws&&ws.readyState===1) ws.send(JSON.stringify(obj)) }catch{} }
