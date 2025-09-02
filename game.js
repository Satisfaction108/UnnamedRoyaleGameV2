<<<<<<< Updated upstream
﻿import { randomUUID } from 'node:crypto'
import TANK_DEFS from './tankdefs.js'
=======
import { randomUUID } from 'node:crypto'
>>>>>>> Stashed changes

export default class Game {
  constructor(players) {
    this.id = randomUUID()
    this.players = players
    this.bounds = { w: 1200, h: 800 }
    this.speed = 300
    this.state = new Map()  // id -> player state
    this.inputs = new Map() // id -> {w,a,s,d}
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

<<<<<<< Updated upstream
    const tankKeys = Object.keys(TANK_DEFS)
=======
    // build roster once
    const roster = players.map(p => ({ id: p.id, name: p.name || `P-${String(p.id).slice(0,4)}` }))
>>>>>>> Stashed changes

    // initialize players
    players.forEach((p, i) => {
      const tk = tankKeys[Math.floor(Math.random() * tankKeys.length)]
      const def = TANK_DEFS[tk]
      const bodyDamage = Math.round(20 + def.size * 3)

      this.state.set(p.id, {
        x: spawn[i % spawn.length].x,
        y: spawn[i % spawn.length].y,
        rot: 0, // radians, facing +X
        size: def.size,
        health: def.maxHealth,
        maxHealth: def.maxHealth,
        bodyDamage,
        alive: true,
        tankId: tk,
        shape: def.shape,
        barrels: def.barrels,
      })
      this.inputs.set(p.id, { w: false, a: false, s: false, d: false })
    })

    // send match start info (+ tanks)
    const tanksForPlayers = players.map(p => {
      const st = this.state.get(p.id)
      return {
        id: p.id,
        tank: { name: st.tankId, shape: st.shape, size: st.size, barrels: st.barrels },
      }
    })

    players.forEach((p) => {
      safeSend(p.ws, {
        type: 'matchStart',
        gameId: this.id,
        you: p.id,
        w: this.bounds.w,
        h: this.bounds.h,
        roster,
        tanks: tanksForPlayers,
      })

      p.ws.on('message', (msg) => {
        try {
          const d = JSON.parse(msg)

          // keyboard movement input
          if (d.type === 'input' && this.inputs.has(p.id)) {
            const st = this.state.get(p.id)
            if (!st?.alive) return
            const inp = this.inputs.get(p.id)
            if (typeof d.w === 'boolean') inp.w = d.w
            if (typeof d.a === 'boolean') inp.a = d.a
            if (typeof d.s === 'boolean') inp.s = d.s
            if (typeof d.d === 'boolean') inp.d = d.d
          }

          // mouse aim (rotation in radians)
          if (d.type === 'aim') {
            const st = this.state.get(p.id)
            if (!st?.alive) return
            if (typeof d.angle === 'number' && Number.isFinite(d.angle)) {
              st.rot = normalizeAngle(d.angle)
            }
          }

          if (d.type === 'leaveGame') this.end('left')
        } catch {}
      })

      p.ws.on('close', () => this.end('dc'))
    })

    this.loop = setInterval(() => this.tick(), 1000 / 30)
  }

  tick() {
    const dt = 1 / 30

    // movement
    for (const p of this.players) {
      const inp = this.inputs.get(p.id)
      const st = this.state.get(p.id)
      if (!inp || !st || !st.alive) continue

      let dx = (inp.d ? 1 : 0) - (inp.a ? 1 : 0)
      let dy = (inp.s ? 1 : 0) - (inp.w ? 1 : 0)
      const len = Math.hypot(dx, dy)
      if (len > 0) { dx /= len; dy /= len }
      const r = getBoundingRadius(st)
      st.x = clamp(st.x + dx * this.speed * dt, r, this.bounds.w - r)
      st.y = clamp(st.y + dy * this.speed * dt, r, this.bounds.h - r)
    }

    // collisions (SAT with rotation)
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        const aId = this.players[i].id
        const bId = this.players[j].id
        const A = this.state.get(aId)
        const B = this.state.get(bId)
        if (!A?.alive || !B?.alive) continue

        const shapeA = buildShape(A) // uses A.rot
        const shapeB = buildShape(B) // uses B.rot
        const mtv = computeMTV(shapeA, shapeB)
        if (mtv.overlap) {
          const pushX = (mtv.axis.x * mtv.depth) / 2
          const pushY = (mtv.axis.y * mtv.depth) / 2
          A.x -= pushX; A.y -= pushY
          B.x += pushX; B.y += pushY

          // clamp inside arena using bounding radius
          const rA = getBoundingRadius(A)
          const rB = getBoundingRadius(B)
          A.x = clamp(A.x, rA, this.bounds.w - rA)
          A.y = clamp(A.y, rA, this.bounds.h - rA)
          B.x = clamp(B.x, rB, this.bounds.w - rB)
          B.y = clamp(B.y, rB, this.bounds.h - rB)

          // body damage while overlapping
          A.health -= B.bodyDamage * dt
          B.health -= A.bodyDamage * dt
        }
      }
    }

    // deaths (don’t end match yet)
    for (const p of this.players) {
      const st = this.state.get(p.id)
      if (!st) continue
      if (st.alive && st.health <= 0) {
        st.health = 0
        st.alive = false
      }
    }

    // victory condition (1 alive) or draw (0 alive)
    if (!this.finishing) {
      const alive = this.players.filter(p => this.state.get(p.id)?.alive)
      if (alive.length === 1) {
        this.finishing = true
        const winner = alive[0]
        const winnerName = this.players.find(pp => pp.id === winner.id)?.name
          || `P-${String(winner.id).slice(0, 4)}`
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

    // broadcast state
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
      })
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
    this.players.forEach((p) => {
      safeSend(p.ws, { type: 'matchEnd', reason, ...details })
      try { p.ws.removeAllListeners('message') } catch {}
      try { p.ws.removeAllListeners('close') } catch {}
    })
    if (this.onEnd) this.onEnd(reason, details)
  }
}

