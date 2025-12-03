import { RoomStateES, Adjacency, SpringConfig } from '../../types.js';
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
    // Initialize pressure values to 0 if not present (backwards compatibility)
    this.rooms = rooms.map(r => ({
      ...r,
      pressureX: r.pressureX ?? 0,
      pressureY: r.pressureY ?? 0,
      accumulatedPressureX: r.accumulatedPressureX ?? 0,
      accumulatedPressureY: r.accumulatedPressureY ?? 0,
    }));
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
   *
   * FIXED: Now includes multiple iterations to resolve chain reactions
   * FIXED: Pressure accumulation only on first iteration to prevent over-counting
   */
  applySquishCollisions(boundary: Vec2[], config: SpringConfig, globalTargetRatio?: number): void {
    // Reset pressure accumulators for all rooms
    for (const room of this.rooms) {
      room.pressureX = 0;
      room.pressureY = 0;
    }

    // FEATURE: Aggressive Inflation - grow rooms before collision resolution
    if (config.useAggressiveInflation) {
      this.applyAggressiveInflation(config);
    }

    const n = this.rooms.length;
    const MAX_ITERATIONS = 5; // Multiple passes to resolve chain reactions

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      let hadCollision = false;

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
            hadCollision = true;

            // Calculate overlap direction (which dimension overlaps more?)
            const overlapX = Math.min(aabbA.maxX, aabbB.maxX) - Math.max(aabbA.minX, aabbB.minX);
            const overlapY = Math.min(aabbA.maxY, aabbB.maxY) - Math.max(aabbA.minY, aabbB.minY);

            // Try to squish along the smaller overlap dimension
            // Only accumulate pressure on first iteration to avoid over-counting
            if (overlapX < overlapY) {
              // Overlap is more horizontal, try to squish widths
              this.trySquishHorizontal(roomA, roomB, overlapX, globalTargetRatio, iteration === 0);
            } else {
              // Overlap is more vertical, try to squish heights
              this.trySquishVertical(roomA, roomB, overlapY, globalTargetRatio, iteration === 0);
            }
          }
        }
      }

      // If no collisions were found this iteration, we're done
      if (!hadCollision) {
        break;
      }
    }

    // After collision resolution, save temporary pressure to persistent accumulated pressure
    // This allows mutation to use pressure data even after collisions are resolved
    for (const room of this.rooms) {
      room.accumulatedPressureX = room.pressureX;
      room.accumulatedPressureY = room.pressureY;
    }

    // After all collisions, ensure rooms stay within boundary
    this.constrainToBoundary(boundary);
  }

  /**
   * Attempt to squish rooms horizontally (reduce width, increase height).
   * If aspect ratio limits are violated, translate instead.
   *
   * FIXED: Now adjusts x position when squishing to actually resolve collisions.
   * When a room on the RIGHT is squished, we increase its x (move left edge right)
   * while decreasing width (move right edge left). This "squishes from the left".
   */
  private trySquishHorizontal(roomA: RoomStateES, roomB: RoomStateES, overlap: number, globalTargetRatio?: number, accumulatePressure: boolean = true): void {
    // Accumulate horizontal pressure on both rooms (only on first iteration)
    if (accumulatePressure) {
      roomA.pressureX += overlap;
      roomB.pressureX += overlap;
    }

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

    // Use global target ratio if provided (but not for corridors), otherwise use room-specific ratios
    const isCorridorA = roomA.id.startsWith('corridor-');
    const isCorridorB = roomB.id.startsWith('corridor-');
    const targetRatioA = (globalTargetRatio && !isCorridorA) ? globalTargetRatio : roomA.targetRatio;
    const targetRatioB = (globalTargetRatio && !isCorridorB) ? globalTargetRatio : roomB.targetRatio;

    // Compute valid range: [1/targetRatio, targetRatio]
    const minRatioA = 1.0 / targetRatioA;
    const minRatioB = 1.0 / targetRatioB;

    const validA = ratioA >= minRatioA && ratioA <= targetRatioA;
    const validB = ratioB >= minRatioB && ratioB <= targetRatioB;

    if (validA && validB) {
      // Both can squish - apply the transformation
      // SYMMETRIC SQUISH: Push rooms outward in both directions
      // This allows the cluster to expand left/down as well as right/up
      const halfShrink = shrinkAmount * 0.5;

      if (roomA.x < roomB.x) {
        // Room A is on the left, Room B is on the right
        // Push left room LEFT, push right room RIGHT
        roomA.x -= halfShrink; // Move A left (Fixes the drift!)
        roomA.width = newWidthA;
        roomA.height = newHeightA;

        roomB.x += halfShrink; // Move B right
        roomB.width = newWidthB;
        roomB.height = newHeightB;
      } else {
        // Room A is on the right, Room B is on the left
        // Push right room RIGHT, push left room LEFT
        roomA.x += halfShrink; // Move A right
        roomA.width = newWidthA;
        roomA.height = newHeightA;

        roomB.x -= halfShrink; // Move B left
        roomB.width = newWidthB;
        roomB.height = newHeightB;
      }
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
   *
   * FIXED: Now adjusts y position when squishing to actually resolve collisions.
   * When a room on the BOTTOM is squished, we increase its y (move top edge down)
   * while decreasing height (move bottom edge up). This "squishes from the top".
   */
  private trySquishVertical(roomA: RoomStateES, roomB: RoomStateES, overlap: number, globalTargetRatio?: number, accumulatePressure: boolean = true): void {
    // Accumulate vertical pressure on both rooms (only on first iteration)
    if (accumulatePressure) {
      roomA.pressureY += overlap;
      roomB.pressureY += overlap;
    }

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

    // Use global target ratio if provided (but not for corridors), otherwise use room-specific ratios
    const isCorridorA = roomA.id.startsWith('corridor-');
    const isCorridorB = roomB.id.startsWith('corridor-');
    const targetRatioA = (globalTargetRatio && !isCorridorA) ? globalTargetRatio : roomA.targetRatio;
    const targetRatioB = (globalTargetRatio && !isCorridorB) ? globalTargetRatio : roomB.targetRatio;

    // Compute valid range: [1/targetRatio, targetRatio]
    const minRatioA = 1.0 / targetRatioA;
    const minRatioB = 1.0 / targetRatioB;

    const validA = ratioA >= minRatioA && ratioA <= targetRatioA;
    const validB = ratioB >= minRatioB && ratioB <= targetRatioB;

    if (validA && validB) {
      // Both can squish - apply the transformation
      // SYMMETRIC SQUISH: Push rooms outward in both directions
      // This allows the cluster to expand down/up symmetrically
      const halfShrink = shrinkAmount * 0.5;

      if (roomA.y < roomB.y) {
        // Room A is on top (lower Y), Room B is on bottom (higher Y)
        // Push top room UP (decrease Y), push bottom room DOWN (increase Y)
        roomA.y -= halfShrink; // Move lower room DOWN
        roomA.width = newWidthA;
        roomA.height = newHeightA;

        roomB.y += halfShrink; // Move upper room UP
        roomB.width = newWidthB;
        roomB.height = newHeightB;
      } else {
        // Room A is on bottom (higher Y), Room B is on top (lower Y)
        // Push bottom room DOWN, push top room UP
        roomA.y += halfShrink; // Move A down
        roomA.width = newWidthA;
        roomA.height = newHeightA;

        roomB.y -= halfShrink; // Move B up
        roomB.width = newWidthB;
        roomB.height = newHeightB;
      }
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
   * FEATURE: Aggressive Inflation
   * Force rooms to grow beyond their target area to fill voids.
   * The subsequent squish logic will resolve overlaps naturally.
   */
  private applyAggressiveInflation(config: SpringConfig): void {
    const inflationRate = config.inflationRate ?? 1.02; // Default 2% growth
    const inflationThreshold = config.inflationThreshold ?? 1.05; // Default 5% max overgrowth

    for (const room of this.rooms) {
      const currentArea = room.width * room.height;
      const maxArea = room.targetArea * inflationThreshold;

      // Only grow if below threshold
      if (currentArea < maxArea) {
        room.width *= inflationRate;
        room.height *= inflationRate;
        // Note: No collision check here - let squish resolve it
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
  calculateFitness(boundary: Vec2[], adjacencies: Adjacency[], balance: number, config: SpringConfig): void {
    this.fitnessG = this.calculateGeometricFitness(boundary, config);
    this.fitnessT = this.calculateTopologicalFitness(adjacencies, config);

    // FIX: Use direct summation. Lower fitness is better.
    // We heavily penalize distance to force aggressive attraction.
    // Both fitnessG (overlaps) and fitnessT (distance squared) are "bad" metrics.
    this.fitness = (this.fitnessG * balance) + (this.fitnessT * (1 - balance));
  }

  /**
   * FitnessG: Calculate total overlap area + area outside boundary
   * Enhanced with non-linear penalties for large/blocky overlaps
   */
  private calculateGeometricFitness(boundary: Vec2[], config: SpringConfig): number {
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

        if (overlapArea > 0.01) { // Ignore tiny numerical errors
          // FEATURE: Non-linear overlap penalty
          // Larger overlaps are punished exponentially more than small ones
          // Thin slivers are automatically less penalized due to smaller area
          let penalty = overlapArea;

          if (config.useNonLinearOverlapPenalty) {
            const exponent = config.overlapPenaltyExponent ?? 1.5;

            // Calculate AABB overlap dimensions to detect thin slivers
            const aabbA = Polygon.calculateAABB(polyA);
            const aabbB = Polygon.calculateAABB(polyB);

            const overlapX = Math.min(aabbA.maxX, aabbB.maxX) - Math.max(aabbA.minX, aabbB.minX);
            const overlapY = Math.min(aabbA.maxY, aabbB.maxY) - Math.max(aabbA.minY, aabbB.minY);
            const aabbOverlapArea = overlapX * overlapY;

            // Calculate "compactness" - how much of the AABB is actually overlapping
            // Thin slivers have low compactness (overlapArea << aabbOverlapArea)
            // Blocky overlaps have high compactness (overlapArea ≈ aabbOverlapArea)
            const compactness = aabbOverlapArea > 0.1 ? overlapArea / aabbOverlapArea : 1.0;

            // Apply exponential penalty, scaled by compactness
            // Thin slivers (low compactness) get reduced penalty
            // Blocky overlaps (high compactness) get full exponential penalty
            const basePenalty = Math.pow(overlapArea, exponent);
            const compactnessBonus = 1.0 + compactness; // 1.0 (thin) to 2.0 (blocky)

            penalty = basePenalty * compactnessBonus;
          }

          totalOverlap += penalty;
        }
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
   * Uses edge-to-edge distance (gap distance) instead of center-to-center.
   * If rooms overlap or touch, distance is 0. Otherwise, measures the actual gap.
   * FEATURE: Quadratic Penalty - use distance^2 to exponentially penalize stretched connections
   */
  private calculateTopologicalFitness(adjacencies: Adjacency[], config: SpringConfig): number {
    let totalDistance = 0;

    for (const adj of adjacencies) {
      const roomA = this.rooms.find(r => r.id === adj.a);
      const roomB = this.rooms.find(r => r.id === adj.b);

      if (!roomA || !roomB) continue;

      // Calculate room centers
      const centerA: Vec2 = {
        x: roomA.x + roomA.width / 2,
        y: roomA.y + roomA.height / 2,
      };
      const centerB: Vec2 = {
        x: roomB.x + roomB.width / 2,
        y: roomB.y + roomB.height / 2,
      };

      // Calculate edge-to-edge distance (gap distance)
      // Horizontal gap: max(0, |centerA.x - centerB.x| - (widthA + widthB)/2)
      // Vertical gap: max(0, |centerA.y - centerB.y| - (heightA + heightB)/2)
      const centerDistanceX = Math.abs(centerA.x - centerB.x);
      const centerDistanceY = Math.abs(centerA.y - centerB.y);

      const gapX = Math.max(0, centerDistanceX - (roomA.width + roomB.width) / 2);
      const gapY = Math.max(0, centerDistanceY - (roomA.height + roomB.height) / 2);

      // Use Euclidean distance of gaps for smoother gradient
      const distanceSq = gapX * gapX + gapY * gapY;

      // FEATURE: Apply quadratic penalty if enabled
      const penalty = config.useQuadraticPenalty ? distanceSq : Math.sqrt(distanceSq);

      totalDistance += penalty * (adj.weight ?? 1.0);
    }

    return totalDistance;
  }

  /**
   * Mutate this gene by randomly altering room positions and aspect ratios.
   * This explores the solution space by trying different configurations.
   *
   * Enhanced with:
   * - Swap Mutation: Teleport rooms to untangle topology
   * - Partner Bias: Move toward connected neighbors
   */
  mutate(
    mutationRate: number,
    mutationStrength: number,
    aspectRatioMutationRate: number | undefined,
    globalTargetRatio: number | undefined,
    config: SpringConfig,
    adjacencies: Adjacency[]
  ): void {
    const aspectMutationRate = aspectRatioMutationRate ?? mutationRate;

    // FEATURE: Swap Mutation - intelligent teleport to untangle topology
    if (config.useSwapMutation && Math.random() < (config.swapMutationRate ?? 0.1)) {
      // Find the most beneficial swap based on adjacency distances
      const swapCandidates = this.findBestSwapCandidates(adjacencies);

      if (swapCandidates.length > 0) {
        // Pick a random candidate from top 3 worst connections
        const candidate = swapCandidates[Math.floor(Math.random() * Math.min(3, swapCandidates.length))];
        const roomA = this.rooms.find(r => r.id === candidate.roomAId);
        const roomB = this.rooms.find(r => r.id === candidate.roomBId);

        if (roomA && roomB) {
          // Swap positions only (not dimensions)
          const tempX = roomA.x;
          const tempY = roomA.y;
          roomA.x = roomB.x;
          roomA.y = roomB.y;
          roomB.x = tempX;
          roomB.y = tempY;
        }
      } else {
        // Fallback to random swap if no good candidates
        const roomAIndex = Math.floor(Math.random() * this.rooms.length);
        const roomBIndex = Math.floor(Math.random() * this.rooms.length);

        if (roomAIndex !== roomBIndex) {
          const roomA = this.rooms[roomAIndex];
          const roomB = this.rooms[roomBIndex];

          const tempX = roomA.x;
          const tempY = roomA.y;
          roomA.x = roomB.x;
          roomA.y = roomB.y;
          roomB.x = tempX;
          roomB.y = tempY;
        }
      }
    }

    for (const room of this.rooms) {
      // FEATURE: Partner Bias - move toward connected neighbors
      let mutationApplied = false;

      if (config.usePartnerBias && Math.random() < (config.partnerBiasRate ?? 0.4)) {
        // Find a connected neighbor
        const connectedNeighbor = this.findConnectedNeighbor(room, adjacencies);

        if (connectedNeighbor) {
          // Move 20% closer to the neighbor
          const dx = (connectedNeighbor.x - room.x) * 0.2;
          const dy = (connectedNeighbor.y - room.y) * 0.2;
          room.x += dx;
          room.y += dy;
          mutationApplied = true;
        }
      }

      // Standard position mutation (if no special mutation applied)
      if (!mutationApplied && Math.random() < mutationRate) {
        room.x += (Math.random() - 0.5) * mutationStrength;
        room.y += (Math.random() - 0.5) * mutationStrength;
      }

      // FEATURE: Pressure-Guided Aspect Ratio Mutation
      // Rooms adapt their shape based on collision pressure instead of random mutations
      if (Math.random() < aspectMutationRate) {
        // Use global target ratio if provided (but not for corridors), otherwise use room-specific ratio
        const isCorridor = room.id.startsWith('corridor-');
        const targetRatio = (globalTargetRatio && !isCorridor) ? globalTargetRatio : room.targetRatio;

        // Compute min/max ratio from targetRatio
        // Valid range: [1/targetRatio, targetRatio]
        const minRatio = 1.0 / targetRatio;
        const maxRatio = targetRatio;

        // Calculate pressure differential to determine mutation bias
        // Use accumulated pressure (persistent) instead of temporary pressure
        const pressureDelta = room.accumulatedPressureX - room.accumulatedPressureY;
        const totalPressure = room.accumulatedPressureX + room.accumulatedPressureY;

        // Determine bias direction based on pressure
        let bias = 0;
        const PRESSURE_SENSITIVITY = 0.3; // How strongly pressure influences aspect ratio

        if (totalPressure > 0.1) { // Only apply bias if there's significant pressure
          if (pressureDelta > 0.5) {
            // High horizontal pressure → make room taller/thinner (lower ratio)
            bias = -PRESSURE_SENSITIVITY;
          } else if (pressureDelta < -0.5) {
            // High vertical pressure → make room wider/shorter (higher ratio)
            bias = PRESSURE_SENSITIVITY;
          }
        } else {
          // Low pressure on both axes → room is in a void, allow inflation
          // This is handled by aggressive inflation feature
        }

        // Get current aspect ratio
        const currentRatio = room.width / room.height;

        // Apply biased mutation: move toward pressure-indicated direction
        // Start with small random change, then add pressure bias
        const randomChange = (Math.random() - 0.5) * 0.2; // Small random component
        let newRatio = currentRatio * (1 + randomChange + bias);

        // Clamp to valid range
        newRatio = Math.max(minRatio, Math.min(maxRatio, newRatio));

        // Calculate new dimensions maintaining area
        room.width = Math.sqrt(room.targetArea * newRatio);
        room.height = room.targetArea / room.width;
      }

      // Ensure minimum dimensions
      room.width = Math.max(1, room.width);
      room.height = Math.max(1, room.height);
    }
  }

  /**
   * Find a random connected neighbor for the given room
   */
  private findConnectedNeighbor(room: RoomStateES, adjacencies: Adjacency[]): RoomStateES | null {
    const neighbors: string[] = [];

    // Find all connected room IDs
    for (const adj of adjacencies) {
      if (adj.a === room.id) {
        neighbors.push(adj.b);
      } else if (adj.b === room.id) {
        neighbors.push(adj.a);
      }
    }

    if (neighbors.length === 0) {
      return null;
    }

    // Pick a random neighbor
    const neighborId = neighbors[Math.floor(Math.random() * neighbors.length)];
    return this.rooms.find(r => r.id === neighborId) ?? null;
  }

  /**
   * Find the best room pairs to swap based on adjacency violations.
   * Returns pairs sorted by potential fitness improvement (worst connections first).
   */
  private findBestSwapCandidates(adjacencies: Adjacency[]): Array<{
    roomAId: string;
    roomBId: string;
    improvementScore: number;
  }> {
    const candidates: Array<{
      roomAId: string;
      roomBId: string;
      improvementScore: number;
    }> = [];

    // For each adjacency, check if swapping the connected rooms would help
    for (const adj of adjacencies) {
      const roomA = this.rooms.find(r => r.id === adj.a);
      const roomB = this.rooms.find(r => r.id === adj.b);

      if (!roomA || !roomB) continue;

      // Calculate current distance
      const currentDistance = this.calculateDistance(roomA, roomB);

      // Calculate what distance would be if we swapped their positions
      const swappedDistance = this.calculateDistanceSwapped(roomA, roomB);

      // If swapping would reduce distance significantly, it's a good candidate
      const improvement = currentDistance - swappedDistance;

      if (improvement > 0) {
        // Weight by adjacency weight
        const weightedImprovement = improvement * (adj.weight ?? 1.0);

        candidates.push({
          roomAId: adj.a,
          roomBId: adj.b,
          improvementScore: weightedImprovement,
        });
      }
    }

    // Sort by improvement score (highest first = worst current connections)
    candidates.sort((a, b) => b.improvementScore - a.improvementScore);

    return candidates;
  }

  /**
   * Calculate center-to-center distance between two rooms
   */
  private calculateDistance(roomA: RoomStateES, roomB: RoomStateES): number {
    const centerA = {
      x: roomA.x + roomA.width / 2,
      y: roomA.y + roomA.height / 2,
    };
    const centerB = {
      x: roomB.x + roomB.width / 2,
      y: roomB.y + roomB.height / 2,
    };

    const dx = centerB.x - centerA.x;
    const dy = centerB.y - centerA.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate what the distance would be if two rooms swapped positions
   */
  private calculateDistanceSwapped(roomA: RoomStateES, roomB: RoomStateES): number {
    // Calculate centers as if positions were swapped
    const centerA = {
      x: roomB.x + roomA.width / 2, // A's dimensions at B's position
      y: roomB.y + roomA.height / 2,
    };
    const centerB = {
      x: roomA.x + roomB.width / 2, // B's dimensions at A's position
      y: roomA.y + roomB.height / 2,
    };

    const dx = centerB.x - centerA.x;
    const dy = centerB.y - centerA.y;
    return Math.sqrt(dx * dx + dy * dy);
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
        // Temporary pressure reset to 0 (calculated fresh each collision resolution)
        pressureX: 0,
        pressureY: 0,
        // Accumulated pressure inherited from parents (average for smooth inheritance)
        accumulatedPressureX: (parentA.accumulatedPressureX + parentB.accumulatedPressureX) / 2,
        accumulatedPressureY: (parentA.accumulatedPressureY + parentB.accumulatedPressureY) / 2,
      };

      childRooms.push(child);
    }

    return new Gene(childRooms);
  }
}
