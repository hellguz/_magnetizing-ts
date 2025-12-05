import { EvolutionaryTemplateType } from '../templates/evolutionaryTemplates.js';

/**
 * Storybook visualization arguments for Evolutionary Floorplan Solver
 */
export interface EvolutionaryVisualizationArgs {
  // Template
  template: EvolutionaryTemplateType;

  // Evolution
  maxGenerations: number;
  physicsIterationsPerGeneration: number;
  disableMutationInLastSteps: number;

  // Mutation operators
  teleportProbability: number;
  swapProbability: number;
  rotationProbability: number;
  reshapeProbability: number;

  // Physics
  maxAspectRatio: number;

  // Fitness weights
  sharedWallTarget: number;
  sharedWallWeight: number;
  geometricWeight: number;

  // Visualization
  showPopulationGrid: boolean;
  autoPlay: boolean;
  animationSpeed: number;
  showAdjacencies: boolean;
  showBoundary: boolean;

  // Boundary
  autoScaleBoundary: boolean;
  boundaryScale: number;
  globalTargetRatio: number;
  editBoundary: boolean;

  // Advanced
  useNonLinearOverlapPenalty: boolean;
  overlapPenaltyExponent: number;
}

/**
 * Default configuration for Evolutionary Floorplan Solver story
 */
export const evolutionaryDefaults: EvolutionaryVisualizationArgs = {
  // Template
  template: "howoge-3-room",

  // Evolution
  maxGenerations: 100,
  physicsIterationsPerGeneration: 10,
  disableMutationInLastSteps: 10,  // Disable mutations in final 20 generations for settling

  // Mutation operators (probabilities should sum to ~1.0 for balanced mutations)
  teleportProbability: 0.4,
  swapProbability: 0.6,
  rotationProbability: 0.3,
  reshapeProbability: 0.8,

  // Physics
  maxAspectRatio: 2.0,

  // Fitness weights
  sharedWallTarget: 1.5,           // 1.5 meters minimum shared wall
  sharedWallWeight: 1500,          // High priority (dominates fitness)
  geometricWeight: 15,             // Moderate penalty for overlaps/out-of-bounds

  // Visualization
  showPopulationGrid: true,
  autoPlay: true,
  animationSpeed: 10,
  showAdjacencies: true,
  showBoundary: true,

  // Boundary
  autoScaleBoundary: true,         // Auto-scale boundary to match room areas
  boundaryScale: 1.0,              // Additional manual scaling
  globalTargetRatio: 2.0,          // Global aspect ratio constraint
  editBoundary: true,             // Enable boundary editing

  // Advanced
  useNonLinearOverlapPenalty: true,
  overlapPenaltyExponent: 1.5,     // Slightly superlinear penalty for overlaps
};