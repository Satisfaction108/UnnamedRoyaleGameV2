// Tank definitions used by the server.
// shape: 0 = circle, >=3 = regular polygon with that many sides
// barrels: items can be either arrays [length, width, forwardOffset, sidewaysOffset, directionRadians]
//          or objects { length, width, forwardOffset, sidewaysOffset, directionRadians, bulletType, reload }

const TANK_DEFS = {
  Scout: {
    maxHealth: 120,
    size: 14,
    shape: 0,
    barrels: [
      { length: 22, width: 6, forwardOffset: 10, sidewaysOffset: 0, directionRadians: 0.0, bulletType: 'Basic', reload: 0.30 },
    ],
  },

  Square: {
    maxHealth: 180,
    size: 18,
    shape: 4,
    barrels: [
      { length: 18, width: 6, forwardOffset: 10, sidewaysOffset: 0, directionRadians: 0.0, bulletType: 'Basic', reload: 0.35 },
      { length: 18, width: 6, forwardOffset: 10, sidewaysOffset: 0, directionRadians: Math.PI, bulletType: 'Basic', reload: 0.35 },
    ],
  },

  // keep existing tanks; arrays still work, but you can convert any barrel to an object and add bulletType/reload
}
export default TANK_DEFS
