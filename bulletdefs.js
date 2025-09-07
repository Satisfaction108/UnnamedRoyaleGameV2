// bulletdefs.js
// Server + client stats. New: size (render radius), sides (0=circle, >=3 polygon), strokeWidth (outline px)
const BULLET_DEFS = {
  Basic: { damage: 20, health: 10, speed: 800, size: 4,  sides: 0, strokeWidth: 2 },
  Heavy: { damage: 35, health: 20, speed: 650, size: 5,  sides: 6, strokeWidth: 3 },
  Fast:  { damage: 12, health:  6, speed:1100, size: 3,  sides: 0, strokeWidth: 2 },
}

export default BULLET_DEFS
