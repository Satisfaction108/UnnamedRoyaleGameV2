import { randomUUID } from 'node:crypto'

export default class Game {
  constructor(players) {
    this.id = randomUUID()
    this.players = players
    this.bounds = { w: 1200, h: 800 }
    this.speed = 300
    this.state = new Map()
    this.inputs = new Map()
    this.closed = false

    const spawn = [
      { x: this.bounds.w * 0.25, y: this.bounds.h * 0.5 },
      { x: this.bounds.w * 0.75, y: this.bounds.h * 0.5 }
    ]

    console.log(`[GAME ${this.id}] created with players: ${players.map(p => p.name || p.id).join(' vs ')}`)

    // Build roster once
    const roster = players.map(p => ({ id: p.id, name: p.name || `P-${String(p.id).slice(0,4)}` }))

    players.forEach((p, i) => {
      this.state.set(p.id, { x: spawn[i].x, y: spawn[i].y })
      this.inputs.set(p.id, { w:false, a:false, s:false, d:false })

      // include roster so client can label players
      p.ws.send(JSON.stringify({
        type: 'matchStart',
        gameId: this.id,
        you: p.id,
        w: this.bounds.w,
        h: this.bounds.h,
        roster
      }))

      p.ws.on('message', msg => {
        try {
          const d = JSON.parse(msg)
          if (d.type === 'input' && this.inputs.has(p.id)) {
            const inp = this.inputs.get(p.id)
            inp.w = !!d.w; inp.a = !!d.a; inp.s = !!d.s; inp.d = !!d.d
          }
          if (d.type === 'leaveGame') this.end('left')
        } catch {}
      })
      p.ws.on('close', () => this.end('dc'))
    })

    this.loop = setInterval(() => this.tick(), 1000 / 30)
  }

  tick () {
    const dt = 1 / 30
    for (const p of this.players) {
      const inp = this.inputs.get(p.id)
      const st  = this.state.get(p.id)
      if (!inp || !st) continue
      let dx = (inp.d?1:0) - (inp.a?1:0)
      let dy = (inp.s?1:0) - (inp.w?1:0)
      const len = Math.hypot(dx, dy)
      if (len > 0) { dx/=len; dy/=len }
      st.x = Math.max(0, Math.min(this.bounds.w, st.x + dx * this.speed * dt))
      st.y = Math.max(0, Math.min(this.bounds.h, st.y + dy * this.speed * dt))
    }

    const payload = {
      type: 'state',
      ts: Date.now(),
      players: this.players.map(p => {
        const st = this.state.get(p.id)
        return { id: p.id, x: st.x, y: st.y }
      })
    }
    for (const p of this.players) { try { p.ws.send(JSON.stringify(payload)) } catch {} }
  }

  end (reason='end') {
    if (this.closed) return
    this.closed = true
    clearInterval(this.loop)
    console.log(`[GAME ${this.id}] ending :: reason=${reason}`)
    this.players.forEach(p => {
      try { p.ws.send(JSON.stringify({ type:'matchEnd', reason })) } catch {}
      try { p.ws.removeAllListeners('message') } catch {}
      try { p.ws.removeAllListeners('close') } catch {}
    })
    if (this.onEnd) this.onEnd(reason)
  }
}
