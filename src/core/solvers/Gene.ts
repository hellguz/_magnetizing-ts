import { RoomStateES, Adjacency } from '../../types.js';
import { Vec2 } from '../geometry/Vector2.js';
import { Polygon } from '../geometry/Polygon.js';

/**
 * Represents a single candidate solution in the evolutionary algorithm.
 * Each gene contains a complete configuration of room positions and dimensions.
 */
export class Gene {
  rooms: RoomStateES[];
  fitness: number = Infinity; // Lower is better
  fitnessG: number = 0; // Geometric fitness (overlaps + out-of-bounds)
  fitnessT: number = 0; // Topological fitness (connection distances)

  constructor(rooms: RoomStateES[]) {
    // Deep copy the rooms to ensure independence
    this.rooms = rooms.map(r => ({ ...r }));
  }

  /**
   * Create a deep copy of this gene
   */
  clone(): Gene {
    const clone = new Gene(this.rooms);
    clone.fitness = this.fitness;
    clone.fitnessG = this.fitnessG;
    clone.fitnessT = this.fitnessT;
    return clone;
  }

  /**
   * Apply "Squish" collision resolution to all overlapping room pairs.
   * This is the core logic from the original C# implementation.
   *
   * Algorithm:
   * 1. Detect overlapping rooms using Clipper
   * 2. For each overlap, attempt to SCALE (squish) dimensions to resolve
   * 3. If scaling violates aspect ratio constraints, TRANSLATE (move) instead
   */
  applySquishCollisions(boundary: Vec2[]): void {
    const n = this.rooms.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const roomA = this.rooms[i];
        const roomB = this.rooms[j];

        // Create polygon representations
        const polyA = Polygon.createRectangle(roomA.x, roomA.y, roomA.width, roomA.height);
        const polyB = Polygon.createRectangle(roomB.x, roomB.y, roomB.width, roomB.height);

        // AABB check for early exit
        const aabbA = Polygon.calculateAABB(polyA);
        const aabbB = Polygon.calculateAABB(polyB);

        if (!Polygon.aabbIntersects(aabbA, aabbB)) {
          continue;
        }

        // Precise intersection check
        const overlapArea = Polygon.intersectionArea(polyA, polyB);

        if (overlapArea > 0.01) {
          // Calculate overlap direction (which dimension overlaps more?)
          const overlapX = Math.min(aabbA.maxX, aabbB.maxX) - Math.max(aabbA.minX, aabbB.minX);
          const overlapY = Math.min(aabbA.maxY, aabbB.maxY) - Math.max(aabbA.minY, aabbB.minY);

          // Try to squish along the smaller overlap dimension
          if (overlapX < overlapY) {
            // Overlap is more horizontal, try to squish widths
            this.trySquishHorizontal(roomA, roomB, overlapX);
          } else {
            // Overlap is more vertical, try to squish heights
            this.trySquishVertical(roomA, roomB, overlapY);
          }
        }
      }
    }

    // After all collisions, ensure rooms stay within boundary
    this.constrainToBoundary(boundary);
  }

  /**
   * Attempt to squish rooms horizontally (reduce width, increase height).
   * If aspect ratio limits are violated, translate instead.
   */
  private trySquishHorizontal(roomA: RoomStateES, roomB: RoomStateES, overlap: number): void {
    const shrinkAmount = overlap * 0.5 + 0.1; // Small buffer

    // Try to shrink both rooms' widths
    const newWidthA = roomA.width - shrinkAmount;
    const newWidthB = roomB.width - shrinkAmount;

    // Calculate new heights to maintain area
    const newHeightA = roomA.targetArea / newWidthA;
    const newHeightB = roomB.targetArea / newWidthB;

    // Check aspect ratio constraints
    const ratioA = newWidthA / newHeightA;
    const ratioB = newWidthB / newHeightB;

    // Compute valid range: [1/targetRatio, targetRatio]
    const minRatioA = 1.0 / roomA.targetRatio;
    const minRatioB = 1.0 / roomB.targetRatio;

    const validA = ratioA >= minRatioA && ratioA <= roomA.targetRatio;
    const validB = ratioB >= minRatioB && ratioB <= roomB.targetRatio;

    if (validA && validB) {
      // Both can squish - apply the transformation
      roomA.width = newWidthA;
      roomA.height = newHeightA;
      roomB.width = newWidthB;
      roomB.height = newHeightB;
    } else {
      // Cannot squish - translate instead
      const moveX = overlap * 0.5 + 0.1;
      if (roomA.x < roomB.x) {
        roomA.x -= moveX;
        roomB.x += moveX;
      } else {
        roomA.x += moveX;
        roomB.x -= moveX;
      }
    }
  }

  /**
   * Attempt to squish rooms vertically (reduce height, increase width).
   * If aspect ratio limits are violated, translate instead.
   */
  private trySquishVertical(roomA: RoomStateES, roomB: RoomStateES, overlap: number): void {
    const shrinkAmount = overlap * 0.5 + 0.1; // Small buffer

    // Try to shrink both rooms' heights
    const newHeightA = roomA.height - shrinkAmount;
    const newHeightB = roomB.height - shrinkAmount;

    // Calculate new widths to maintain area
    const newWidthA = roomA.targetArea / newHeightA;
    const newWidthB = roomB.targetArea / newHeightB;

    // Check aspect ratio constraints
    const ratioA = newWidthA / newHeightA;
    const ratioB = newWidthB / newHeightB;

    // Compute valid range: [1/targetRatio, targetRatio]
    const minRatioA = 1.0 / roomA.targetRatio;
    const minRatioB = 1.0 / roomB.targetRatio;

    const validA = ratioA >= minRatioA && ratioA <= roomA.targetRatio;
    const validB = ratioB >= minRatioB && ratioB <= roomB.targetRatio;

    if (validA && validB) {
      // Both can squish - apply the transformation
      roomA.width = newWidthA;
      roomA.height = newHeightA;
      roomB.width = newWidthB;
      roomB.height = newHeightB;
    } else {
      // Cannot squish - translate instead
      const moveY = overlap * 0.5 + 0.1;
      if (roomA.y < roomB.y) {
        roomA.y -= moveY;
        roomB.y += moveY;
      } else {
        roomA.y += moveY;
        roomB.y -= moveY;
      }
    }
  }

  /**
   * Push rooms back into the boundary if they're outside.
   * Uses strict polygon containment instead of AABB clamping.
   */
  private constrainToBoundary(boundary: Vec2[]): void {
    const MAX_ITERATIONS = 10; // Prevent infinite loops

    for (const room of this.rooms) {
      let iteration = 0;

      while (iteration < MAX_ITERATIONS) {
        // Get all four corners of the room
        const corners: Vec2[] = [
          { x: room.x, y: room.y }, // Top-left
          { x: room.x + room.width, y: room.y }, // Top-right
          { x: room.x + room.width, y: room.y + room.height }, // Bottom-right
          { x: room.x, y: room.y + room.height }, // Bottom-left
        ];

        // Check if all corners are inside the polygon
        let allInside = true;
        let farthestOutsideCorner: Vec2 | null = null;
        let maxDistSq = 0;

        for (const corner of corners) {
          if (!Polygon.pointInPolygon(corner, boundary)) {
            allInside = false;

            // Find the farthest outside corner
            const closestOnBoundary = Polygon.closestPointOnPolygon(corner, boundary);
            const distSq =
              (corner.x - closestOnBoundary.x) ** 2 + (corner.y - closestOnBoundary.y) ** 2;

            if (distSq > maxDistSq) {
              maxDistSq = distSq;
              farthestOutsideCorner = corner;
            }
          }
        }

        if (allInside) {
          // All corners are inside, we're done
          break;
        }

        // Push the room towards the boundary
        if (farthestOutsideCorner) {
          const closestOnBoundary = Polygon.closestPointOnPolygon(farthestOutsideCorner, boundary);

          // Calculate push direction (from outside corner to boundary)
          const pushX = closestOnBoundary.x - farthestOutsideCorner.x;
          const pushY = closestOnBoundary.y - farthestOutsideCorner.y;

          // Move room center by push vector (with small overshoot to ensure convergence)
          room.x += pushX * 1.1;
          room.y += pushY * 1.1;
        }

        iteration++;
      }
    }
  }

  /**
   * Calculate the dual-objective fitness function:
   * Fitness = (FitnessG × Balance) + (1/FitnessT × (1 - Balance))
   *
   * FitnessG: Total overlapping area + area outside boundary
   * FitnessT: Sum of distances between connected rooms
   */
  calculateFitness(boundary: Vec2[], adjacencies: Adjacency[], balance: number): void {
    this.fitnessG = this.calculateGeometricFitness(boundary);
    this.fitnessT = this.calculateTopologicalFitness(adjacencies);

    // Combined fitness (lower is better)
    // Note: We use 1/fitnessT to invert topological fitness (closer connections = better)
    const topologicalComponent = this.fitnessT > 0 ? 1.0 / this.fitnessT : 0;
    this.fitness = (this.fitnessG * balance) + (topologicalComponent * (1 - balance));
  }

  /**
   * FitnessG: Calculate total overlap area + area outside boundary
   */
  private calculateGeometricFitness(boundary: Vec2[]): number {
    let totalOverlap = 0;
    let totalOutOfBounds = 0;

    const n = this.rooms.length;

    // Calculate all pairwise overlaps
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const roomA = this.rooms[i];
        const roomB = this.rooms[j];

        const polyA = Polygon.createRectangle(roomA.x, roomA.y, roomA.width, roomA.height);
        const polyB = Polygon.createRectangle(roomB.x, roomB.y, roomB.width, roomB.height);

        const overlapArea = Polygon.intersectionArea(polyA, polyB);
        totalOverlap += overlapArea;
      }
    }

    // Calculate area outside boundary for each room
    for (const room of this.rooms) {
      const roomPoly = Polygon.createRectangle(room.x, room.y, room.width, room.height);
      const roomArea = room.width * room.height;

      // Area inside boundary
      const insideArea = Polygon.intersectionArea(boundary, roomPoly);
      const outsideArea = Math.max(0, roomArea - insideArea);

      totalOutOfBounds += outsideArea;
    }

    return totalOverlap + totalOutOfBounds;
  }

  /**
   * FitnessT: Calculate sum of distances between connected rooms
   */
  private calculateTopologicalFitness(adjacencies: Adjacency[]): number {
    let totalDistance = 0;

    for (const adj of adjacencies) {
      const roomA = this.rooms.find(r => r.id === adj.a);
      const roomB = this.rooms.find(r => r.id === adj.b);

      if (!roomA || !roomB) continue;

      // Calculate center-to-center distance
      const centerA: Vec2 = {
        x: roomA.x + roomA.width / 2,
        y: roomA.y + roomA.height / 2,
      };
      const centerB: Vec2 = {
        x: roomB.x + roomB.width / 2,
        y: roomB.y + roomB.height / 2,
      };

      const dx = centerB.x - centerA.x;
      const dy = centerB.y - centerA.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      totalDistance += distance * (adj.weight ?? 1.0);
    }

    return totalDistance;
  }

  /**
   * Mutate this gene by randomly altering room positions and aspect ratios.
   * This explores the solution space by trying different configurations.
   */
  mutate(mutationRate: number, mutationStrength: number, aspectRatioMutationRate?: number): void {
    const aspectMutationRate = aspectRatioMutationRate ?? mutationRate;

    for (const room of this.rooms) {
      // Position mutation
      if (Math.random() < mutationRate) {
        room.x += (Math.random() - 0.5) * mutationStrength;
        room.y += (Math.random() - 0.5) * mutationStrength;
      }

      // Aspect ratio mutation (key innovation from original C#)
      if (Math.random() < aspectMutationRate) {
        // Compute min/max ratio from targetRatio
        // Valid range: [1/targetRatio, targetRatio]
        const minRatio = 1.0 / room.targetRatio;
        const maxRatio = room.targetRatio;

        // Random aspect ratio within allowed range
        const randomRatio = minRatio + Math.random() * (maxRatio - minRatio);

        // Calculate new dimensions maintaining area
        room.width = Math.sqrt(room.targetArea * randomRatio);
        room.height = room.targetArea / room.width;
      }

      // Ensure minimum dimensions
      room.width = Math.max(1, room.width);
      room.height = Math.max(1, room.height);
    }
  }

  /**
   * Create a new gene by crossing over this gene with another.
   * Mixes room attributes from two parent genes.
   */
  crossover(other: Gene): Gene {
    const childRooms: RoomStateES[] = [];

    for (let i = 0; i < this.rooms.length; i++) {
      const parentA = this.rooms[i];
      const parentB = other.rooms[i];

      // Randomly choose attributes from either parent
      const child: RoomStateES = {
        id: parentA.id,
        x: Math.random() < 0.5 ? parentA.x : parentB.x,
        y: Math.random() < 0.5 ? parentA.y : parentB.y,
        width: Math.random() < 0.5 ? parentA.width : parentB.width,
        height: Math.random() < 0.5 ? parentA.height : parentB.height,
        targetRatio: parentA.targetRatio,
        targetArea: parentA.targetArea,
      };

      childRooms.push(child);
    }

    return new Gene(childRooms);
  }
}
