import type { DiscreteTemplateType } from '../templates/discreteTemplates.js';

export interface DiscreteVisualizationArgs {
  template: DiscreteTemplateType;
  gridResolution: number;
  mutationRate: number;
  maxIterations: number;
  cellSize: number;
  boundaryScale: number;
  showAdjacencies: boolean;
  showBoundary: boolean;
  showStartPoint: boolean;
  editBoundary: boolean;
}

export const discreteSolverDefaults: DiscreteVisualizationArgs = {
  template: 'house',
  gridResolution: 1.0,
  mutationRate: 0.3,
  maxIterations: 100,
  cellSize: 12,
  boundaryScale: 1.0,
  showAdjacencies: true,
  showBoundary: true,
  showStartPoint: true,
  editBoundary: false,
};
