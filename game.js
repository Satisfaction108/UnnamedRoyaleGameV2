import { randomUUID } from 'node:crypto'
import TANK_DEFS from './tankdefs.js'
import BULLET_DEFS from './bulletdefs.js'
import ENTITY_DEFS from './entitydefs.js'  // 👈 NEW


const GM = {
  BLITZ:  { id: 'BLITZ',  name: 'Blitz Battle', lengthMs: 120_000, respawnMs: 3000 }, // 2m
  LTS:    { id: 'LTS',    name: 'Last Team Standing', roundsToWin: 2, interRoundMs: 4000, lossStatPts: 3 },
  TIME:   { id: 'TIME',   name: 'Time Shifter', moveMul: 1.35, bulletSpeedMul: 1.35 },
  SOCCER: { id: 'SOCCER', name: 'Tank Soccer', goalsToWin: 3, respawnMs: 2500 }       // 👈 NEW
}


// ── STAT SYSTEM ──────────────────────────────────────────────────────────────
const STAT_LABELS = [
  'Health Regen',        // 0: no-op for now
  'Max Health',          // 1
  'Body Damage',         // 2
  'Bullet Speed',        // 3
  'Bullet Penetration',  // 4 (bullet health)
  'Bullet Damage',       // 5
  'Reload',              // 6 (reduces reload time)
  'Movement Speed'       // 7
]
const STAT_STEPS = {
  // multiplicative factors per point
  maxHealth:       0.06,   // +6% / pt
  bodyDamage:      0.06,   // +6% / pt
  bulletSpeed:     0.05,   // +5% / pt
  bulletHealth:    0.08,   // +8% / pt
  bulletDamage:    0.05,   // +5% / pt
  reload:          0.05,   // −5% time / pt
  movementSpeed:   0.03    // +3% / pt
}
function mul(step, lvl){ return Math.pow(1 + step, Math.max(0, lvl|0)) }
function timeMul(step, lvl){ return Math.pow(1 - step, Math.max(0, lvl|0)) } // smaller is faster
const STAT_MAX = 9
// ─────────────────────────────────────────────────────────────────────────────



