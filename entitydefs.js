// entitydefs.js
// Simple entity definitions with shapes + physics-ish params.
// For "pathLocal": each path uses normalized coordinates relative to the circle center.
// ax, ay are in [-1..1] scale and are multiplied by the entity radius at render time.

const ENTITY_DEFS = {
  SoccerBall: {
    kind: 'circle',
    r: 18,
    mass: 2.2,
    friction: 0.985,
    color: '#ffffff',   // base fill
    outline: '#0f172a', // rim

    // local decorative paths to render a classic ball (pentagon + spokes)
    pathLocal: [
      // center pentagon (filled)
      {
        fill: '#111827',
        stroke: '#0f172a',
        strokeWidthFactor: 0.08,
        commands: [
          { cmd:'M', ax:  0.000, ay: -0.42 },
          { cmd:'L', ax:  0.399, ay: -0.130 },
          { cmd:'L', ax:  0.247, ay:  0.360 },
          { cmd:'L', ax: -0.247, ay:  0.360 },
          { cmd:'L', ax: -0.399, ay: -0.130 },
          { cmd:'L', ax:  0.000, ay: -0.42 }
        ]
      },
      // spokes from pentagon corners towards rim
      { stroke: '#0f172a', strokeWidthFactor: 0.07, commands: [
        { cmd:'M', ax:  0.000, ay: -0.42 }, { cmd:'L', ax:  0.000, ay: -0.95 }
      ]},
      { stroke: '#0f172a', strokeWidthFactor: 0.07, commands: [
        { cmd:'M', ax:  0.399, ay: -0.130 }, { cmd:'L', ax:  0.90, ay: -0.29 }
      ]},
      { stroke: '#0f172a', strokeWidthFactor: 0.07, commands: [
        { cmd:'M', ax:  0.247, ay:  0.360 }, { cmd:'L', ax:  0.72, ay:  0.63 }
      ]},
      { stroke: '#0f172a', strokeWidthFactor: 0.07, commands: [
        { cmd:'M', ax: -0.247, ay:  0.360 }, { cmd:'L', ax: -0.72, ay:  0.63 }
      ]},
      { stroke: '#0f172a', strokeWidthFactor: 0.07, commands: [
        { cmd:'M', ax: -0.399, ay: -0.130 }, { cmd:'L', ax: -0.90, ay: -0.29 }
      ]}
    ],
  },
}

export default ENTITY_DEFS
