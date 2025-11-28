/**
 * Defines how a room projects circulation space (corridors).
 */
export enum CorridorRule {
  NONE = 0,       // No auto-generated corridor
  ONE_SIDE = 1,   // Strip on the "Bottom" (y + height)
  TWO_SIDES = 2,  // L-Shape: "Bottom" + "Right" (x + width)
  ALL_SIDES = 3,  // Halo: Top, Bottom, Left, Right
}

export interface DiscreteConfig {
  gridResolution: number;
  maxIterations: number;
  mutationRate: number; // 0.0 to 1.0
  startPoint?: { x: number; y: number }; // Entrance point for corridor network (in grid coordinates)
  weights: {
    compactness: number; // Reward touching neighbors
    adjacency: number;   // Reward satisfying connectivity graph
    corridor: number;    // Reward touching corridors
  };
}

export interface SpringConfig {
  timestep: number;    // e.g., 0.016
  friction: number;    // e.g., 0.90
  maxVelocity: number; // e.g., 50.0
  forces: {
    adjacency: number;   // Spring constant k
    repulsion: number;   // Overlap penalty
    boundary: number;    // Containment force
    aspectRatio: number; // Form preservation
  };
}

export interface RoomRequest {
  id: string;
  targetArea: number;
  minRatio: number;
  maxRatio: number;
  isHall?: boolean;
  /**
   * Defines automatic corridor generation rule.
   * Defaults to CorridorRule.NONE if undefined.
   */
  corridorRule?: CorridorRule;
}

export interface Adjacency {
  a: string;
  b: string;
  weight?: number;
}

export interface RoomState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number; // Velocity X
  vy: number; // Velocity Y
  minRatio: number;
  maxRatio: number;
}
