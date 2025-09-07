// Tank definitions used by the server.
// shape: 0 = circle, >=3 = regular polygon with that many sides
// barrels: object format recommended { length, width, forwardOffset, sidewaysOffset, directionRadians, bulletType, reload }

const TANK_DEFS = {
   Scout: {
    maxHealth: 180,
    size: 22,
    shape: 0,
    movementSpeed: 300,
    bodyDamage: 86,
    cameraSize: 1500,  // 👈 square half-size (world units) for server FOV cull
    barrels: [
      { length: 34, width: 20, forwardOffset: 12, sidewaysOffset: 0, directionRadians: 0.0, bulletType: 'Basic', reload: 0.28 },
    ],
  },

}

export default TANK_DEFS
