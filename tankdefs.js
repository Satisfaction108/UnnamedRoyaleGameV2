// Tank definitions used by the server.
// shape: 0 = circle, >=3 = regular polygon with that many sides
// barrels: array of [length, width, forwardOffset, sidewaysOffset, directionRadians]

const TANK_DEFS = {
  Scout: {
    maxHealth: 120,
    size: 14,
    shape: 0,
    barrels: [
      [22, 6, 10, 0, 0.0],
    ],
  },

  Square: {
    maxHealth: 180,
    size: 18,
    shape: 4,
    barrels: [
      [20, 6, 12, 0, 0.0],
    ],
  },

  Triad: {
    maxHealth: 160,
    size: 16,
    shape: 3,
    barrels: [
      [18, 6, 10, 0, 0.0],
      [18, 6, 10, 0, (2 * Math.PI) / 3],
      [18, 6, 10, 0, (4 * Math.PI) / 3],
    ],
  },

  Hex: {
    maxHealth: 220,
    size: 20,
    shape: 6,
    barrels: [
      [16, 6, 12, 0, Math.PI / 6],
      [16, 6, 12, 0, Math.PI / 6 + Math.PI],
    ],
  },

  Rammer: {
    maxHealth: 260,
    size: 22,
    shape: 5,
    barrels: [
      [26, 8, 14, 0, 0.0],
    ],
  },
}

export default TANK_DEFS
