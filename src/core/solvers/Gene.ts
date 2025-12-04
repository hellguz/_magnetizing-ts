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
   * Includes direct adjacency attraction and balanced squish/translate logic.
   */
  applySquishCollisions(
    boundary: Vec2[],
    config: SpringConfig,
    globalTargetRatio?: number,
    adjacencies?: Adjacency[]
  ): void {
    // Reset pressure accumulators for all rooms
    for (const room of this.rooms) {
      room.pressureX = 0;
      room.pressureY = 0;
    }

    // FEATURE: Aggressive Inflation
    if (config.useAggressiveInflation) {
      this.applyAggressiveInflation(config);
    }

    // FEATURE: Direct Adjacency Attraction (Physics Phase)
    // Pull connected rooms together *before* resolving collisions
    if (adjacencies) {
      this.applyAdjacencyForces(adjacencies, 0.15); // Strength 0.15
    }

    const n = this.rooms.length;
    const MAX_ITERATIONS = 1; // We now run this method multiple times per frame in the solver

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
            // Calculate overlap direction
            const overlapX = Math.min(aabbA.maxX, aabbB.maxX) - Math.max(aabbA.minX, aabbB.minX);
            const overlapY = Math.min(aabbA.maxY, aabbB.maxY) - Math.max(aabbA.minY, aabbB.minY);

            // Try to squish along the smaller overlap dimension
            if (overlapX < overlapY) {
              this.trySquishHorizontal(roomA, roomB, overlapX, globalTargetRatio, true);
            } else {
              this.trySquishVertical(roomA, roomB, overlapY, globalTargetRatio, true);
            }
          }
        }
      }
    }

    // After collision resolution, save temporary pressure
    for (const room of this.rooms) {
      room.accumulatedPressureX = room.pressureX;
      room.accumulatedPressureY = room.pressureY;
    }

    // Constrain to boundary
    this.constrainToBoundary(boundary);
  }

  /**
   * Applies attraction forces between connected rooms.
   * This pulls them together during the physics loop, not just via selection.
   */
  private applyAdjacencyForces(adjacencies: Adjacency[], strength: number): void {
    for (const adj of adjacencies) {
      const roomA = this.rooms.find(r => r.id === adj.a);
      const roomB = this.rooms.find(r => r.id === adj.b);

      if (roomA && roomB) {
        const cxA = roomA.x + roomA.width / 2;
        const cyA = roomA.y + roomA.height / 2;
        const cxB = roomB.x + roomB.width / 2;
        const cyB = roomB.y + roomB.height / 2;

        const dx = cxB - cxA;
        const dy = cyB - cyA;

        // Apply attraction to bring centers closer
        const weight = (adj.weight ?? 1.0) * strength;
        
        // Move A towards B
        roomA.x += dx * weight * 0.1;
        roomA.y += dy * weight * 0.1;

        // Move B towards A
        roomB.x -= dx * weight * 0.1;
        roomB.y -= dy * weight * 0.1;
      }
    }
  }

  /**
   * Balanced Horizontal Resolution: Mixes Squishing (Reshaping) and Translation.
   */
  private trySquishHorizontal(roomA: RoomStateES, roomB: RoomStateES, overlap: number, globalTargetRatio?: number, accumulatePressure: boolean = true): void {
    if (accumulatePressure) {
      roomA.pressureX += overlap;
      roomB.pressureX += overlap;
    }

    // BALANCE CONFIGURATION
    const SQUISH_FACTOR = 0.5; // 50% squish, 50% translate
    
    // 1. Calculate Squish Component
    const squishAmount = (overlap * SQUISH_FACTOR * 0.5) + 0.1;
    const newWidthA = roomA.width - squishAmount;
    const newWidthB = roomB.width - squishAmount;
    const newHeightA = roomA.targetArea / newWidthA;
    const newHeightB = roomB.targetArea / newWidthB;

    // Check ratios
    const ratioA = newWidthA / newHeightA;
    const ratioB = newWidthB / newHeightB;
    const isCorridorA = roomA.id.startsWith('corridor-');
    const isCorridorB = roomB.id.startsWith('corridor-');
    const targetRatioA = (globalTargetRatio && !isCorridorA) ? globalTargetRatio : roomA.targetRatio;
    const targetRatioB = (globalTargetRatio && !isCorridorB) ? globalTargetRatio : roomB.targetRatio;
    const minRatioA = 1.0 / targetRatioA;
    const minRatioB = 1.0 / targetRatioB;
    const validA = ratioA >= minRatioA && ratioA <= targetRatioA;
    const validB = ratioB >= minRatioB && ratioB <= targetRatioB;

    // 2. Calculate Translation Component (The rest of the overlap)
    const translateAmount = overlap * (1 - SQUISH_FACTOR) * 0.5;

    if (validA && validB) {
      // Apply BOTH Squish and Translate
      if (roomA.x < roomB.x) {
        // A Left, B Right
        roomA.x -= translateAmount; 
        roomA.x -= squishAmount * 0.5; // Adjust for width loss
        roomA.width = newWidthA;
        roomA.height = newHeightA;

        roomB.x += translateAmount;
        roomB.x += squishAmount * 0.5; // Adjust for width loss
        roomB.width = newWidthB;
        roomB.height = newHeightB;
      } else {
        // A Right, B Left
        roomA.x += translateAmount;
        roomA.x += squishAmount * 0.5;
        roomA.width = newWidthA;
        roomA.height = newHeightA;

        roomB.x -= translateAmount;
        roomB.x -= squishAmount * 0.5;
        roomB.width = newWidthB;
        roomB.height = newHeightB;
      }
    } else {
      // Fallback: 100% Translate if squish is invalid
      const fullMove = overlap * 0.5 + 0.1;
      if (roomA.x < roomB.x) {
        roomA.x -= fullMove;
        roomB.x += fullMove;
      } else {
        roomA.x += fullMove;
        roomB.x -= fullMove;
      }
    }
  }

  /**
   * Balanced Vertical Resolution: Mixes Squishing (Reshaping) and Translation.
   */
  private trySquishVertical(roomA: RoomStateES, roomB: RoomStateES, overlap: number, globalTargetRatio?: number, accumulatePressure: boolean = true): void {
    if (accumulatePressure) {
      roomA.pressureY += overlap;
      roomB.pressureY += overlap;
    }

    // BALANCE CONFIGURATION
    const SQUISH_FACTOR = 0.5; // 50% squish, 50% translate

    // 1. Calculate Squish Component
    const squishAmount = (overlap * SQUISH_FACTOR * 0.5) + 0.1;
    const newHeightA = roomA.height - squishAmount;
    const newHeightB = roomB.height - squishAmount;
    const newWidthA = roomA.targetArea / newHeightA;
    const newWidthB = roomB.targetArea / newHeightB;

    const ratioA = newWidthA / newHeightA;
    const ratioB = newWidthB / newHeightB;
    const isCorridorA = roomA.id.startsWith('corridor-');
    const isCorridorB = roomB.id.startsWith('corridor-');
    const targetRatioA = (globalTargetRatio && !isCorridorA) ? globalTargetRatio : roomA.targetRatio;
    const targetRatioB = (globalTargetRatio && !isCorridorB) ? globalTargetRatio : roomB.targetRatio;
    const minRatioA = 1.0 / targetRatioA;
    const minRatioB = 1.0 / targetRatioB;
    const validA = ratioA >= minRatioA && ratioA <= targetRatioA;
    const validB = ratioB >= minRatioB && ratioB <= targetRatioB;

    // 2. Calculate Translation Component
    const translateAmount = overlap * (1 - SQUISH_FACTOR) * 0.5;

    if (validA && validB) {
       // Apply BOTH Squish and Translate
       if (roomA.y < roomB.y) {
        // A Top, B Bottom
        roomA.y -= translateAmount;
        roomA.y -= squishAmount * 0.5;
        roomA.width = newWidthA;
        roomA.height = newHeightA;

        roomB.y += translateAmount;
        roomB.y += squishAmount * 0.5;
        roomB.width = newWidthB;
        roomB.height = newHeightB;
      } else {
        // A Bottom, B Top
        roomA.y += translateAmount;
        roomA.y += squishAmount * 0.5;
        roomA.width = newWidthA;
        roomA.height = newHeightA;

        roomB.y -= translateAmount;
        roomB.y -= squishAmount * 0.5;
        roomB.width = newWidthB;
        roomB.height = newHeightB;
      }
    } else {
      // Fallback: 100% Translate
      const fullMove = overlap * 0.5 + 0.1;
      if (roomA.y < roomB.y) {
        roomA.y -= fullMove;
        roomB.y += fullMove;
      } else {
        roomA.y += fullMove;
        roomB.y -= fullMove;
      }
    }
  }

  private applyAggressiveInflation(config: SpringConfig): void {
    const inflationRate = config.inflationRate ?? 1.02; 
    const inflationThreshold = config.inflationThreshold ?? 1.05;

    for (const room of this.rooms) {
      const currentArea = room.width * room.height;
      const maxArea = room.targetArea * inflationThreshold;

      if (currentArea < maxArea) {
        room.width *= inflationRate;
        room.height *= inflationRate;
      }
    }
  }

  private constrainToBoundary(boundary: Vec2[]): void {
    const MAX_ITERATIONS = 10;

    for (const room of this.rooms) {
      let iteration = 0;
      while (iteration < MAX_ITERATIONS) {
        const corners: Vec2[] = [
          { x: room.x, y: room.y }, 
          { x: room.x + room.width, y: room.y },
          { x: room.x + room.width, y: room.y + room.height },
          { x: room.x, y: room.y + room.height }, 
        ];
        
        let allInside = true;
        let farthestOutsideCorner: Vec2 | null = null;
        let maxDistSq = 0;

        for (const corner of corners) {
          if (!Polygon.pointInPolygon(corner, boundary)) {
            allInside = false;
            const closestOnBoundary = Polygon.closestPointOnPolygon(corner, boundary);
            const distSq =
              (corner.x - closestOnBoundary.x) ** 2 + (corner.y - closestOnBoundary.y) ** 2;
            if (distSq > maxDistSq) {
              maxDistSq = distSq;
              farthestOutsideCorner = corner;
            }
          }
        }

        if (allInside) break;

        if (farthestOutsideCorner) {
          const closestOnBoundary = Polygon.closestPointOnPolygon(farthestOutsideCorner, boundary);
          const pushX = closestOnBoundary.x - farthestOutsideCorner.x;
          const pushY = closestOnBoundary.y - farthestOutsideCorner.y;

          room.x += pushX * 1.1;
          room.y += pushY * 1.1;

          room.accumulatedPressureX += Math.abs(pushX) * 10;
          room.accumulatedPressureY += Math.abs(pushY) * 10;
        }

        iteration++;
      }
    }
  }

  calculateFitness(boundary: Vec2[], adjacencies: Adjacency[], balance: number, config: SpringConfig): void {
    this.fitnessG = this.calculateGeometricFitness(boundary, config);
    this.fitnessT = this.calculateTopologicalFitness(adjacencies, config);
    this.fitness = (this.fitnessG * balance) + (this.fitnessT * (1 - balance));
  }

  private calculateGeometricFitness(boundary: Vec2[], config: SpringConfig): number {
    let totalOverlap = 0;
    let totalOutOfBounds = 0;
    const n = this.rooms.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const roomA = this.rooms[i];
        const roomB = this.rooms[j];
        const polyA = Polygon.createRectangle(roomA.x, roomA.y, roomA.width, roomA.height);
        const polyB = Polygon.createRectangle(roomB.x, roomB.y, roomB.width, roomB.height);
        const overlapArea = Polygon.intersectionArea(polyA, polyB);

        if (overlapArea > 0.01) {
          let penalty = overlapArea;
          if (config.useNonLinearOverlapPenalty) {
            const exponent = config.overlapPenaltyExponent ?? 1.5;
            const aabbA = Polygon.calculateAABB(polyA);
            const aabbB = Polygon.calculateAABB(polyB);
            const overlapX = Math.min(aabbA.maxX, aabbB.maxX) - Math.max(aabbA.minX, aabbB.minX);
            const overlapY = Math.min(aabbA.maxY, aabbB.maxY) - Math.max(aabbA.minY, aabbB.minY);
            const aabbOverlapArea = overlapX * overlapY;
            const compactness = aabbOverlapArea > 0.1 ? overlapArea / aabbOverlapArea : 1.0;
            const basePenalty = Math.pow(overlapArea, exponent);
            const compactnessBonus = 1.0 + compactness; 
            penalty = basePenalty * compactnessBonus;
          }
          totalOverlap += penalty;
        }
      }
    }

    for (const room of this.rooms) {
      const roomPoly = Polygon.createRectangle(room.x, room.y, room.width, room.height);
      const roomArea = room.width * room.height;
      const insideArea = Polygon.intersectionArea(boundary, roomPoly);
      const outsideArea = Math.max(0, roomArea - insideArea);
      totalOutOfBounds += outsideArea;
    }

    const OUT_OF_BOUNDS_PENALTY_MULTIPLIER = 100;
    return totalOverlap + (totalOutOfBounds * OUT_OF_BOUNDS_PENALTY_MULTIPLIER);
  }

  private calculateTopologicalFitness(adjacencies: Adjacency[], config: SpringConfig): number {
    let totalDistance = 0;
    for (const adj of adjacencies) {
      const roomA = this.rooms.find(r => r.id === adj.a);
      const roomB = this.rooms.find(r => r.id === adj.b);
      if (!roomA || !roomB) continue;
      
      const centerA: Vec2 = { x: roomA.x + roomA.width / 2, y: roomA.y + roomA.height / 2 };
      const centerB: Vec2 = { x: roomB.x + roomB.width / 2, y: roomB.y + roomB.height / 2 };
      const centerDistanceX = Math.abs(centerA.x - centerB.x);
      const centerDistanceY = Math.abs(centerA.y - centerB.y);

      const gapX = Math.max(0, centerDistanceX - (roomA.width + roomB.width) / 2);
      const gapY = Math.max(0, centerDistanceY - (roomA.height + roomB.height) / 2);
      const distanceSq = gapX * gapX + gapY * gapY;
      const penalty = config.useQuadraticPenalty ? distanceSq : Math.sqrt(distanceSq);
      totalDistance += penalty * (adj.weight ?? 1.0);
    }
    return totalDistance;
  }

  mutate(
    mutationRate: number,
    mutationStrength: number,
    aspectRatioMutationRate: number | undefined,
    globalTargetRatio: number | undefined,
    config: SpringConfig,
    adjacencies: Adjacency[]
  ): void {
    const aspectMutationRate = aspectRatioMutationRate ?? mutationRate;

    if (config.useSwapMutation && Math.random() < (config.swapMutationRate ?? 0.1)) {
      const swapCandidates = this.findBestSwapCandidates(adjacencies);
      if (swapCandidates.length > 0) {
        const candidate = swapCandidates[Math.floor(Math.random() * Math.min(3, swapCandidates.length))];
        const roomA = this.rooms.find(r => r.id === candidate.roomAId);
        const roomB = this.rooms.find(r => r.id === candidate.roomBId);
        if (roomA && roomB) {
          const tempX = roomA.x; const tempY = roomA.y;
          roomA.x = roomB.x; roomA.y = roomB.y;
          roomB.x = tempX; roomB.y = tempY;
        }
      } else {
        const roomAIndex = Math.floor(Math.random() * this.rooms.length);
        const roomBIndex = Math.floor(Math.random() * this.rooms.length);
        if (roomAIndex !== roomBIndex) {
          const roomA = this.rooms[roomAIndex];
          const roomB = this.rooms[roomBIndex];
          const tempX = roomA.x; const tempY = roomA.y;
          roomA.x = roomB.x; roomA.y = roomB.y;
          roomB.x = tempX; roomB.y = tempY;
        }
      }
    }

    for (const room of this.rooms) {
      let mutationApplied = false;
      if (config.usePartnerBias && Math.random() < (config.partnerBiasRate ?? 0.4)) {
        const connectedNeighbor = this.findConnectedNeighbor(room, adjacencies);
        if (connectedNeighbor) {
          const dx = (connectedNeighbor.x - room.x) * 0.7;
          const dy = (connectedNeighbor.y - room.y) * 0.7;
          room.x += dx;
          room.y += dy;
          mutationApplied = true;
        }
      }

      if (!mutationApplied && Math.random() < mutationRate) {
        room.x += (Math.random() - 0.5) * mutationStrength;
        room.y += (Math.random() - 0.5) * mutationStrength;
      }

      if (Math.random() < aspectMutationRate) {
        const isCorridor = room.id.startsWith('corridor-');
        const targetRatio = (globalTargetRatio && !isCorridor) ? globalTargetRatio : room.targetRatio;
        const minRatio = 1.0 / targetRatio;
        const maxRatio = targetRatio;

        const pressureDelta = room.accumulatedPressureX - room.accumulatedPressureY;
        const totalPressure = room.accumulatedPressureX + room.accumulatedPressureY;

        let bias = 0;
        const PRESSURE_SENSITIVITY = 0.3;

        if (totalPressure > 0.1) {
          if (pressureDelta > 0.5) bias = -PRESSURE_SENSITIVITY;
          else if (pressureDelta < -0.5) bias = PRESSURE_SENSITIVITY;
        }

        const currentRatio = room.width / room.height;
        const randomChange = (Math.random() - 0.5) * 0.2;
        let newRatio = currentRatio * (1 + randomChange + bias);
        newRatio = Math.max(minRatio, Math.min(maxRatio, newRatio));
        
        room.width = Math.sqrt(room.targetArea * newRatio);
        room.height = room.targetArea / room.width;
      }

      room.width = Math.max(1, room.width);
      room.height = Math.max(1, room.height);
    }
  }

  private findConnectedNeighbor(room: RoomStateES, adjacencies: Adjacency[]): RoomStateES | null {
    const neighbors: string[] = [];
    for (const adj of adjacencies) {
      if (adj.a === room.id) neighbors.push(adj.b);
      else if (adj.b === room.id) neighbors.push(adj.a);
    }
    if (neighbors.length === 0) return null;
    const neighborId = neighbors[Math.floor(Math.random() * neighbors.length)];
    return this.rooms.find(r => r.id === neighborId) ?? null;
  }

  private findBestSwapCandidates(adjacencies: Adjacency[]): Array<{ roomAId: string; roomBId: string; improvementScore: number; }> {
    const candidates: Array<{ roomAId: string; roomBId: string; improvementScore: number; }> = [];
    for (const adj of adjacencies) {
      const roomA = this.rooms.find(r => r.id === adj.a);
      const roomB = this.rooms.find(r => r.id === adj.b);
      if (!roomA || !roomB) continue;
      const currentDistance = this.calculateDistance(roomA, roomB);
      const swappedDistance = this.calculateDistanceSwapped(roomA, roomB);
      const improvement = currentDistance - swappedDistance;
      if (improvement > 0) {
        const weightedImprovement = improvement * (adj.weight ?? 1.0);
        candidates.push({ roomAId: adj.a, roomBId: adj.b, improvementScore: weightedImprovement });
      }
    }
    candidates.sort((a, b) => b.improvementScore - a.improvementScore);
    return candidates;
  }

  private calculateDistance(roomA: RoomStateES, roomB: RoomStateES): number {
    const centerA = { x: roomA.x + roomA.width / 2, y: roomA.y + roomA.height / 2 };
    const centerB = { x: roomB.x + roomB.width / 2, y: roomB.y + roomB.height / 2 };
    const dx = centerB.x - centerA.x;
    const dy = centerB.y - centerA.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateDistanceSwapped(roomA: RoomStateES, roomB: RoomStateES): number {
    const centerA = { x: roomB.x + roomA.width / 2, y: roomB.y + roomA.height / 2 };
    const centerB = { x: roomA.x + roomB.width / 2, y: roomA.y + roomB.height / 2 };
    const dx = centerB.x - centerA.x;
    const dy = centerB.y - centerA.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  crossover(other: Gene): Gene {
    const childRooms: RoomStateES[] = [];
    for (let i = 0; i < this.rooms.length; i++) {
      const parentA = this.rooms[i];
      const parentB = other.rooms[i];
      const child: RoomStateES = {
        id: parentA.id,
        x: Math.random() < 0.5 ? parentA.x : parentB.x,
        y: Math.random() < 0.5 ? parentA.y : parentB.y,
        width: Math.random() < 0.5 ? parentA.width : parentB.width,
        height: Math.random() < 0.5 ? parentA.height : parentB.height,
        targetRatio: parentA.targetRatio,
        targetArea: parentA.targetArea,
        pressureX: 0,
        pressureY: 0,
        accumulatedPressureX: (parentA.accumulatedPressureX + parentB.accumulatedPressureX) / 2,
        accumulatedPressureY: (parentA.accumulatedPressureY + parentB.accumulatedPressureY) / 2,
      };
      childRooms.push(child);
    }
    return new Gene(childRooms);
  }
}