import { SpringConfig, Adjacency, RoomState, RoomStateES } from '../../types.js';
import { Vec2 } from '../geometry/Vector2.js';
import { GeneCollection } from './GeneCollection.js';

const DEFAULT_POPULATION_SIZE = 15;
const DEFAULT_MAX_GENERATIONS = 100;
const DEFAULT_MUTATION_RATE = 0.3;
const DEFAULT_MUTATION_STRENGTH = 10.0;
const DEFAULT_CROSSOVER_RATE = 0.5;
const DEFAULT_SELECTION_PRESSURE = 0.3;
const DEFAULT_FITNESS_BALANCE = 0.5;
const DEFAULT_ASPECT_RATIO_MUTATION_RATE = 0.3;

// Advanced optimization feature defaults
const DEFAULT_USE_QUADRATIC_PENALTY = true;
const DEFAULT_USE_SIMULATED_ANNEALING = false;
const DEFAULT_USE_SWAP_MUTATION = true;
const DEFAULT_SWAP_MUTATION_RATE = 0.2;
const DEFAULT_USE_PARTNER_BIAS = true;
const DEFAULT_PARTNER_BIAS_RATE = 0.4;
const DEFAULT_USE_CENTER_GRAVITY = false;
const DEFAULT_CENTER_GRAVITY_RATE = 0.3;
const DEFAULT_CENTER_GRAVITY_STRENGTH = 0.05;
const DEFAULT_USE_AGGRESSIVE_INFLATION = false;
const DEFAULT_INFLATION_RATE = 1.02;
const DEFAULT_INFLATION_THRESHOLD = 1.05;

/**
 * Spring solver using Evolutionary Strategy (Genetic Algorithm).
 * Based on the original C# SpringSystem_ES implementation.
 *
 * Key features:
 * - Population-based optimization (multiple candidate solutions)
 * - "Squish" collision resolution (reshape rooms before translating)
 * - Dual-objective fitness (geometric validity + topological adjacency)
 * - Genetic operators (crossover, mutation, selection)
 */
export class SpringSolver {
  private geneCollection: GeneCollection;
  private config: SpringConfig;
  private currentGeneration: number = 0;
  private globalTargetRatio: number | undefined;

  constructor(
    rooms: RoomState[],
    boundary: Vec2[],
    adjacencies: Adjacency[],
    config: Partial<SpringConfig> = {},
    globalTargetRatio?: number
  ) {
    this.globalTargetRatio = globalTargetRatio;
    // Convert RoomState to RoomStateES (remove velocity fields)
    const roomsES: RoomStateES[] = rooms.map(r => ({
      id: r.id,
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      targetRatio: r.targetRatio,
      targetArea: r.width * r.height, // Preserve initial area
      pressureX: 0, // Initialize pressure tracking
      pressureY: 0,
    }));

    this.config = {
      populationSize: config.populationSize ?? DEFAULT_POPULATION_SIZE,
      maxGenerations: config.maxGenerations ?? DEFAULT_MAX_GENERATIONS,
      mutationRate: config.mutationRate ?? DEFAULT_MUTATION_RATE,
      mutationStrength: config.mutationStrength ?? DEFAULT_MUTATION_STRENGTH,
      crossoverRate: config.crossoverRate ?? DEFAULT_CROSSOVER_RATE,
      selectionPressure: config.selectionPressure ?? DEFAULT_SELECTION_PRESSURE,
      fitnessBalance: config.fitnessBalance ?? DEFAULT_FITNESS_BALANCE,
      aspectRatioMutationRate: config.aspectRatioMutationRate ?? DEFAULT_ASPECT_RATIO_MUTATION_RATE,

      // Advanced optimization features
      useQuadraticPenalty: config.useQuadraticPenalty ?? DEFAULT_USE_QUADRATIC_PENALTY,
      useSimulatedAnnealing: config.useSimulatedAnnealing ?? DEFAULT_USE_SIMULATED_ANNEALING,
      useSwapMutation: config.useSwapMutation ?? DEFAULT_USE_SWAP_MUTATION,
      swapMutationRate: config.swapMutationRate ?? DEFAULT_SWAP_MUTATION_RATE,
      usePartnerBias: config.usePartnerBias ?? DEFAULT_USE_PARTNER_BIAS,
      partnerBiasRate: config.partnerBiasRate ?? DEFAULT_PARTNER_BIAS_RATE,
      useCenterGravity: config.useCenterGravity ?? DEFAULT_USE_CENTER_GRAVITY,
      centerGravityRate: config.centerGravityRate ?? DEFAULT_CENTER_GRAVITY_RATE,
      centerGravityStrength: config.centerGravityStrength ?? DEFAULT_CENTER_GRAVITY_STRENGTH,
      useAggressiveInflation: config.useAggressiveInflation ?? DEFAULT_USE_AGGRESSIVE_INFLATION,
      inflationRate: config.inflationRate ?? DEFAULT_INFLATION_RATE,
      inflationThreshold: config.inflationThreshold ?? DEFAULT_INFLATION_THRESHOLD,
    };

    this.geneCollection = new GeneCollection(
      roomsES,
      boundary,
      adjacencies,
      this.config,
      this.globalTargetRatio
    );
  }

  /**
   * Get current best room configuration
   */
  getState(): RoomState[] {
    const best = this.geneCollection.getBest();

    // Convert RoomStateES back to RoomState (add zero velocities for compatibility)
    return best.rooms.map(r => ({
      id: r.id,
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      targetRatio: r.targetRatio,
      vx: 0,
      vy: 0,
    }));
  }

  /**
   * Perform one evolutionary iteration:
   * 1. Apply squish collisions
   * 2. Evaluate fitness
   * 3. Crossover
   * 4. Mutation
   * 5. Selection (cull worst)
   */
  step(): void {
    this.geneCollection.iterate();
    this.currentGeneration++;
  }

  /**
   * Run the evolutionary algorithm for N generations
   */
  simulate(generations: number): void {
    for (let i = 0; i < generations; i++) {
      this.step();
    }
  }

  /**
   * Check if the algorithm has converged (fitness improvement is minimal)
   */
  hasConverged(threshold: number = 0.01): boolean {
    const stats = this.geneCollection.getStats();

    // If best fitness is very close to 0, we've found a good solution
    if (stats.bestFitness < threshold) {
      return true;
    }

    // Check if population has stagnated (low diversity)
    const fitnessRange = stats.worstFitness - stats.bestFitness;
    return fitnessRange < threshold;
  }

  /**
   * Get current fitness statistics
   */
  getStats(): {
    generation: number;
    bestFitness: number;
    worstFitness: number;
    avgFitness: number;
    bestFitnessG: number;
    bestFitnessT: number;
  } {
    const stats = this.geneCollection.getStats();
    return {
      generation: this.currentGeneration,
      ...stats,
    };
  }

  /**
   * Get the current generation number
   */
  getGeneration(): number {
    return this.currentGeneration;
  }

  /**
   * Legacy compatibility: Get "kinetic energy" (mapped to fitness)
   * Lower fitness = lower "energy" = more converged
   */
  getKineticEnergy(): number {
    return this.geneCollection.getBest().fitness;
  }
}