export default class Game {
  constructor(players, opts = {}) {
    this.id = randomUUID()
    this.players = players
    this.bounds = { w: 1200, h: 800 }
    this.speed = 300
    this.state = new Map()
    this.inputs = new Map()
    this.closed = false
    this.finishing = false
    this.playerTeam = new Map(players.map(p => [p.id, (typeof p.team === 'number') ? p.team : null]))
    this.teamsEnabled = new Set([...this.playerTeam.values()].filter(t => t !== null)).size >= 2
    this.collideAllies = false

    // ⏳ pre-battle countdown
    this.startDelayMs = 10_000
    this.battleStartAt = Date.now() + this.startDelayMs
    this.started = false

    // 🧱 build walls from ASCII map (if provided)
    const gridStr = typeof opts.mapGrid === 'string' ? opts.mapGrid : ''
    this.walls = buildWallsFromGrid(gridStr, this.bounds)  // [{x,y,width,height,color,strokeWidth}]

// 🎮 gamemode selection (from server) + per-mode state
const gmId = (opts.gamemode && GM[opts.gamemode]) ? opts.gamemode : 'BLITZ'
this.gamemode = { ...GM[gmId] }

// entities (ball + goals etc.)
this.entities = []   // [{ id, kind:'circle'|'aabb', x,y, r | (width,height), vx,vy, static, team, color }]
this._entitySeq = 1

// per-mode runtime bookkeeping
if (this.gamemode.id === 'BLITZ') {
  this.modeEndAt = Date.now() + this.startDelayMs + this.gamemode.lengthMs
  this.teamKills = [0, 0]
  this._respawnTimers = new Map()
} else if (this.gamemode.id === 'LTS') {
  this.round = 1
  this.teamWins = [0, 0]
  this._respawnTimers = new Map() // not used here (no respawns), but kept for symmetry
} else if (this.gamemode.id === 'TIME') {
  this._respawnTimers = new Map()
} else if (this.gamemode.id === 'SOCCER') {
  this._respawnTimers = new Map()
  this.teamScores = [0, 0]

  // spawn ball at center (include local paths from defs)
  const ballDef = ENTITY_DEFS.SoccerBall
  this.entities.push({
    id: this._entitySeq++,
    type: 'SoccerBall',
    kind: 'circle',
    x: this.bounds.w * 0.5,
    y: this.bounds.h * 0.5,
    r: ballDef.r,
    vx: 0, vy: 0,
    mass: ballDef.mass,
    friction: ballDef.friction,
    color: ballDef.color,
    outline: ballDef.outline,
    pathLocal: ballDef.pathLocal || null
  })

  // goals (left = team 1’s goal, right = team 0’s goal)
  const goalW = 26
  const goalH = Math.min(240, Math.floor(this.bounds.h * 0.55))
  const goalTop = (this.bounds.h - goalH) * 0.5

const teamColor = (t) => (t === 0 ? '#3b82f6' : '#ef4444') // tweak to your palette

this.entities.push({
  id: this._entitySeq++, type: 'GoalLeft', kind: 'aabb',
  x: 0, y: goalTop, width: goalW, height: goalH, static: true,
  team: 1, color: teamColor(1)
})
this.entities.push({
  id: this._entitySeq++, type: 'GoalRight', kind: 'aabb',
  x: this.bounds.w - goalW, y: goalTop, width: goalW, height: goalH, static: true,
  team: 0, color: teamColor(0)
})

}



const spawn = [
  { x: this.bounds.w * 0.25, y: this.bounds.h * 0.5 },
  { x: this.bounds.w * 0.75, y: this.bounds.h * 0.5 },
]

// helper used for Soccer spawns: along own goal, random Y
const soccerSpawnForTeam = (team) => {
  const goal = this.entities.find(e => (e.type === 'GoalLeft' || e.type === 'GoalRight') && e.team === team)
  if (!goal) return { x: (team === 0) ? this.bounds.w * 0.75 : this.bounds.w * 0.25, y: this.bounds.h * 0.5 }
  const pad = 22
  const y = goal.y + pad + Math.random() * Math.max(1, goal.height - pad * 2)
  // stand just inside the field, not inside the goal AABB
  const x = (team === 1) ? (goal.x + goal.width + 40) : (goal.x - 40)
  return { x, y }
}

    const roster = players.map(p => ({
      id: p.id,
      name: p.name || `P-${String(p.id).slice(0, 4)}`,
      team: (typeof p.team === 'number') ? p.team : 0,
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

    // track stat allocations per player
    this.stats = new Map()  // id -> { points, levels[8] }

    players.forEach((p, i) => {
      const tk = tankKeys[Math.floor(Math.random() * tankKeys.length)]
      const def = TANK_DEFS[tk]
      const moveSpeed = (typeof def.movementSpeed === 'number') ? def.movementSpeed : 300
      const bodyDamage = (typeof def.bodyDamage === 'number') ? def.bodyDamage : Math.round(20 + def.size * 3)
      const cameraSize = (typeof def.cameraSize === 'number') ? def.cameraSize : 500
      const barrels = (def.barrels || []).map(normBarrel)
// pick spawn point (Soccer = along own goal at random Y)
const team = this.playerTeam.get(p.id) ?? 0
const s = (this.gamemode.id === 'SOCCER')
  ? soccerSpawnForTeam(team)
  : spawn[i % spawn.length]

const st = {
  x: s.x,
  y: s.y,
  rot: 0,
  size: def.size,
        // live values
        health: def.maxHealth,
        maxHealth: def.maxHealth,
        bodyDamage,
        movementSpeed: moveSpeed,
        cameraSize,
        alive: true,
        tankId: tk,
        shape: def.shape,
        barrels,
        reloadTimers: new Array(barrels.length).fill(0),
        knockVx: 0,
        knockVy: 0,

        // base values (for re-computing on stat upgrades)
        baseMaxHealth: def.maxHealth,
        baseBodyDamage: bodyDamage,
        baseMoveSpeed: moveSpeed,

        // bullet & reload multipliers (derived from stats)
        bulletDMGmul: 1,
        bulletSPDmul: 1,
        bulletHPmul: 1,
        reloadTimeMul: 1,

        // killer tracking for kill credit
        lastHitBy: null,
        lastHitAt: 0
      }
      this.state.set(p.id, st)

      // If we spawned inside a wall, push out (unchanged)…
      {
        const r = getBoundingRadius(st)
        for (const w of this.walls) {
          const hit = resolveCircleVsAabb(st.x, st.y, r, w.x, w.y, w.width, w.height)
          if (hit) { st.x += hit.mtvx; st.y += hit.mtvy }
        }
      }

// new player starts with 33 points, no levels
// track LTS round bonus separately so we can reset it between rounds
this.stats.set(p.id, { points: 33, levels: new Array(8).fill(0), bonusThisRound: 0 })
this._recomputeDerivedFromStats(p.id)   // compute first time


      this.inputs.set(p.id, { w: false, a: false, s: false, d: false })
    })

    const tanksForPlayers = players.map(p => {
      const st = this.state.get(p.id)
      return {
        id: p.id,
        tank: {
          name: st.tankId,
          shape: st.shape,
          size: st.size,
          barrels: st.barrels,
          cameraSize: st.cameraSize,
        },
      }
    })

    players.forEach((p) => {
      const mine = this.stats.get(p.id) || { points: 33, levels: new Array(8).fill(0) }
      safeSend(p.ws, {
        type: 'matchStart',
        gameId: this.id,
        you: p.id,
        w: this.bounds.w,
        h: this.bounds.h,
        roster,
        tanks: tanksForPlayers,
        walls: this.walls,
        battleStartAt: this.battleStartAt,

        // 👇 personal stat state
        statPoints: mine.points,
        statLevels: mine.levels,
        statLabels: STAT_LABELS,

        // 👇 gamemode for client banner
        gamemode: { id: this.gamemode.id, name: this.gamemode.name }
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
            if (Date.now() < this.battleStartAt) return
            const st = this.state.get(p.id)
            if (!st?.alive) return
            this._shootFromTank(p.id, st)
          }
if (d.type === 'upgrade') {
  const idx = (d.index|0)
  const mine = this.stats.get(p.id)
  if (!mine || idx < 0 || idx >= 8) return
  const cur = mine.levels[idx] | 0
  if (cur >= STAT_MAX) {
    // already capped; just echo current stats (no point drain)
    safeSend(p.ws, { type: 'stats', points: mine.points, levels: mine.levels })
  } else if (mine.points > 0) {
    mine.points -= 1
    mine.levels[idx] = Math.min(STAT_MAX, cur + 1)
    this._recomputeDerivedFromStats(p.id)
    safeSend(p.ws, { type: 'stats', points: mine.points, levels: mine.levels })
  }
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

  // inside class Game
  _recomputeDerivedFromStats(pid){
    const st = this.state.get(pid); if (!st) return
    const ss = this.stats.get(pid) || { points: 0, levels: new Array(8).fill(0) }

    const lvl = ss.levels
    const mhMul = mul(STAT_STEPS.maxHealth,     lvl[1])
    const bdMul = mul(STAT_STEPS.bodyDamage,    lvl[2])
    const bsMul = mul(STAT_STEPS.bulletSpeed,   lvl[3])
    const bhMul = mul(STAT_STEPS.bulletHealth,  lvl[4])
    const dmMul = mul(STAT_STEPS.bulletDamage,  lvl[5])
    const rlMul = timeMul(STAT_STEPS.reload,    lvl[6])
    const msMul = mul(STAT_STEPS.movementSpeed, lvl[7])

    // apply to “live” attributes (regen [0] is a no-op for now)
    const oldMax = st.maxHealth
    st.maxHealth    = Math.round(st.baseMaxHealth * mhMul)
    st.health       = Math.min(st.maxHealth, st.health + (st.maxHealth - oldMax)) // give the delta
    st.bodyDamage   = Math.round(st.baseBodyDamage * bdMul)

    // include Time Shifter movement boost
    const modeMoveMul = (this.gamemode.id === 'TIME') ? (this.gamemode.moveMul || 1) : 1
    st.movementSpeed = st.baseMoveSpeed * msMul * modeMoveMul

    // bullet-related multipliers
    const timeBulletMul = (this.gamemode.id === 'TIME') ? (this.gamemode.bulletSpeedMul || 1) : 1
    st.bulletDMGmul = dmMul
    st.bulletSPDmul = bsMul * timeBulletMul
    st.bulletHPmul  = bhMul
    st.reloadTimeMul= rlMul
  }
_scheduleRespawn(pid, delayMs) {
  // Respawns for BLITZ and SOCCER
  if (this.gamemode.id !== 'BLITZ' && this.gamemode.id !== 'SOCCER') return
  if (this._respawnTimers?.has(pid)) return

  if (!this._respawnUntil) this._respawnUntil = new Map()
  const until = Date.now() + Math.max(0, delayMs|0)
  this._respawnUntil.set(pid, until)

  const t = setTimeout(() => {
    this._respawnTimers.delete(pid)
    this._respawnUntil?.delete(pid)
    const st = this.state.get(pid)
    if (!st || this.closed) return
    st.alive = true
    st.health = st.maxHealth

    const team = this.playerTeam.get(pid) || 0
    if (this.gamemode.id === 'SOCCER') {
      const goal = this.entities.find(e => (e.type === 'GoalLeft' || e.type === 'GoalRight') && e.team === team)
      const pad = 22
      const gy = goal ? goal.y + pad + Math.random() * Math.max(1, goal.height - pad * 2) : this.bounds.h * 0.5
      const gx = goal ? ((team === 1) ? (goal.x + goal.width + 40) : (goal.x - 40)) : ((team === 0) ? this.bounds.w * 0.75 : this.bounds.w * 0.25)
      st.x = clamp(gx, st.size, this.bounds.w - st.size)
      st.y = clamp(gy, st.size, this.bounds.h - st.size)
    } else {
      st.x = (team === 0) ? this.bounds.w * 0.25 : this.bounds.w * 0.75
      st.y = this.bounds.h * 0.5
    }

    st.rot = 0
    st.knockVx = 0; st.knockVy = 0
    st.reloadTimers = new Array(st.barrels.length).fill(0)
  }, Math.max(0, delayMs|0))
  this._respawnTimers.set(pid, t)
}



_awardTeamStatPoints(team, n) {
  const give = Math.max(0, n|0)
  for (const p of this.players) {
    const t = this.playerTeam.get(p.id) ?? 0
    if (t === team) {
      const ss = this.stats.get(p.id)
      if (ss) {
        ss.points += give
        ss.bonusThisRound = (ss.bonusThisRound || 0) + give  // track per-round bonus
        // tell only that player
        safeSend(p.ws, { type: 'stats', points: ss.points, levels: ss.levels })
      }
    }
  }
}


  _spawnBullet(ownerId, x, y, angle, spec, width) {
    const bspec = BULLET_DEFS[spec] || BULLET_DEFS.Basic
    const shooter = this.state.get(ownerId)
    const spMul = shooter?.bulletSPDmul ?? 1
    const hpMul = shooter?.bulletHPmul  ?? 1
    const dmMul = shooter?.bulletDMGmul ?? 1

    const speed = (bspec.speed || 800) * spMul
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
      damage: (bspec.damage || 10) * dmMul,
      health: (bspec.health || 5)  * hpMul,
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
      const rt = Math.max(0.05, (b.reload || 0.30) * (st.reloadTimeMul || 1))
      st.reloadTimers[i] = rt
    }
  }

// per-round reset for LTS
_resetForNextRound() {
  this.bullets = []
  for (const p of this.players) {
    const st = this.state.get(p.id)
    if (!st) continue
    st.alive = true
    st.health = st.maxHealth
    const team = this.playerTeam.get(p.id) ?? 0
    st.x = (team === 0) ? this.bounds.w * 0.25 : this.bounds.w * 0.75
    st.y = this.bounds.h * 0.5
    st.rot = 0
    st.knockVx = 0; st.knockVy = 0
    st.reloadTimers = new Array(st.barrels.length).fill(0)

    // 🔁 LTS: clear any unspent per-round bonus so it doesn't stack
    if (this.gamemode.id === 'LTS') {
      const ss = this.stats.get(p.id)
      if (ss) {
        const bonus = ss.bonusThisRound || 0
        if (bonus > 0) {
          ss.points = Math.max(0, (ss.points | 0) - bonus)
          ss.bonusThisRound = 0
          // echo new points so the HUD updates between rounds
          safeSend(p.ws, { type: 'stats', points: ss.points, levels: ss.levels })
        }
      }
    }
  }
}

  tick() {
    const dt = 1 / 30
    const prebattle = Date.now() < this.battleStartAt

    // when the lock lifts, announce once
    if (!prebattle && !this.started) {
      this.started = true
      this.broadcast({ type: 'announcement', text: 'Battle!' })
    }

    // reload timers always tick
    for (const p of this.players) {
      const st = this.state.get(p.id)
      if (!st?.alive) continue
      for (let i = 0; i < st.reloadTimers.length; i++) {
        if (st.reloadTimers[i] > 0) st.reloadTimers[i] = Math.max(0, st.reloadTimers[i] - dt)
      }
    }

    // movement + knockback only after countdown; during countdown keep clamped
    if (!prebattle) {
      for (const p of this.players) {
        const inp = this.inputs.get(p.id)
        const st = this.state.get(p.id)
        if (!inp || !st || !st.alive) continue
        let dx = (inp.d ? 1 : 0) - (inp.a ? 1 : 0)
        let dy = (inp.s ? 1 : 0) - (inp.w ? 1 : 0)
        const len = Math.hypot(dx, dy)
        if (len > 0) { dx /= len; dy /= len }

        const ms = (typeof st.movementSpeed === 'number') ? st.movementSpeed : this.speed
        st.x += dx * ms * dt
        st.y += dy * ms * dt

        // knockback velocity then decay
        st.x += (st.knockVx || 0) * dt
        st.y += (st.knockVy || 0) * dt
        const DAMP = 4.0
        st.knockVx = (st.knockVx || 0) * Math.max(0, 1 - DAMP * dt)
        st.knockVy = (st.knockVy || 0) * Math.max(0, 1 - DAMP * dt)

        // world clamp first
        const r = getBoundingRadius(st)
        st.x = clamp(st.x, r, this.bounds.w - r)
        st.y = clamp(st.y, r, this.bounds.h - r)

        // 🧱 player vs maze walls (AABB) — push tank out by MTV
        for (const w of this.walls) {
          const hit = resolveCircleVsAabb(st.x, st.y, r, w.x, w.y, w.width, w.height)
          if (hit) {
            st.x += hit.mtvx
            st.y += hit.mtvy
          }
        }
      }
    } else {
      // keep everyone in-bounds while waiting
      for (const p of this.players) {
        const st = this.state.get(p.id); if (!st) continue
        const r = getBoundingRadius(st)
        st.x = clamp(st.x, r, this.bounds.w - r)
        st.y = clamp(st.y, r, this.bounds.h - r)
      }
    }

    // bullets & collisions only run after countdown
    if (!prebattle) {
      // bullet integration + lifetime cull
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

      // 🚫 bullet vs walls — kill bullets on wall contact
      for (const b of this.bullets) {
        for (const w of this.walls) {
          if (rectCircleIntersect(
                w.x, w.y, w.x + w.width, w.y + w.height,
                b.x, b.y, b.r)) {
            b.health = 0
            break
          }
        }
      }
      this.bullets = this.bullets.filter(b => b.health > 0)

      // bullet vs bullet
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
              A.health = 0; B.health = 0
            } else if (A.health > B.health) {
              A.health = A.health - B.health; B.health = 0
            } else {
              B.health = B.health - A.health; A.health = 0
            }
            if (A.health <= 0) { this.bullets[i] = null }
            if (B.health <= 0) { this.bullets[j] = null }
          }
        }
      }
      this.bullets = this.bullets.filter(Boolean)

      // bullet vs player
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
            const tTarget = this.playerTeam.get(p.id)
            const tOwner = this.playerTeam.get(b.ownerId)
            const sameTeam = this.teamsEnabled && tTarget !== null && tOwner !== null && tTarget === tOwner
            if (sameTeam) continue
            st.health = Math.max(0, st.health - b.damage)
            st.lastHitBy = b.ownerId
            st.lastHitAt = now
            const speed = Math.hypot(b.vx || 0, b.vy || 0) || 1
            const ux = (b.vx || 0) / speed
            const uy = (b.vy || 0) / speed
            const KNOCK_PER_SIZE = 10
            const bulletSize = b.size ?? b.r ?? 3
            const impulse = KNOCK_PER_SIZE * bulletSize
            st.knockVx = (st.knockVx || 0) + ux * impulse
            st.knockVy = (st.knockVy || 0) + uy * impulse
            b.health = 0
          }
        }
      }


      this.bullets = this.bullets.filter(b => b.health > 0)

      // ── ENTITIES (Tank Soccer) ─────────────────────────────────────────────────────
// ── ENTITIES (Tank Soccer) ─────────────────────────────────────────────────────
if (this.gamemode.id === 'SOCCER') {
  // helpers
  const ball = this.entities.find(e => e.type === 'SoccerBall')
  const goalL = this.entities.find(e => e.type === 'GoalLeft')
  const goalR = this.entities.find(e => e.type === 'GoalRight')

  if (ball) {
    // integrate
// integrate
ball.x += (ball.vx || 0) * dt
ball.y += (ball.vy || 0) * dt

// low friction (very slidey)
const fr = ball.friction || 0.985
ball.vx = (ball.vx || 0) * fr
ball.vy = (ball.vy || 0) * fr

// ⛔ world bounds (bounce + damp)
if (ball.x - ball.r < 0)                   { ball.x = ball.r;                         ball.vx =  Math.abs(ball.vx) * 0.6 }
if (ball.x + ball.r > this.bounds.w)       { ball.x = this.bounds.w - ball.r;        ball.vx = -Math.abs(ball.vx) * 0.6 }
if (ball.y - ball.r < 0)                   { ball.y = ball.r;                         ball.vy =  Math.abs(ball.vy) * 0.6 }
if (ball.y + ball.r > this.bounds.h)       { ball.y = this.bounds.h - ball.r;        ball.vy = -Math.abs(ball.vy) * 0.6 }


for (const w of this.walls) {
  const hit = resolveCircleVsAabb(ball.x, ball.y, ball.r, w.x, w.y, w.width, w.height)
  if (!hit) continue

  // push out of the wall
  ball.x += hit.mtvx
  ball.y += hit.mtvy

  // derive collision normal from MTV
  const len = Math.hypot(hit.mtvx || 0, hit.mtvy || 0) || 1
  const nx = (hit.mtvx || 0) / len
  const ny = (hit.mtvy || 0) / len

  // reflect velocity across the normal (only if moving into the wall)
  const vdotn = (ball.vx || 0) * nx + (ball.vy || 0) * ny
  if (vdotn < 0) {
    ball.vx -= 2 * vdotn * nx
    ball.vy -= 2 * vdotn * ny
  }

  // slight loss so it doesn't ping-pong forever
  ball.vx *= 0.6
  ball.vy *= 0.6
}


    // bullet vs ball: knock the ball & remove bullet
    for (const b of this.bullets) {
      const dx = ball.x - b.x, dy = ball.y - b.y
      const minD = (ball.r) + (b.r)
      if (dx*dx + dy*dy <= minD*minD) {
        // impulse = bullet momentum proxy
        const spd = Math.hypot(b.vx || 0, b.vy || 0) || 1
        const ux = (b.vx || 0) / spd, uy = (b.vy || 0) / spd
        const impulse = (b.size ?? b.r ?? 3) * 40 / (ball.mass || 1)
        ball.vx += ux * impulse
        ball.vy += uy * impulse
        b.health = 0
      }
    }

    // player vs ball: push using circle-circle MTV + transfer velocity
    for (const p of this.players) {
      const st = this.state.get(p.id)
      if (!st?.alive) continue
      const r = getBoundingRadius(st)
      const dx = ball.x - st.x, dy = ball.y - st.y
      const minD = r + ball.r
      const d2 = dx*dx + dy*dy
      if (d2 <= minD*minD) {
        const d = Math.sqrt(d2) || 1
        const nx = dx / d, ny = dy / d
        const pen = (r + ball.r) - d
        // move ball out
        ball.x += nx * pen
        ball.y += ny * pen
        // add knock
        const push = 120 / (ball.mass || 1)
        ball.vx += nx * push
        ball.vy += ny * push
      }
    }

    // goal scoring: if ball center inside goal AABB → point
    const inAABB = (e) => (ball.x >= e.x && ball.x <= e.x + e.width && ball.y >= e.y && ball.y <= e.y + e.height)

    let scoredBy = null
    if (goalL && inAABB(goalL)) scoredBy = 0  // into LEFT goal -> point for team 0
    if (goalR && inAABB(goalR)) scoredBy = 1  // into RIGHT goal -> point for team 1

    if (scoredBy != null) {
      this.teamScores[scoredBy] = (this.teamScores[scoredBy] || 0) + 1
      this.broadcast({ type: 'announcement', text: `GOAL! Team ${scoredBy + 1}` })
      // reset ball to center
      ball.x = this.bounds.w * 0.5
      ball.y = this.bounds.h * 0.5
      ball.vx = 0; ball.vy = 0

      // check win
      const need = this.gamemode.goalsToWin || 3
      if (this.teamScores[scoredBy] >= need && !this.finishing) {
        this.finishing = true
        this.broadcast({ type: 'announcement', text: `Tank Soccer: Team ${scoredBy + 1} wins ${this.teamScores[0]}-${this.teamScores[1]}!` })
        this.broadcast({ type: 'exitCountdown', seconds: 5 })
        setTimeout(() => this.end('victory', { team: scoredBy }), 5000)
      }
    }
  }
}



      // player vs player (SAT), ghost allies if collideAllies === false
      for (let i = 0; i < this.players.length; i++) {
        for (let j = i + 1; j < this.players.length; j++) {
          const aId = this.players[i].id
          const bId = this.players[j].id
          const A = this.state.get(aId)
          const B = this.state.get(bId)
          if (!A?.alive || !B?.alive) continue

          const teamA = this.playerTeam.get(aId)
          const teamB = this.playerTeam.get(bId)
          const sameTeam = this.teamsEnabled && teamA !== null && teamB !== null && teamA === teamB
          if (sameTeam && this.collideAllies === false) continue

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

            if (!sameTeam) {
              A.health -= B.bodyDamage * dt
              B.health -= A.bodyDamage * dt
            }
          }
        }
      }

      // deaths + per-mode handling only after start
      for (const p of this.players) {
        const st = this.state.get(p.id)
        if (!st) continue
        if (st.alive && st.health <= 0) {
          st.health = 0
          st.alive = false

          // credit kill for BLITZ (and TIME if you want — here we don’t count)
          if (this.gamemode.id === 'BLITZ') {
            const killerTeam = this.playerTeam.get(st.lastHitBy)
            if (killerTeam != null) this.teamKills[killerTeam] = (this.teamKills[killerTeam] || 0) + 1
            this._scheduleRespawn(p.id, this.gamemode.respawnMs)
          } else if (this.gamemode.id === 'TIME') {
            // keep default win condition, but allow short respawn for more chaos
          } else if (this.gamemode.id === 'SOCCER') {
  // Soccer: players can respawn
  this._scheduleRespawn(p.id, this.gamemode.respawnMs || 2500)
}
          else if (this.gamemode.id === 'LTS') {
            // award bonus points to the team that LOST a player
            const teamOfDead = this.playerTeam.get(p.id) ?? 0
            this._awardTeamStatPoints(teamOfDead, this.gamemode.lossStatPts)
          }
        }
      }

      // endgame per-mode
      const alive = this.players.filter(p => this.state.get(p.id)?.alive)
      const aliveTeams = new Set(alive.map(p => (typeof p.team === 'number') ? p.team : 0))

      if (this.gamemode.id === 'BLITZ') {
        // Do NOT end when a team wipes — players respawn. End by timer.
        if (!this.finishing && Date.now() >= this.modeEndAt) {
          this.finishing = true
          const a = this.teamKills[0] | 0, b = this.teamKills[1] | 0
          if (a === b) {
            this.broadcast({ type: 'announcement', text: `Blitz: Draw (${a}-${b})` })
            this.broadcast({ type: 'exitCountdown', seconds: 5 })
            setTimeout(() => this.end('draw'), 5000)
          } else {
            const winningTeam = (a > b) ? 0 : 1
            this.broadcast({ type: 'announcement', text: `Blitz: Team ${winningTeam + 1} wins ${Math.max(a,b)}-${Math.min(a,b)}!` })
            this.broadcast({ type: 'exitCountdown', seconds: 5 })
            setTimeout(() => this.end('victory', { team: winningTeam }), 5000)
          }
        }
      } else if (this.gamemode.id === 'LTS') {
        if (!this.finishing) {
          if (aliveTeams.size === 0) {
            // full wipe on both sides — rare, treat as draw round
            this.finishing = true
            this.broadcast({ type: 'announcement', text: `Round ${this.round}: Draw` })
            setTimeout(() => {
              this.finishing = false
              this.round += 1
              this.battleStartAt = Date.now() + this.gamemode.interRoundMs
              this.started = false
              this._resetForNextRound()
            }, this.gamemode.interRoundMs)
          } else if (aliveTeams.size === 1) {
            this.finishing = true
            const winningTeam = [...aliveTeams][0]
            this.teamWins[winningTeam] = (this.teamWins[winningTeam] || 0) + 1
            const winsA = this.teamWins[0] | 0, winsB = this.teamWins[1] | 0
            const done = (winsA >= this.gamemode.roundsToWin) || (winsB >= this.gamemode.roundsToWin)
            if (done) {
              this.broadcast({ type: 'announcement', text: `LTS: Team ${winningTeam + 1} wins the match ${winsA}-${winsB}!` })
              this.broadcast({ type: 'exitCountdown', seconds: 5 })
              setTimeout(() => this.end('victory', { team: winningTeam }), 5000)
            } else {
              this.broadcast({ type: 'announcement', text: `Round ${this.round}: Team ${winningTeam + 1} wins (${winsA}-${winsB})` })
              setTimeout(() => {
                this.finishing = false
                this.round += 1
                this.battleStartAt = Date.now() + this.gamemode.interRoundMs
                this.started = false
                this._resetForNextRound()
              }, this.gamemode.interRoundMs)
            }
          }
        }
      } else {
        // default elimination mode (for TIME, etc.)
        if (!this.finishing) {
          if (alive.length === 0 || aliveTeams.size === 0) {
            this.finishing = true
            this.broadcast({ type: 'announcement', text: `Draw!` })
            this.broadcast({ type: 'exitCountdown', seconds: 5 })
            setTimeout(() => this.end('draw'), 5000)
          } else if (aliveTeams.size === 1) {
            this.finishing = true
            const winningTeam = [...aliveTeams][0]
            this.broadcast({ type: 'announcement', text: `Team ${winningTeam + 1} wins!` })
            this.broadcast({ type: 'exitCountdown', seconds: 5 })
            setTimeout(() => this.end('victory', { team: winningTeam }), 5000)
          }
        }
      }
    }

