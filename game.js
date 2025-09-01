// game.js  (ESM)
import { randomUUID } from 'crypto'

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

    players.forEach((p, i) => {
      this.state.set(p.id, { x: spawn[i].x, y: spawn[i].y })
      this.inputs.set(p.id, { w:false, a:false, s:false, d:false })
      p.ws.send(JSON.stringify({
        type:'matchStart',
        gameId:this.id,
        you:p.id,
        w:this.bounds.w,
        h:this.bounds.h
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

  tick() {
    if (this.closed) return
    const dt = 1 / 30
    const ids = this.players.map(p => p.id)
    ids.forEach(id => {
      const pos = this.state.get(id)
      const inp = this.inputs.get(id)
      if (!pos || !inp) return
      let vx = 0, vy = 0
      if (inp.w) vy -= 1
      if (inp.s) vy += 1
      if (inp.a) vx -= 1
      if (inp.d) vx += 1
      if (vx || vy) {
        const len = Math.hypot(vx, vy) || 1
        vx /= len; vy /= len
        pos.x += vx * this.speed * dt
        pos.y += vy * this.speed * dt
      }
      if (pos.x < 0) pos.x = 0
      if (pos.y < 0) pos.y = 0
      if (pos.x > this.bounds.w) pos.x = this.bounds.w
      if (pos.y > this.bounds.h) pos.y = this.bounds.h
    })

    const payload = {
      type:'state',
      players: this.players.map(p => ({ id:p.id, ...this.state.get(p.id) }))
    }
    this.players.forEach(p => {
      if (p.ws.readyState === 1) p.ws.send(JSON.stringify(payload))
    })
  }

  end(reason='end') {
    if (this.closed) return
    this.closed = true
    clearInterval(this.loop)
    this.players.forEach(p => {
      try { p.ws.send(JSON.stringify({ type:'matchEnd', reason })) } catch {}
      try { p.ws.removeAllListeners('message') } catch {}
      try { p.ws.removeAllListeners('close') } catch {}
    })
    if (this.onEnd) this.onEnd()
  }
}
