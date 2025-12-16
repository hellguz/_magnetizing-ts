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

  // Mutation probabilities
  teleportProbability: number; // Weight for teleport mutation
  swapProbability: number; // Weight for swap mutation
  rotationProbability: number; // Weight for rotation mutation
  reshapeProbability: number; // Weight for reshape mutation (aspect ratio change)

  // Physics
  maxAspectRatio: number; // Maximum room aspect ratio (width/height)

  // Advanced features (inherited from SpringConfig for compatibility)
  useQuadraticPenalty?: boolean;
  useNonLinearOverlapPenalty?: boolean;
  overlapPenaltyExponent?: number;
}

/**
 * Extended Gene class with shared wall measurement and specific fitness logic.
 * Inherits all physics logic from Gene (applySquishCollisions, aspect ratio constraints).
 */
export class EvolutionaryGene extends Gene {
  fitnessSharedWall: number = 0; // Shared wall fitness component

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
    return clone;
  }

  /**
   * Measure the length of shared wall between two axis-aligned rectangular rooms.
   */
private measureSharedWall(roomA: RoomStateES, roomB: RoomStateES): number {
    const TOLERANCE = 10; // 33cm snapping distance (Keep this small!)

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
   * Calculate the gap distance between two rooms (0 if touching or overlapping).
   */
  private calculateGapDistance(roomA: RoomStateES, roomB: RoomStateES): number {
    const centerA = {
      x: roomA.x + roomA.width / 2,
      y: roomA.y + roomA.height / 2,
    };
    const centerB = {
      x: roomB.x + roomB.width / 2,
      y: roomB.y + roomB.height / 2,
    };

    // Edge-to-edge distance
    const centerDistanceX = Math.abs(centerA.x - centerB.x);
    const centerDistanceY = Math.abs(centerA.y - centerB.y);

    const gapX = Math.max(0, centerDistanceX - (roomA.width + roomB.width) / 2);
    const gapY = Math.max(0, centerDistanceY - (roomA.height + roomB.height) / 2);

    return Math.sqrt(gapX * gapX + gapY * gapY);
  }

  /**
   * Calculate shared wall fitness with improved prioritization.
   * Priority:
   * 1. Shared Wall >= 1.5m (Best, penalty 0)
   * 2. 0 < Shared Wall < 1.5m (Very good, small penalty)
   * 3. No shared wall (Bad, penalty based on distance)
   */
  private calculateSharedWallFitness(adjacencies: Adjacency[], config: EvolutionaryConfig): void {
    let totalPenalty = 0;

    for (const adj of adjacencies) {
      const roomA = this.rooms.find(r => r.id === adj.a);
      const roomB = this.rooms.find(r => r.id === adj.b);

      if (!roomA || !roomB) continue;

      const weight = adj.weight ?? 1.0;
      const exponent = config.overlapPenaltyExponent ?? 1.5;


      const sharedWall = this.measureSharedWall(roomA, roomB);

      if (sharedWall >= config.sharedWallTarget) {
        // Brilliant: Target met or exceeded. No penalty.
        totalPenalty += 0;
      } else if (sharedWall > 0) {
        // Very Very Good: Rooms are touching, but shared wall is small.
        // We apply a very small penalty proportional to the deficit to gently encourage
        // reaching the 1.5m target, but this state is vastly superior to not touching.
        // Factor 0.1 ensures this is much smaller than the "gap" penalty below.
        const deficit = config.sharedWallTarget - sharedWall;
        totalPenalty += Math.pow(deficit * 0.1 , exponent) * weight;
      } else {
        // Bad: Rooms are not touching.
        // Penalty increases with distance ("the longer the distance... the worse").
        const gap = this.calculateGapDistance(roomA, roomB);

        // Base penalty (10.0) ensures that even being very close but not touching
        // is worse than touching with a tiny shared wall.
        // Plus linear distance penalty.
        totalPenalty += Math.pow((10.0 + gap),  exponent) * weight;
      }
    }

    this.fitnessSharedWall = totalPenalty;
  }

  // Find the calculateEvolutionaryFitness method (around line 551) and replace it:

  /**
   * Calculate combined fitness for evolutionary algorithm.
   * NORMALIZED: Now divides raw scores by element counts to make weights scale-independent.
   */
  calculateEvolutionaryFitness(
    boundary: Vec2[],
    adjacencies: Adjacency[],
    config: EvolutionaryConfig
  ): void {
    // 1. Geometric Fitness (Overlaps + Out of Bounds)
    const rawFitnessG = this.calculateGeometricFitnessEvolutionary(boundary, config);
    
    // NORMALIZE GEOMETRY: Divide by number of rooms to keep weight consistent across sizes
    // (We use Math.max(1, length) to avoid division by zero)
    this.fitnessG = rawFitnessG / Math.max(1, this.rooms.length);

    // 2. Adjacency Fitness (Shared Walls & Distances)
    this.calculateSharedWallFitness(adjacencies, config);
    
    // NORMALIZE ADJACENCY: Divide by number of defined adjacency rules
    // Use a temp variable since this.fitnessSharedWall is used elsewhere for visualization
    const normalizedSharedWall = this.fitnessSharedWall / Math.max(1, adjacencies.length);

    // Final weighted sum (Lower is better)
    // Now 'config.sharedWallWeight' represents "Penalty per average connection"
    // and 'config.geometricWeight' represents "Penalty per average room overlap"
    this.fitness =
      (normalizedSharedWall * config.sharedWallWeight) +
      (this.fitnessG * config.geometricWeight);
  }
  /**
   * Calculate geometric fitness (overlaps + out-of-bounds + gaps).
   * Enhanced with Gap Penalty to force tight packing.
   */
  protected calculateGeometricFitnessEvolutionary(boundary: Vec2[], config: any): number {
    let totalOverlap = 0;
    let totalOutOfBounds = 0;

    // 1. Calculate Overlaps
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

    // 2. Calculate Boundary Coverage (Gap Penalty)
    const boundaryArea = Polygon.area(boundary);
    let totalRoomArea = 0;

    // We only count room area that is INSIDE the boundary
    for (const room of this.rooms) {
      const roomPoly = Polygon.createRectangle(room.x, room.y, room.width, room.height);
      const intersection = Polygon.intersectionArea(boundary, roomPoly);
      totalRoomArea += intersection;
    }

    // GAP PENALTY
    // If total room area < boundary area, that's bad (whitespace inside envelope)
    const gapArea = Math.max(0, boundaryArea - totalRoomArea);

    // Weight the gap heavily. We hate gaps.
    // If we fill 100%, gapPenalty is 0.
    const gapPenalty = gapArea * 50.0;

    // 3. Calculate Out of Bounds
    // Note: totalOutOfBounds is calculated from totalRoomArea vs actual room area
    for (const room of this.rooms) {
      const roomArea = room.width * room.height;
      const roomPoly = Polygon.createRectangle(room.x, room.y, room.width, room.height);
      const insideArea = Polygon.intersectionArea(boundary, roomPoly);
      const outsideArea = Math.max(0, roomArea - insideArea);

      totalOutOfBounds += outsideArea;
    }

    // Weighted penalty for out-of-bounds
    const OUT_OF_BOUNDS_PENALTY_MULTIPLIER = 100;
    const outOfBoundsPenalty = totalOutOfBounds * OUT_OF_BOUNDS_PENALTY_MULTIPLIER;

    return totalOverlap + outOfBoundsPenalty + gapPenalty;
  }
}