/* ---------- geometry / SAT ---------- */

function getBoundingRadius(st) {
  // circumscribed radius works for circle & regular polygon
  return st.size
}

function buildShape(st) {
  if (st.shape === 0) {
    return { kind: 'circle', x: st.x, y: st.y, r: st.size }
  } else {
    return { kind: 'polygon', verts: regularPolygon(st.x, st.y, st.size, st.shape, st.rot) }
  }
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

function satPolyPoly(A, B) {
  let minOverlap = Infinity
  let minAxis = { x: 0, y: 0 }
  for (let pass = 0; pass < 2; pass++) {
    const P = pass === 0 ? A : B
    for (let i = 0; i < P.length; i++) {
      const j = (i + 1) % P.length
      const edgeX = P[j].x - P[i].x
      const edgeY = P[j].y - P[i].y
      const axis = normalize({ x: -edgeY, y: edgeX })
      const [minA, maxA] = projectPoly(A, axis)
      const [minB, maxB] = projectPoly(B, axis)
      const overlap = Math.min(maxA, maxB) - Math.max(minA, minB)
      if (overlap <= 0) return { overlap: false, axis: { x: 0, y: 0 }, depth: 0 }
      if (overlap < minOverlap) {
        minOverlap = overlap
        const cA = centroid(A), cB = centroid(B)
        const dir = ((cB.x - cA.x) * axis.x + (cB.y - cA.y) * axis.y) < 0 ? -1 : 1
        minAxis = { x: axis.x * dir, y: axis.y * dir }
      }
    }
  }
  return { overlap: true, axis: minAxis, depth: minOverlap }
}

function satPolyCircle(verts, circle) {
  let minOverlap = Infinity
  let minAxis = { x: 0, y: 0 }

  // test polygon normals
  for (let i = 0; i < verts.length; i++) {
    const j = (i + 1) % verts.length
    const edgeX = verts[j].x - verts[i].x
    const edgeY = verts[j].y - verts[i].y
    const axis = normalize({ x: -edgeY, y: edgeX })
    const [minP, maxP] = projectPoly(verts, axis)
    const cProj = circle.x * axis.x + circle.y * axis.y
    const minC = cProj - circle.r
    const maxC = cProj + circle.r
    const overlap = Math.min(maxP, maxC) - Math.max(minP, minC)
    if (overlap <= 0) return { overlap: false, axis: { x: 0, y: 0 }, depth: 0 }
    if (overlap < minOverlap) {
      minOverlap = overlap
      const cPoly = centroid(verts)
      const dir = (((circle.x - cPoly.x) * axis.x + (circle.y - cPoly.y) * axis.y) < 0) ? -1 : 1
      minAxis = { x: axis.x * dir, y: axis.y * dir }
    }
  }

  // axis to closest vertex
  let closest = null, minD2 = Infinity
  for (const v of verts) {
    const dx = circle.x - v.x, dy = circle.y - v.y
    const d2 = dx * dx + dy * dy
    if (d2 < minD2) { minD2 = d2; closest = v }
  }
  if (closest) {
    const axis = normalize({ x: circle.x - closest.x, y: circle.y - closest.y })
    const [minP, maxP] = projectPoly(verts, axis)
    const cProj = circle.x * axis.x + circle.y * axis.y
    const minC = cProj - circle.r
    const maxC = cProj + circle.r
    const overlap = Math.min(maxP, maxC) - Math.max(minP, minC)
    if (overlap <= 0) return { overlap: false, axis: { x: 0, y: 0 }, depth: 0 }
    if (overlap < minOverlap) { minOverlap = overlap; minAxis = axis }
  }

  return { overlap: true, axis: minAxis, depth: minOverlap }
}

function projectPoly(verts, axis) {
  let min = Infinity, max = -Infinity
  for (const v of verts) {
    const p = v.x * axis.x + v.y * axis.y
    if (p < min) min = p
    if (p > max) max = p
  }
  return [min, max]
}

function centroid(verts) {
  let x = 0, y = 0
  for (const v of verts) { x += v.x; y += v.y }
  const n = verts.length || 1
  return { x: x / n, y: y / n }
}

function normalize(v) {
  const m = Math.hypot(v.x, v.y)
  if (m === 0) return { x: 1, y: 0 }
  return { x: v.x / m, y: v.y / m }
}

function normalizeAngle(a) {
  const two = Math.PI * 2
  a = ((a % two) + two) % two
  if (a > Math.PI) a -= two
  return a
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
function safeSend(ws, obj) { try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)) } catch {} }
