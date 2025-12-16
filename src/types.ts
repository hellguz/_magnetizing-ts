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
  populationSize: number;          // Number of genes (candidate solutions), e.g., 15
  maxGenerations: number;          // Number of evolutionary iterations
  mutationRate: number;            // Probability of mutation (0.0 to 1.0)
  mutationStrength: number;        // Magnitude of position/dimension changes
  crossoverRate: number;           // Probability of crossover (0.0 to 1.0)
  selectionPressure: number;       // Percentage of population to cull each generation (0.0 to 1.0)
  fitnessBalance: number;          // Weight between geometric (0.0) and topological (1.0) fitness
  aspectRatioMutationRate: number; // Probability of aspect ratio mutation (0.0 to 1.0)

  // Advanced optimization features
  useQuadraticPenalty?: boolean;   // Use distance^2 for topological fitness (stronger penalty for stretched connections)
  useSwapMutation?: boolean;       // Swap x,y positions of random rooms (untangles topology)
  swapMutationRate?: number;       // Probability of swap mutation (0.0 to 1.0)
  usePartnerBias?: boolean;        // Bias mutations toward connected neighbors (guides adjacency)
  partnerBiasRate?: number;        // Probability of biased mutation toward partner (0.0 to 1.0)
  // Dynamic Alveolar Inflation (DAI) - New aggressive inflation system
  enableInflation?: boolean;       // Enable Dynamic Alveolar Inflation (120% target fill)
  inflationTarget?: number;        // Target overfill multiplier (e.g., 1.2 = 120% of target area)
  inflationRate?: number;          // Growth rate per step (e.g., 0.05 = 5% growth)

  // Pressure-Guided Mutation
  enablePressureMutation?: boolean; // Use collision pressure to guide aspect ratio mutations
  pressureSensitivity?: number;    // How strongly pressure influences shape (0.0 to 1.0)

  // Legacy inflation (deprecated - use enableInflation instead)
  useAggressiveInflation?: boolean; // Force rooms to grow beyond bounds before squish (fills voids)
  inflationThreshold?: number;     // Max overgrowth (e.g., 1.05 = 5% larger than target)
  warmUpIterations?: number;       // Number of physics iterations to run immediately after mutation (0-50)
  useFreshBlood?: boolean;         // Periodically replace worst performers with new random genes
  freshBloodInterval?: number;     // Every N iterations, inject fresh blood (5-200)
  freshBloodWarmUp?: number;       // Number of physics iterations for new genes (default 30)
  freshBloodSpawnRadius?: number;  // Spawn radius around best gene's centroid (default 100)
  useNonLinearOverlapPenalty?: boolean; // Apply exponential penalty to overlaps based on size/shape
  overlapPenaltyExponent?: number; // Exponent for overlap penalty (1.0 = linear, 2.0 = quadratic)
}

export interface RoomRequest {
  id: string;
  targetArea: number;
  targetRatio: number; // Max aspect ratio (W/H). Valid range: [1/targetRatio, targetRatio]. Best: 1.0 (square)
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
  targetRatio: number; // Max aspect ratio (W/H). Valid range: [1/targetRatio, targetRatio]
}

// Room state for Evolutionary Strategy (no velocity fields)
export interface RoomStateES {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetRatio: number; // Max aspect ratio (W/H). Valid range: [1/targetRatio, targetRatio]
  targetArea: number; // Store target area for mutations
  pressureX: number; // Temporary horizontal collision pressure (reset each iteration)
  pressureY: number; // Temporary vertical collision pressure (reset each iteration)
  accumulatedPressureX: number; // Persistent pressure used for mutation guidance
  accumulatedPressureY: number; // Persistent pressure used for mutation guidance
}
