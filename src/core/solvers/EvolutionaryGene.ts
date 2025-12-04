import { Gene } from './Gene.js';
import { RoomStateES, Adjacency } from '../../types.js';
import { Vec2 } from '../geometry/Vector2.js';
import { Polygon } from '../geometry/Polygon.js';

/**
 * Configuration for Evolutionary Floorplan Solver
 */
export interface EvolutionaryConfig {
  populationSize: number; // Fixed at 25
  maxGenerations: number; // Fixed at 100
  physicsIterations: number; // Fixed at 10

  // Fitness weights
  sharedWallTarget: number; // Target minimum shared wall length (meters)
  sharedWallWeight: number; // Priority multiplier for shared wall constraint
  geometricWeight: number; // Weight for geometric penalties (overlap + out-of-bounds)
  areaDeviationWeight: number; // Weight for room area deviation from target

  // Mutation probabilities
  teleportProbability: number; // Weight for teleport mutation
  swapProbability: number; // Weight for swap mutation
  rotationProbability: number; // Weight for rotation mutation

  // Physics
  maxAspectRatio: number; // Maximum room aspect ratio (width/height)

  // Advanced features (inherited from SpringConfig for compatibility)
  useQuadraticPenalty?: boolean;
  useNonLinearOverlapPenalty?: boolean;
  overlapPenaltyExponent?: number;
}

/**
 * Extended Gene class with shared wall measurement and area deviation fitness.
 * Inherits all physics logic from Gene (applySquishCollisions, aspect ratio constraints).
 */
export class EvolutionaryGene extends Gene {
  fitnessSharedWall: number = 0; // Shared wall fitness component
  fitnessArea: number = 0; // Area deviation fitness component

  constructor(rooms: RoomStateES[]) {
    super(rooms);
  }

  /**
   * Override clone to create EvolutionaryGene instances
   */
  override clone(): EvolutionaryGene {
    const clone = new EvolutionaryGene(this.rooms);
    clone.fitness = this.fitness;
    clone.fitnessG = this.fitnessG;
    clone.fitnessT = this.fitnessT;
    clone.fitnessSharedWall = this.fitnessSharedWall;
    clone.fitnessArea = this.fitnessArea;
    return clone;
  }

  /**
   * Measure the length of shared wall between two axis-aligned rectangular rooms.
   */
  private measureSharedWall(roomA: RoomStateES, roomB: RoomStateES): number {
    const TOLERANCE = 0.1;

    const aLeft = roomA.x;
    const aRight = roomA.x + roomA.width;
    const aTop = roomA.y;
    const aBottom = roomA.y + roomA.height;

    const bLeft = roomB.x;
    const bRight = roomB.x + roomB.width;
    const bTop = roomB.y;
    const bBottom = roomB.y + roomB.height;

    // Check vertical shared wall
    if (Math.abs(aRight - bLeft) < TOLERANCE || Math.abs(aLeft - bRight) < TOLERANCE) {
      const overlapTop = Math.max(aTop, bTop);
      const overlapBottom = Math.min(aBottom, bBottom);
      if (overlapBottom > overlapTop) {
        return overlapBottom - overlapTop;
      }
    }

    // Check horizontal shared wall
    if (Math.abs(aBottom - bTop) < TOLERANCE || Math.abs(aTop - bBottom) < TOLERANCE) {
      const overlapLeft = Math.max(aLeft, bLeft);
      const overlapRight = Math.min(aRight, bRight);
      if (overlapRight > overlapLeft) {
        return overlapRight - overlapLeft;
      }
    }

    return 0;
  }

  /**
   * Calculate shared wall fitness with one-sided constraint.
   */
  private calculateSharedWallFitness(adjacencies: Adjacency[], config: EvolutionaryConfig): void {
    let totalPenalty = 0;
    for (const adj of adjacencies) {
      const roomA = this.rooms.find(r => r.id === adj.a);
      const roomB = this.rooms.find(r => r.id === adj.b);

      if (!roomA || !roomB) continue;

      const sharedWall = this.measureSharedWall(roomA, roomB);
      if (sharedWall < config.sharedWallTarget) {
        const deficit = config.sharedWallTarget - sharedWall;
        totalPenalty += deficit * deficit * (adj.weight ?? 1.0);
      }
    }

    this.fitnessSharedWall = totalPenalty;
  }

  /**
   * Calculate area deviation fitness.
   */
  private calculateAreaDeviation(): void {
    let totalDeviation = 0;
    for (const room of this.rooms) {
      const actualArea = room.width * room.height;
      const targetArea = room.targetArea;
      const deviation = Math.abs(actualArea - targetArea);
      totalDeviation += deviation;
    }
    this.fitnessArea = totalDeviation;
  }

  /**
   * Calculate combined fitness for evolutionary algorithm.
   */
  calculateEvolutionaryFitness(
    boundary: Vec2[],
    adjacencies: Adjacency[],
    config: EvolutionaryConfig
  ): void {
    this.fitnessG = this.calculateGeometricFitnessEvolutionary(boundary, config);
    this.calculateSharedWallFitness(adjacencies, config);
    this.calculateAreaDeviation();

    this.fitness =
      (this.fitnessSharedWall * config.sharedWallWeight) +
      (this.fitnessG * config.geometricWeight) +
      (this.fitnessArea * config.areaDeviationWeight);
  }

  /**
   * Calculate geometric fitness (overlaps + out-of-bounds).
   */
  protected calculateGeometricFitnessEvolutionary(_boundary: Vec2[], config: any): number {
    let totalOverlap = 0;
    let totalOutOfBounds = 0;

    for (let i = 0; i < this.rooms.length; i++) {
      for (let j = i + 1; j < this.rooms.length; j++) {
        const roomA = this.rooms[i];
        const roomB = this.rooms[j];

        const overlapX = Math.max(0,
          Math.min(roomA.x + roomA.width, roomB.x + roomB.width) -
          Math.max(roomA.x, roomB.x)
        );
        const overlapY = Math.max(0,
          Math.min(roomA.y + roomA.height, roomB.y + roomB.height) -
          Math.max(roomA.y, roomB.y)
        );
        const overlapArea = overlapX * overlapY;

        if (config.useNonLinearOverlapPenalty && overlapArea > 0) {
          const exponent = config.overlapPenaltyExponent ?? 1.5;
          totalOverlap += Math.pow(overlapArea, exponent);
        } else {
          totalOverlap += overlapArea;
        }
      }
    }

    const OUT_OF_BOUNDS_PENALTY_MULTIPLIER = 100;
    return totalOverlap + (totalOutOfBounds * OUT_OF_BOUNDS_PENALTY_MULTIPLIER);
  }
}