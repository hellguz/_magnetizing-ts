/**
 * Basic usage example of magnetizing-fpg-ts
 *
 * This example demonstrates the full workflow:
 * 1. Define boundary and room requirements
 * 2. Run discrete solver (topological optimization)
 * 3. Run spring solver (geometric refinement)
 */

import { DiscreteSolver } from '../src/core/solvers/DiscreteSolver.js';
import { SpringSolver } from '../src/core/solvers/SpringSolver.js';
import { RoomRequest, Adjacency, DiscreteConfig, SpringConfig, RoomState } from '../src/types.js';
import { Point } from '../src/core/grid/GridBuffer.js';

// 1. Define the building boundary
const boundary: Point[] = [
  { x: 0, y: 0 },
  { x: 50, y: 0 },
  { x: 50, y: 40 },
  { x: 0, y: 40 },
];

// 2. Define room requirements
const rooms: RoomRequest[] = [
  {
    id: 'living-room',
    targetArea: 200,
    targetRatio: 1.5, // Valid range: [1/1.5, 1.5] = [0.67, 1.5]
  },
  {
    id: 'kitchen',
    targetArea: 120,
    targetRatio: 1.2, // Valid range: [1/1.2, 1.2] = [0.83, 1.2]
  },
  {
    id: 'bedroom',
    targetArea: 150,
    targetRatio: 1.3, // Valid range: [1/1.3, 1.3] = [0.77, 1.3]
  },
  {
    id: 'bathroom',
    targetArea: 60,
    targetRatio: 1.0, // Valid range: [1.0, 1.0] = square only
  },
];

// 3. Define adjacency requirements (which rooms should be close to each other)
const adjacencies: Adjacency[] = [
  { a: 'living-room', b: 'kitchen', weight: 2.0 }, // Strong connection
  { a: 'kitchen', b: 'bathroom', weight: 1.5 },
  { a: 'bedroom', b: 'bathroom', weight: 1.0 },
];

// 4. Configure discrete solver
const discreteConfig: Partial<DiscreteConfig> = {
  gridResolution: 1.0,
  maxIterations: 100,
  mutationRate: 0.3,
  weights: {
    compactness: 2.0,
    adjacency: 3.0,
    corridor: 0.5,
  },
};

// 5. Run discrete solver (topological optimization)
console.log('Running discrete solver...');
const discreteSolver = new DiscreteSolver(
  boundary,
  rooms,
  adjacencies,
  discreteConfig,
  42 // Seed for reproducibility
);

const discreteResult = discreteSolver.solve();
const placedRooms = discreteSolver.getPlacedRooms();

console.log(`Placed ${placedRooms.size}/${rooms.length} rooms`);

// 6. Convert discrete result to continuous room states
const roomStates: RoomState[] = Array.from(placedRooms.values()).map(room => ({
  id: room.id,
  x: room.x,
  y: room.y,
  width: room.width,
  height: room.height,
  vx: 0,
  vy: 0,
  targetRatio: rooms.find(r => r.id === room.id)?.targetRatio ?? 1.0,
}));

// 7. Configure spring solver
const springConfig: Partial<SpringConfig> = {
  timestep: 0.016,
  friction: 0.9,
  maxVelocity: 50.0,
  forces: {
    adjacency: 10.0,
    repulsion: 200.0,
    boundary: 50.0,
    aspectRatio: 20.0,
  },
};

// 8. Run spring solver (geometric refinement)
console.log('Running spring solver...');
const springSolver = new SpringSolver(
  roomStates,
  boundary.map(p => ({ x: p.x, y: p.y })),
  adjacencies,
  springConfig
);

// Simulate until convergence
let iterations = 0;
const maxIterations = 500;

while (!springSolver.hasConverged(0.1) && iterations < maxIterations) {
  springSolver.step();
  iterations++;

  if (iterations % 100 === 0) {
    const energy = springSolver.getKineticEnergy();
    console.log(`Iteration ${iterations}, Energy: ${energy.toFixed(2)}`);
  }
}

console.log(`Converged after ${iterations} iterations`);

// 9. Get final result
const finalRooms = springSolver.getState();

console.log('\nFinal Layout:');
finalRooms.forEach(room => {
  const area = room.width * room.height;
  const ratio = room.width / room.height;
  console.log(
    `${room.id}: pos=(${room.x.toFixed(1)}, ${room.y.toFixed(1)}), ` +
    `size=(${room.width.toFixed(1)}x${room.height.toFixed(1)}), ` +
    `area=${area.toFixed(1)}, ratio=${ratio.toFixed(2)}`
  );
});

// 10. Calculate quality metrics
let totalOverlap = 0;
for (let i = 0; i < finalRooms.length; i++) {
  for (let j = i + 1; j < finalRooms.length; j++) {
    const roomA = finalRooms[i];
    const roomB = finalRooms[j];

    // Simple AABB overlap check
    const overlapX = Math.max(0, Math.min(roomA.x + roomA.width, roomB.x + roomB.width) - Math.max(roomA.x, roomB.x));
    const overlapY = Math.max(0, Math.min(roomA.y + roomA.height, roomB.y + roomB.height) - Math.max(roomA.y, roomB.y));
    totalOverlap += overlapX * overlapY;
  }
}

console.log(`\nTotal overlap: ${totalOverlap.toFixed(2)} sq units`);
console.log('Done!');
