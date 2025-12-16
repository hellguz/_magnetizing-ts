import type { SpringTemplateType } from '../templates/springTemplates.js';

export interface SpringVisualizationArgs {
  template: SpringTemplateType;
  populationSize: number;
  mutationRate: number;
  mutationStrength: number;
  selectionPressure: number;
  fitnessBalance: number;
  aspectRatioMutationRate: number;
  boundaryScale: number;
  globalTargetRatio: number | undefined;
  autoPlay: boolean;

  // Advanced optimization features
  useSwapMutation: boolean;
  swapMutationRate: number;

  // Dynamic Alveolar Inflation (DAI)
  enableInflation: boolean;
  inflationTarget: number;
  inflationRate: number;

  // Pressure-Guided Mutation
  enablePressureMutation: boolean;
  pressureSensitivity: number;

  // Legacy inflation (deprecated)
  useAggressiveInflation: boolean;
  inflationThreshold: number;

  warmUpIterations: number;
  useFreshBlood: boolean;
  freshBloodInterval: number;
  freshBloodWarmUp: number;
  useNonLinearOverlapPenalty: boolean;
  overlapPenaltyExponent: number;
}

export const springSolverDefaults: SpringVisualizationArgs = {
  template: "howoge-3-room",
  populationSize: 25,
  mutationRate: 0.6,
  mutationStrength: 40,
  selectionPressure: 0.5,
  fitnessBalance: 0.4, // Lean slightly towards Geometry to resolve aggressive overlaps
  aspectRatioMutationRate: 0.5,
  boundaryScale: 1.0,
  globalTargetRatio: 2,
  autoPlay: true,

  // Advanced Optimization Features
  useSwapMutation: true,
  swapMutationRate: 0.6,

  // Dynamic Alveolar Inflation (DAI) - New aggressive inflation system
  enableInflation: true,
  inflationTarget: 1.2,   // Overfill by 20%
  inflationRate: 0.05,    // Grow 5% per frame

  // Pressure-Guided Mutation
  enablePressureMutation: true,
  pressureSensitivity: 0.8, // High sensitivity to collision pressure

  // Legacy inflation (deprecated - keep for backwards compatibility)
  useAggressiveInflation: false,
  inflationThreshold: 1.05,

  warmUpIterations: 3,
  useFreshBlood: true,
  freshBloodInterval: 50,
  freshBloodWarmUp: 3,
  useNonLinearOverlapPenalty: true,
  overlapPenaltyExponent: 1.5,
};
