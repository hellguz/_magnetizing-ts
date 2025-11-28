export interface DiscreteConfig {
  gridResolution: number;
  maxIterations: number;
  mutationRate: number; // 0.0 to 1.0
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
}

export interface Adjacency {
  a: string;
  b: string;
  weight?: number;
}