    // per-viewer state with FOV culling (always sent so countdown UI can render)
    const nowTs = Date.now()
    for (const viewer of this.players) {
      const vst = this.state.get(viewer.id)
      if (!vst) continue
      const spectating = !vst.alive
      const HALF = Math.max(64, (vst.cameraSize ?? 500))
      const PAD = 150
      const L = (vst.x - HALF) - PAD
      const T = (vst.y - HALF) - PAD
      const R = (vst.x + HALF) + PAD
      const B = (vst.y + HALF) + PAD

      const playersOut = []
      for (const p of this.players) {
        const st = this.state.get(p.id)
        if (!st) continue
        if (!spectating) {
          const r = getBoundingRadius(st)
          if (!rectCircleIntersect(L, T, R, B, st.x, st.y, r)) continue
        }
        playersOut.push({
          id: p.id,
          x: st.x, y: st.y,
          rot: st.rot,
          size: st.size,
          health: st.health, maxHealth: st.maxHealth,
          alive: st.alive,
          shape: st.shape,
          team: (typeof p.team === 'number') ? p.team : 0,
        })
      }

      const bulletsOut = []
      for (const b of this.bullets) {
        if (spectating || rectCircleIntersect(L, T, R, B, b.x, b.y, b.r)) {
          bulletsOut.push({
            id: b.id, ownerId: b.ownerId, x: b.x, y: b.y, vx: b.vx, vy: b.vy,
            r: b.r, size: b.size, sides: b.sides, strokeWidth: b.strokeWidth
          })
        }
      }

      // if you want, you can tack mode ui info here later (time remaining / score)




// attach gamemode HUD payload + my respawn info
const modePayload = { id: this.gamemode.id, name: this.gamemode.name }
if (this.gamemode.id === 'BLITZ') {
  modePayload.blitz = {
    teamKills: this.teamKills ? [...this.teamKills] : [0, 0],
    timeLeftMs: Math.max(0, (this.modeEndAt || Date.now()) - Date.now())
  }
} else if (this.gamemode.id === 'LTS') {
  modePayload.lts = {
    roundsToWin: this.gamemode.roundsToWin || 2,
    teamWins: this.teamWins ? [...this.teamWins] : [0, 0],
    interRoundEndAt: (!this.started && Date.now() < this.battleStartAt) ? this.battleStartAt : 0
  }
} else if (this.gamemode.id === 'SOCCER') {
  modePayload.soccer = {
    goalsToWin: this.gamemode.goalsToWin || 3,
    teamScores: this.teamScores ? [...this.teamScores] : [0, 0]
  }
}


// viewer-specific respawn ETA
const youPayload = {}
const ru = this._respawnUntil?.get(viewer.id)
if (typeof ru === 'number') youPayload.respawnUntil = ru
// lightweight entities payload (render-only)
// during soccer-ball step, after friction:
// only adjust ball when in soccer AND ball exists
if (this.gamemode.id === 'SOCCER') {
  const ball = this.entities.find(e => e.type === 'SoccerBall')
  if (ball) {
    const fr = ball.friction || 0.985
    ball.vx = (ball.vx || 0) * fr
    ball.vy = (ball.vy || 0) * fr
    const speed = Math.hypot(ball.vx || 0, ball.vy || 0)
    ball.spin = (ball.spin || 0) + (speed / Math.max(1, ball.r)) * dt
  }
}



// lightweight entities payload (render-only)
const entsOut = this.entities.map(e => {
  if (e.kind === 'circle') {
    return {
      id: e.id, type: e.type, kind: 'circle',
      x: e.x, y: e.y, r: e.r,
      color: e.color, outline: e.outline,
      pathLocal: e.pathLocal || null,
      vx: e.vx || 0, vy: e.vy || 0, spin: e.spin || 0
    }
  }
  if (e.kind === 'aabb') {
    return {
      id: e.id, type: e.type, kind: 'aabb',
      x: e.x, y: e.y, width: e.width, height: e.height,
      color: e.color, team: e.team
    }
  }
  return { id: e.id, type: e.type, kind: e.kind }
})



safeSend(viewer.ws, {
  type: 'state',
  ts: nowTs,
  players: playersOut,
  bullets: bulletsOut,
  entities: entsOut,
  mode: modePayload,
  you: youPayload
})

    }
  }

  broadcast(obj) { for (const p of this.players) safeSend(p.ws, obj) }
  end(reason = 'end', details = {}) {
    if (this.closed) return
    this.closed = true
    clearInterval(this.loop)
    try {
      this.players.forEach((p) => {
        safeSend(p.ws, { type: 'matchEnd', reason, details })

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
function satPolyCircle(verts,circle){ let minOverlap=Infinity,minAxis={x:0,y:0}; for(let i=0;i<verts.length;i++){ const j=(i+1)%verts.length; const edgeX=verts[j].x-verts[i].x, edgeY=verts[j].y-verts[i].y; const axis=normalize({x:-edgeY,y:edgeX}); const [minP,maxP]=projectPoly(verts,axis); const cProj=circle.x*axis.x+circle.y*axis.y; const minC=cProj-circle.r, maxC=cProj+circle.r; const overlap=Math.min(maxP,maxC)-Math.max(minP,minC); if(overlap<=0) return {overlap:false,axis:{x:0,y:0},depth:0}; if(overlap<minOverlap){ minOverlap=overlap; const cPoly=centroid(verts); const dir=(((circle.x-cPoly.x)*axis.x+(circle.y-cPoly.y)*axis.y)<0)?-1:1; minAxis={x:axis.x*dir, y:axis.y*dir} } } let closest=null, minD2=Infinity; for(const v of verts){ const dx=circle.x-v.x, dy=circle.y-v.y; const d2=dx*dx+dy*dy; if(d2<minD2){ minD2=d2; closest=v }} if(closest){ const axis=normalize({x:cicle.x-closest.x,y:circle.y-closest.y}); const [minP,maxP]=projectPoly(verts,axis); const cProj=circle.x*axis.x+circle.y*axis.y; const minC=cProj-circle.r, maxC=cProj+circle.r; const overlap=Math.min(maxP,maxC)-Math.max(minP,minC); if(overlap<=0) return {overlap:false,axis:{x:0,y:0},depth:0}; if(overlap<minOverlap){ minOverlap=overlap; minAxis=axis }} return {overlap:true,axis:minAxis,depth:minOverlap}}
function projectPoly(verts,axis){ let min=Infinity,max=-Infinity; for(const v of verts){ const p=v.x*axis.x+v.y*axis.y; if(p<min)min=p; if(p>max)max=p } return [min,max]}
function centroid(verts){ let x=0,y=0; for(const v of verts){ x+=v.x;y+=v.y } const n=verts.length||1; return {x:x/n,y:y/n}}
function normalize(v){ const m=Math.hypot(v.x,v.y); if(m===0) return {x:1,y:0}; return {x:v.x/m,y:v.y/m} }
function normalizeAngle(a){ const two=Math.PI*2; a=((a%two)+two)%two; if(a>Math.PI)a-=two; return a }
function clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)) }
function rectCircleIntersect(L, T, R, B, cx, cy, r) {
  const clx = clamp(cx, L, R)
  const cly = clamp(cy, T, B)
  const dx = cx - clx
  const dy = cy - cly
  return (dx * dx + dy * dy) <= r * r
}
function buildWallsFromGrid(ascii, bounds) {
  const linesRaw = (ascii || '').split('\n').map(s => s.trim()).filter(Boolean)
  if (!linesRaw.length) return []
  // support "w _ w" or "w_w" styles
  const tokenized = linesRaw.map(line => {
    const parts = line.split(/\s+/).filter(Boolean)
    return (parts.length > 1) ? parts : line.split('')
  })
  const rows = tokenized.length
  const cols = tokenized[0].length
  const cellW = bounds.w / cols
  const cellH = bounds.h / rows
  const walls = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = (tokenized[r][c] || '_').toLowerCase()
      if (ch === 'w') {
        walls.push({
          x: c * cellW,
          y: r * cellH,
          width: cellW,
          height: cellH,
          color: '#334155',      // slate-700-ish
          strokeWidth: 4,
        })
      }
    }
  }
  return walls
}

