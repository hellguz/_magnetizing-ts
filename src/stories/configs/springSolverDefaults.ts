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
  useAggressiveInflation: boolean;
  inflationRate: number;
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
  fitnessBalance: 0.7,
  aspectRatioMutationRate: 0.5,
  boundaryScale: 1.0,
  globalTargetRatio: 2,
  autoPlay: true,

  // Advanced Optimization Features
  useSwapMutation: true,
  swapMutationRate: 0.6,
  useAggressiveInflation: false,
  inflationRate: 1.02,
  inflationThreshold: 1.05,
  warmUpIterations: 3,
  useFreshBlood: true,
  freshBloodInterval: 50,
  freshBloodWarmUp: 3,
  useNonLinearOverlapPenalty: true,
  overlapPenaltyExponent: 1.5,
};
