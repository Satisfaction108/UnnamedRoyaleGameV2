import { randomUUID } from 'node:crypto'

export default class Game {
  constructor(players) {
    this.id = randomUUID()
    this.players = players
    this.bounds = { w: 1200, h: 800 }
    this.speed = 300
    // id -> { x, y, size, health, maxHealth, bodyDamage, alive }
    this.state = new Map()
    this.inputs = new Map()
    this.closed = false
    this.finishing = false // when true we’re counting down to exit

    const spawn = [
      { x: this.bounds.w * 0.25, y: this.bounds.h * 0.5 },
      { x: this.bounds.w * 0.75, y: this.bounds.h * 0.5 }
    ]

    // Build roster for name labels
    const roster = players.map((p) => ({
      id: p.id,
      name: p.name || `P-${String(p.id).slice(0, 4)}`
    }))

    players.forEach((p, i) => {
      const size = randInt(12, 26) // radius (affects hitbox & draw)
      const maxHealth = Math.round(100 + size * 8)
      const bodyDamage = Math.round(20 + size * 3) // DPS while overlapping

      this.state.set(p.id, {
        x: spawn[i % spawn.length].x,
        y: spawn[i % spawn.length].y,
        size,
        health: maxHealth,
        maxHealth,
        bodyDamage,
        alive: true
      })
      this.inputs.set(p.id, { w: false, a: false, s: false, d: false })

      // Tell each player the match started (world size + roster)
      safeSend(p.ws, {
        type: 'matchStart',
        gameId: this.id,
        you: p.id,
        w: this.bounds.w,
        h: this.bounds.h,
        roster
      })

      // Input & leave handling
      p.ws.on('message', (msg) => {
        try {
          const d = JSON.parse(msg)
          if (d.type === 'input' && this.inputs.has(p.id)) {
            const st = this.state.get(p.id)
            if (!st?.alive) return
            const inp = this.inputs.get(p.id)
            inp.w = !!d.w
            inp.a = !!d.a
            inp.s = !!d.s
            inp.d = !!d.d
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

    // Movement (respect radius when clamping to bounds)
    for (const p of this.players) {
      const inp = this.inputs.get(p.id)
      const st = this.state.get(p.id)
      if (!inp || !st || !st.alive) continue

      let dx = (inp.d ? 1 : 0) - (inp.a ? 1 : 0)
      let dy = (inp.s ? 1 : 0) - (inp.w ? 1 : 0)
      const len = Math.hypot(dx, dy)
      if (len > 0) {
        dx /= len
        dy /= len
      }
      st.x = clamp(st.x + dx * this.speed * dt, st.size, this.bounds.w - st.size)
      st.y = clamp(st.y + dy * this.speed * dt, st.size, this.bounds.h - st.size)
    }

    // Collision resolution + body damage
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        const aId = this.players[i].id
        const bId = this.players[j].id
        const A = this.state.get(aId)
        const B = this.state.get(bId)
        if (!A?.alive || !B?.alive) continue

        const dx = B.x - A.x
        const dy = B.y - A.y
        const dist = Math.hypot(dx, dy)
        const minDist = A.size + B.size

        if (dist > 0 && dist < minDist) {
          // Push them apart evenly
          const nx = dx / dist
          const ny = dy / dist
          const overlap = minDist - dist
          const push = overlap / 2

          A.x = clamp(A.x - nx * push, A.size, this.bounds.w - A.size)
          A.y = clamp(A.y - ny * push, A.size, this.bounds.h - A.size)
          B.x = clamp(B.x + nx * push, B.size, this.bounds.w - B.size)
          B.y = clamp(B.y + ny * push, B.size, this.bounds.h - B.size)

          // Deal DPS while overlapping
          A.health -= B.bodyDamage * dt
          B.health -= A.bodyDamage * dt
        }
      }
    }

    // Death check (players remain in match; we only end after victory condition)
    for (const p of this.players) {
      const st = this.state.get(p.id)
      if (!st) continue
      if (st.alive && st.health <= 0) {
        st.health = 0
        st.alive = false
        // optional: one-time death ping to clients if you want separate UI
        // this.broadcast({ type: 'playerDied', id: p.id })
      }
    }

    // Victory condition: exactly one player alive
    if (!this.finishing) {
      const alive = this.players.filter((p) => this.state.get(p.id)?.alive)
      if (alive.length === 1) {
        this.finishing = true
        const winner = alive[0]
        const winnerName = this.players
          .map((pp) => ({ id: pp.id, name: pp.name || `P-${String(pp.id).slice(0, 4)}` }))
          .find((x) => x.id === winner.id)?.name ?? 'Unknown'

        this.broadcast({
          type: 'announcement',
          text: `[${winnerName}] has won the battle!`
        })
        this.broadcast({ type: 'exitCountdown', seconds: 5 })

        setTimeout(() => this.end('victory', { winnerId: winner.id }), 5000)
      } else if (alive.length === 0) {
        // Double KO / draw
        this.finishing = true
        this.broadcast({ type: 'announcement', text: `Draw!` })
        this.broadcast({ type: 'exitCountdown', seconds: 5 })
        setTimeout(() => this.end('draw'), 5000)
      }
    }

    // Broadcast state every tick
    const payload = {
      type: 'state',
      ts: Date.now(),
      players: this.players.map((p) => {
        const st = this.state.get(p.id)
        return {
          id: p.id,
          x: st.x,
          y: st.y,
          size: st.size,
          health: st.health,
          maxHealth: st.maxHealth,
          alive: st.alive
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
    console.log(`[GAME ${this.id}] ending :: reason=${reason}`)
    this.players.forEach((p) => {
      try {
        p.ws.send(JSON.stringify({ type: 'matchEnd', reason, ...details }))
      } catch {}
      try { p.ws.removeAllListeners('message') } catch {}
      try { p.ws.removeAllListeners('close') } catch {}
    })
    if (this.onEnd) this.onEnd(reason, details)
  }
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}
function safeSend(ws, obj) {
  try {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj))
  } catch {}
}