// circle vs AABB — returns minimal translation vector {mtvx, mtvy} or null
function resolveCircleVsAabb(cx, cy, r, rx, ry, rw, rh) {
  const nearestX = clamp(cx, rx, rx + rw)
  const nearestY = clamp(cy, ry, ry + rh)
  let dx = cx - nearestX
  let dy = cy - nearestY
  const distSq = dx*dx + dy*dy
  if (distSq >= r*r) {
    // inside-rect special case (center inside): push out along smallest axis
    if (cx > rx && cx < rx + rw && cy > ry && cy < ry + rh) {
      const left = cx - rx
      const right = (rx + rw) - cx
      const top = cy - ry
      const bottom = (ry + rh) - cy
      const m = Math.min(left, right, top, bottom)
      if (m === left)  return { mtvx: r - left,  mtvy: 0 }
      if (m === right) return { mtvx: -(r - right), mtvy: 0 }
      if (m === top)   return { mtvx: 0, mtvy: r - top }
      if (m === bottom)return { mtvx: 0, mtvy: -(r - bottom) }
    }
    return null
  }
  const dist = Math.sqrt(distSq) || 1
  const pen = r - dist
  dx /= dist; dy /= dist
  return { mtvx: dx * pen, mtvy: dy * pen }
}

function safeSend(ws,obj){ try{ if(ws&&ws.readyState===1) ws.send(JSON.stringify(obj)) }catch{} }
