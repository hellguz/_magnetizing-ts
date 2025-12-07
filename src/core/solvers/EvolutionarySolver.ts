import { RoomState, Adjacency } from '../../types.js';
import { Vec2 } from '../geometry/Vector2.js';
import { Polygon } from '../geometry/Polygon.js';

/**
 * Configuration for the Evolutionary Floorplan Solver
 */
export interface EvolutionaryConfig {
  populationSize: number; // Number of base variants (doubled after mutation)
  maxGenerations: number; // Maximum generations to run
  physicsIterations: number; // DEPRECATED: Always 10 steps between culling (kept for UI compatibility)
  wallConstraintMeters: number; // Target shared wall length for adjacent rooms

  weights: {
    wallCompliance: number; // Weight for wall constraint violations
    overlap: number; // Weight for room overlaps
    outOfBounds: number; // Weight for rooms outside boundary
    area: number; // Weight for area deviation from target
  };

  mutationRates: {
    teleport: number; // Probability of teleporting a room
    swap: number; // Probability of swapping 2-4 rooms
    rotate: number; // Probability of rotating entire variant
  };
}

/**
 * Represents a single room state within a variant
 */
export interface RoomVariantState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetArea: number;
  targetRatio: number;
}

/**
 * Variant: A lightweight solution candidate for evolutionary optimization
 */
export interface Variant {
  id: string;
  rooms: RoomVariantState[];
  fitness: number;
  fitnessComponents: {
    wallCompliance: number;
    overlaps: number;
    outOfBounds: number;
    areaDeviation: number;
  };
}

// Physics steps between fitness evaluation and culling
const PHYSICS_STEPS_PER_CYCLE = 10;

// Default configuration
const DEFAULT_CONFIG: EvolutionaryConfig = {
  populationSize: 25,
  maxGenerations: 100,
  physicsIterations: 10, // DEPRECATED: not used (always PHYSICS_STEPS_PER_CYCLE)
  wallConstraintMeters: 1.5,
  weights: {
    wallCompliance: 10.0,
    overlap: 5.0,
    outOfBounds: 100.0,
    area: 1.0,
  },
  mutationRates: {
    teleport: 0.3,
    swap: 0.3,
    rotate: 0.3,
  },
};

/**
 * Evolutionary Floorplan Solver
 *
 * Algorithm Flow:
 * 1. Start with 25 base variants + 25 mutated copies = 50 total
 * 2. Apply physics for 10 iterations to all 50 variants
 * 3. Calculate fitness and cull to top 25
 * 4. Duplicate to 25 variants
 * 5. Mutate to create 50 variants again
 * 6. Repeat from step 2
 *
 * Note: Fitness calculation and culling only happen every 10 physics steps,
 * allowing rooms to settle and find better configurations.
 */
export class EvolutionarySolver {
  private population: Variant[] = [];
  private boundary: Vec2[];
  private adjacencies: Adjacency[];
  private config: EvolutionaryConfig;
  private currentGeneration: number = 0;
  private roomTemplates: RoomVariantState[];
  private boundaryArea: number;
  private totalTargetArea: number;
  private physicsStepCounter: number = 0; // Track physics iterations (1-10)

  constructor(
    rooms: RoomState[],
    boundary: Vec2[],
    adjacencies: Adjacency[],
    config: Partial<EvolutionaryConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.adjacencies = adjacencies;

    // Calculate total target area from rooms
    this.totalTargetArea = rooms.reduce((sum, room) => sum + room.width * room.height, 0);

    // Calculate boundary area
    this.boundaryArea = Polygon.area(boundary);

    // Scale boundary to match total target area
    const scaleFactor = Math.sqrt(this.totalTargetArea / this.boundaryArea);
    const centroid = this.calculateCentroid(boundary);
    this.boundary = boundary.map(p => ({
      x: centroid.x + (p.x - centroid.x) * scaleFactor,
      y: centroid.y + (p.y - centroid.y) * scaleFactor,
    }));

    // Store room templates
    this.roomTemplates = rooms.map(r => ({
      id: r.id,
      x: 0,
      y: 0,
      width: r.width,
      height: r.height,
      targetArea: r.width * r.height,
      targetRatio: r.targetRatio,
    }));

    // Initialize population
    this.initializePopulation();
  }

  /**
   * Calculate centroid of a polygon
   */
  private calculateCentroid(points: Vec2[]): Vec2 {
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
  }

  /**
   * Initialize population with random room positions
   * Creates 25 base variants, then immediately mutates them to get 50 total
   */
  private initializePopulation(): void {
    const aabb = Polygon.calculateAABB(this.boundary);
    const MIN_ASPECT_RATIO = 0.5;
    const MAX_ASPECT_RATIO = 2.0;

    // Create base population (25 variants)
    for (let i = 0; i < this.config.populationSize; i++) {
      const rooms: RoomVariantState[] = this.roomTemplates.map(template => {
        // Ensure initial aspect ratio is within bounds
        let width = template.width;
        let height = template.height;
        const aspectRatio = width / height;

        if (aspectRatio > MAX_ASPECT_RATIO) {
          // Too wide - recalculate dimensions
          width = Math.sqrt(template.targetArea * MAX_ASPECT_RATIO);
          height = template.targetArea / width;
        } else if (aspectRatio < MIN_ASPECT_RATIO) {
          // Too tall - recalculate dimensions
          width = Math.sqrt(template.targetArea * MIN_ASPECT_RATIO);
          height = template.targetArea / width;
        }

        return {
          ...template,
          width,
          height,
          x: aabb.minX + Math.random() * (aabb.maxX - aabb.minX - width),
          y: aabb.minY + Math.random() * (aabb.maxY - aabb.minY - height),
        };
      });

      const variant: Variant = {
        id: `gen0-var${i}`,
        rooms,
        fitness: Infinity,
        fitnessComponents: {
          wallCompliance: 0,
          overlaps: 0,
          outOfBounds: 0,
          areaDeviation: 0,
        },
      };

      this.population.push(variant);
    }

    // Create mutated copies to reach 50 variants total (matching the main loop)
    const mutatedVariants: Variant[] = [];
    for (let i = 0; i < this.population.length; i++) {
      const clone = this.cloneVariant(
        this.population[i],
        `gen0-mutated${i}`
      );
      this.mutateVariant(clone);
      mutatedVariants.push(clone);
    }

    // Add mutated variants to population (now we have 50 total)
    this.population.push(...mutatedVariants);
  }

  /**
   * Clone a variant
   */
  private cloneVariant(variant: Variant, newId: string): Variant {
    return {
      id: newId,
      rooms: variant.rooms.map(r => ({ ...r })),
      fitness: variant.fitness,
      fitnessComponents: { ...variant.fitnessComponents },
    };
  }

  /**
   * Main step function: Physics (10 iterations) -> Fitness -> Cull -> Refill -> Mutation
   *
   * Flow:
   * 1. Apply physics for 1 iteration to all variants
   * 2. After 10 physics steps: calculate fitness, cull, refill, and mutate
   * 3. Repeat
   */
  step(): void {
    // Increment physics step counter
    this.physicsStepCounter++;

    // 1. PHYSICS: Apply one physics iteration to all variants
    this.population.forEach(variant => {
      this.applyPhysics(variant);
    });

    // 2. Only after 10 physics steps: FITNESS -> CULL -> REFILL -> MUTATE
    if (this.physicsStepCounter >= PHYSICS_STEPS_PER_CYCLE) {
      this.currentGeneration++;
      this.physicsStepCounter = 0; // Reset counter

      // 2a. FITNESS CALCULATION
      this.population.forEach(variant => this.calculateFitness(variant));

      // 2b. SELECTION (Culling): Keep top 50%
      this.population.sort((a, b) => a.fitness - b.fitness);
      const survivors = this.population.slice(0, Math.ceil(this.population.length / 2));

      // 2c. REFILL: Duplicate survivors to reach population size
      this.population = [];
      let survivorIndex = 0;
      for (let i = 0; i < this.config.populationSize; i++) {
        const original = survivors[survivorIndex % survivors.length];
        const copy = this.cloneVariant(original, `gen${this.currentGeneration}-var${i}`);
        this.population.push(copy);
        survivorIndex++;
      }

      // 2d. MUTATION (Expansion): Clone and mutate each variant
      // This creates 2x population (50 variants from 25)
      const mutatedVariants: Variant[] = [];
      for (let i = 0; i < this.population.length; i++) {
        const clone = this.cloneVariant(
          this.population[i],
          `gen${this.currentGeneration}-mutated${i}`
        );
        this.mutateVariant(clone);
        mutatedVariants.push(clone);
      }

      // Add mutated variants to population (now we have 50 total)
      this.population.push(...mutatedVariants);
    }
  }

  /**
   * Apply 1-3 random mutations to a variant
   */
  private mutateVariant(variant: Variant): void {
    const numMutations = 1 + Math.floor(Math.random() * 3); // 1-3 mutations

    for (let i = 0; i < numMutations; i++) {
      const rand = Math.random();

      if (rand < this.config.mutationRates.teleport) {
        this.mutateTeleport(variant);
      } else if (rand < this.config.mutationRates.teleport + this.config.mutationRates.swap) {
        this.mutateSwap(variant);
      } else if (
        rand <
        this.config.mutationRates.teleport +
          this.config.mutationRates.swap +
          this.config.mutationRates.rotate
      ) {
        this.mutateRotate(variant);
      }
    }
  }

  /**
   * Teleport Mutation: Move one random room to a random position
   */
  private mutateTeleport(variant: Variant): void {
    if (variant.rooms.length === 0) return;

    const room = variant.rooms[Math.floor(Math.random() * variant.rooms.length)];
    const aabb = Polygon.calculateAABB(this.boundary);

    room.x = aabb.minX + Math.random() * (aabb.maxX - aabb.minX - room.width);
    room.y = aabb.minY + Math.random() * (aabb.maxY - aabb.minY - room.height);
  }

  /**
   * Swap Mutation: Swap positions of 2-4 rooms
   */
  private mutateSwap(variant: Variant): void {
    if (variant.rooms.length < 2) return;

    const numRooms = 2 + Math.floor(Math.random() * 3); // 2-4 rooms
    const count = Math.min(numRooms, variant.rooms.length);

    // Select random distinct rooms
    const indices: number[] = [];
    while (indices.length < count) {
      const idx = Math.floor(Math.random() * variant.rooms.length);
      if (!indices.includes(idx)) {
        indices.push(idx);
      }
    }

    // Shuffle positions (cyclic shift)
    const positions = indices.map(i => ({ x: variant.rooms[i].x, y: variant.rooms[i].y }));
    for (let i = 0; i < indices.length; i++) {
      const nextPos = positions[(i + 1) % positions.length];
      variant.rooms[indices[i]].x = nextPos.x;
      variant.rooms[indices[i]].y = nextPos.y;
    }
  }

  /**
   * Rotation Mutation: Rotate all rooms around centroid
   */
  private mutateRotate(variant: Variant): void {
    if (variant.rooms.length === 0) return;

    const MIN_ASPECT_RATIO = 0.5;
    const MAX_ASPECT_RATIO = 2.0;

    // Random angle between 25° and 335°
    const angleDeg = 25 + Math.random() * 310;
    const angleRad = (angleDeg * Math.PI) / 180;

    // Calculate centroid of all room centers
    const centroid = this.calculateCentroid(
      variant.rooms.map(r => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 }))
    );

    // Rotate each room around centroid
    variant.rooms.forEach(room => {
      const centerX = room.x + room.width / 2;
      const centerY = room.y + room.height / 2;

      // Rotate center point
      const dx = centerX - centroid.x;
      const dy = centerY - centroid.y;
      const newCenterX = centroid.x + dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
      const newCenterY = centroid.y + dx * Math.sin(angleRad) + dy * Math.cos(angleRad);

      // Swap width/height if angle is close to 90° or 270°
      const normalizedAngle = angleDeg % 180;
      if (normalizedAngle > 45 && normalizedAngle < 135) {
        const newWidth = room.height;
        const newHeight = room.width;
        const newAspectRatio = newWidth / newHeight;

        // Only swap if it doesn't violate aspect ratio constraints
        if (newAspectRatio >= MIN_ASPECT_RATIO && newAspectRatio <= MAX_ASPECT_RATIO) {
          room.width = newWidth;
          room.height = newHeight;
        }
        // If swap would violate constraints, keep original dimensions
      }

      // Update position (top-left corner)
      room.x = newCenterX - room.width / 2;
      room.y = newCenterY - room.height / 2;
    });
  }

  /**
   * Apply physics: Wall constraints, boundary repulsion, squish, inflation
   */
  private applyPhysics(variant: Variant): void {
    // 1. Wall Constraint Force (Adjacency)
    this.applyWallConstraintForce(variant);

    // 2. Boundary Repulsion
    this.applyBoundaryRepulsion(variant);

    // 3. Squish & Aspect Ratio Constraint
    this.applySquishCollisions(variant);

    // 4. Inflation
    this.applyInflation(variant);
  }

  /**
   * Apply attraction force for adjacent rooms to share walls
   */
  private applyWallConstraintForce(variant: Variant): void {
    const targetWallLength = this.config.wallConstraintMeters;

    for (const adj of this.adjacencies) {
      const roomA = variant.rooms.find(r => r.id === adj.a);
      const roomB = variant.rooms.find(r => r.id === adj.b);

      if (!roomA || !roomB) continue;

      // Calculate centers
      const centerA = { x: roomA.x + roomA.width / 2, y: roomA.y + roomA.height / 2 };
      const centerB = { x: roomB.x + roomB.width / 2, y: roomB.y + roomB.height / 2 };

      // Calculate vector between centers
      const dx = centerB.x - centerA.x;
      const dy = centerB.y - centerA.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.1) continue;

      // Calculate desired distance (rooms should touch)
      const desiredDist = (roomA.width + roomB.width) / 4 + (roomA.height + roomB.height) / 4;

      // Apply attraction force if too far apart
      if (dist > desiredDist) {
        const force = (dist - desiredDist) * 0.1;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        roomA.x += fx * 0.5;
        roomA.y += fy * 0.5;
        roomB.x -= fx * 0.5;
        roomB.y -= fy * 0.5;
      }
    }
  }

  /**
   * Apply boundary repulsion to keep rooms inside
   * STRICT CONSTRAINT: Iteratively ensures ALL room corners are inside boundary
   * Matches SpringSolver/Gene.ts constrainToBoundary logic
   */
  private applyBoundaryRepulsion(variant: Variant): void {
    const MAX_ITERATIONS = 10; // Prevent infinite loops

    for (const room of variant.rooms) {
      // Iteratively push room inside until all corners are contained
      for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
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
          if (!Polygon.pointInPolygon(corner, this.boundary)) {
            allInside = false;
            // Find the farthest outside corner
            const closestOnBoundary = Polygon.closestPointOnPolygon(corner, this.boundary);
            const distSq =
              (corner.x - closestOnBoundary.x) ** 2 + (corner.y - closestOnBoundary.y) ** 2;

            if (distSq > maxDistSq) {
              maxDistSq = distSq;
              farthestOutsideCorner = corner;
            }
          }
        }

        // All corners inside - we're done
        if (allInside) {
          break;
        }

        // Push the room towards the boundary
        if (farthestOutsideCorner) {
          const closestOnBoundary = Polygon.closestPointOnPolygon(farthestOutsideCorner, this.boundary);

          // Calculate push direction (from outside corner to boundary)
          const pushX = closestOnBoundary.x - farthestOutsideCorner.x;
          const pushY = closestOnBoundary.y - farthestOutsideCorner.y;

          // Apply with slight overshoot to ensure we get inside
          room.x += pushX * 1.1;
          room.y += pushY * 1.1;
        }
      }
    }
  }

  /**
   * Apply squish collision resolution (simplified version of Gene.ts logic)
   */
  private applySquishCollisions(variant: Variant): void {
    const n = variant.rooms.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const roomA = variant.rooms[i];
        const roomB = variant.rooms[j];

        // AABB check
        const aabbA = {
          minX: roomA.x,
          minY: roomA.y,
          maxX: roomA.x + roomA.width,
          maxY: roomA.y + roomA.height,
        };
        const aabbB = {
          minX: roomB.x,
          minY: roomB.y,
          maxX: roomB.x + roomB.width,
          maxY: roomB.y + roomB.height,
        };

        if (!this.aabbIntersects(aabbA, aabbB)) continue;

        // Calculate overlap
        const overlapX = Math.min(aabbA.maxX, aabbB.maxX) - Math.max(aabbA.minX, aabbB.minX);
        const overlapY = Math.min(aabbA.maxY, aabbB.maxY) - Math.max(aabbA.minY, aabbB.minY);

        // Try to squish along smaller overlap dimension
        if (overlapX < overlapY) {
          this.trySquishHorizontal(roomA, roomB, overlapX);
        } else {
          this.trySquishVertical(roomA, roomB, overlapY);
        }
      }
    }
  }

  /**
   * Check if two AABBs intersect
   */
  private aabbIntersects(a: any, b: any): boolean {
    return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
  }

  /**
   * Try to squish rooms horizontally
   */
  private trySquishHorizontal(roomA: RoomVariantState, roomB: RoomVariantState, overlap: number): void {
    const shrinkAmount = overlap * 0.5 + 0.1;

    const newWidthA = roomA.width - shrinkAmount;
    const newWidthB = roomB.width - shrinkAmount;

    const newHeightA = roomA.targetArea / newWidthA;
    const newHeightB = roomB.targetArea / newWidthB;

    // Check aspect ratio constraints - HARD LIMIT: 0.5 to 2.0
    const ratioA = newWidthA / newHeightA;
    const ratioB = newWidthB / newHeightB;

    const MIN_ASPECT_RATIO = 0.5; // min = 1/2
    const MAX_ASPECT_RATIO = 2.0; // max = 2

    const validA = ratioA >= MIN_ASPECT_RATIO && ratioA <= MAX_ASPECT_RATIO;
    const validB = ratioB >= MIN_ASPECT_RATIO && ratioB <= MAX_ASPECT_RATIO;

    if (validA && validB) {
      // Both can squish
      const halfShrink = shrinkAmount * 0.5;

      if (roomA.x < roomB.x) {
        roomA.x -= halfShrink;
        roomA.width = newWidthA;
        roomA.height = newHeightA;

        roomB.x += halfShrink;
        roomB.width = newWidthB;
        roomB.height = newHeightB;
      } else {
        roomA.x += halfShrink;
        roomA.width = newWidthA;
        roomA.height = newHeightA;

        roomB.x -= halfShrink;
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
   * Try to squish rooms vertically
   */
  private trySquishVertical(roomA: RoomVariantState, roomB: RoomVariantState, overlap: number): void {
    const shrinkAmount = overlap * 0.5 + 0.1;

    const newHeightA = roomA.height - shrinkAmount;
    const newHeightB = roomB.height - shrinkAmount;

    const newWidthA = roomA.targetArea / newHeightA;
    const newWidthB = roomB.targetArea / newHeightB;

    // Check aspect ratio constraints - HARD LIMIT: 0.5 to 2.0
    const ratioA = newWidthA / newHeightA;
    const ratioB = newWidthB / newHeightB;

    const MIN_ASPECT_RATIO = 0.5; // min = 1/2
    const MAX_ASPECT_RATIO = 2.0; // max = 2

    const validA = ratioA >= MIN_ASPECT_RATIO && ratioA <= MAX_ASPECT_RATIO;
    const validB = ratioB >= MIN_ASPECT_RATIO && ratioB <= MAX_ASPECT_RATIO;

    if (validA && validB) {
      // Both can squish
      const halfShrink = shrinkAmount * 0.5;

      if (roomA.y < roomB.y) {
        roomA.y -= halfShrink;
        roomA.width = newWidthA;
        roomA.height = newHeightA;

        roomB.y += halfShrink;
        roomB.width = newWidthB;
        roomB.height = newHeightB;
      } else {
        roomA.y += halfShrink;
        roomA.width = newWidthA;
        roomA.height = newHeightA;

        roomB.y -= halfShrink;
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
   * Apply inflation to grow rooms toward target area
   */
  private applyInflation(variant: Variant): void {
    const inflationRate = 1.05; // 5% growth per iteration
    const MIN_ASPECT_RATIO = 0.5;
    const MAX_ASPECT_RATIO = 2.0;

    for (const room of variant.rooms) {
      const currentArea = room.width * room.height;

      if (currentArea < room.targetArea) {
        room.width *= inflationRate;
        room.height *= inflationRate;

        // Ensure aspect ratio stays within bounds after inflation
        const aspectRatio = room.width / room.height;
        if (aspectRatio > MAX_ASPECT_RATIO) {
          // Too wide - make it narrower
          room.width = Math.sqrt(room.targetArea * MAX_ASPECT_RATIO);
          room.height = room.targetArea / room.width;
        } else if (aspectRatio < MIN_ASPECT_RATIO) {
          // Too tall - make it wider
          room.width = Math.sqrt(room.targetArea * MIN_ASPECT_RATIO);
          room.height = room.targetArea / room.width;
        }
      }
    }
  }

  /**
   * Calculate fitness for a variant
   */
  private calculateFitness(variant: Variant): void {
    let wallCompliance = 0;
    let overlaps = 0;
    let outOfBounds = 0;
    let areaDeviation = 0;

    // 1. Wall Compliance: Check adjacencies for shared wall length
    for (const adj of this.adjacencies) {
      const roomA = variant.rooms.find(r => r.id === adj.a);
      const roomB = variant.rooms.find(r => r.id === adj.b);

      if (!roomA || !roomB) continue;

      const contactLength = this.calculateContactLength(roomA, roomB);

      if (contactLength < this.config.wallConstraintMeters) {
        wallCompliance += Math.pow(this.config.wallConstraintMeters - contactLength, 2);
      }
    }

    // 2. Overlaps: Sum of overlap areas squared
    const n = variant.rooms.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const roomA = variant.rooms[i];
        const roomB = variant.rooms[j];

        const polyA = Polygon.createRectangle(roomA.x, roomA.y, roomA.width, roomA.height);
        const polyB = Polygon.createRectangle(roomB.x, roomB.y, roomB.width, roomB.height);

        const overlapArea = Polygon.intersectionArea(polyA, polyB);
        if (overlapArea > 0.01) {
          overlaps += Math.pow(overlapArea, 2);
        }
      }
    }

    // 3. Out of Bounds: Area outside boundary squared
    for (const room of variant.rooms) {
      const roomPoly = Polygon.createRectangle(room.x, room.y, room.width, room.height);
      const roomArea = room.width * room.height;
      const insideArea = Polygon.intersectionArea(this.boundary, roomPoly);
      const outsideArea = Math.max(0, roomArea - insideArea);

      if (outsideArea > 0.01) {
        outOfBounds += Math.pow(outsideArea, 2);
      }
    }

    // 4. Area Deviation: Sum of area differences squared
    for (const room of variant.rooms) {
      const currentArea = room.width * room.height;
      areaDeviation += Math.pow(currentArea - room.targetArea, 2);
    }

    // Store components
    variant.fitnessComponents = {
      wallCompliance,
      overlaps,
      outOfBounds,
      areaDeviation,
    };

    // Calculate total fitness (weighted sum)
    variant.fitness =
      this.config.weights.wallCompliance * wallCompliance +
      this.config.weights.overlap * overlaps +
      this.config.weights.outOfBounds * outOfBounds +
      this.config.weights.area * areaDeviation;
  }

  /**
   * Calculate contact length between two rooms
   */
  private calculateContactLength(roomA: RoomVariantState, roomB: RoomVariantState): number {
    // Check horizontal contact (aligned on Y axis)
    const yOverlapStart = Math.max(roomA.y, roomB.y);
    const yOverlapEnd = Math.min(roomA.y + roomA.height, roomB.y + roomB.height);
    const yOverlap = Math.max(0, yOverlapEnd - yOverlapStart);

    if (yOverlap > 0) {
      // Check if rooms are touching horizontally
      const gapX = Math.abs((roomA.x + roomA.width / 2) - (roomB.x + roomB.width / 2));
      const sumHalfWidths = (roomA.width + roomB.width) / 2;

      if (Math.abs(gapX - sumHalfWidths) < 0.5) {
        return yOverlap;
      }
    }

    // Check vertical contact (aligned on X axis)
    const xOverlapStart = Math.max(roomA.x, roomB.x);
    const xOverlapEnd = Math.min(roomA.x + roomA.width, roomB.x + roomB.width);
    const xOverlap = Math.max(0, xOverlapEnd - xOverlapStart);

    if (xOverlap > 0) {
      // Check if rooms are touching vertically
      const gapY = Math.abs((roomA.y + roomA.height / 2) - (roomB.y + roomB.height / 2));
      const sumHalfHeights = (roomA.height + roomB.height) / 2;

      if (Math.abs(gapY - sumHalfHeights) < 0.5) {
        return xOverlap;
      }
    }

    return 0;
  }

  /**
   * Get current best variant
   */
  getBest(): Variant {
    return this.population.reduce((best, current) =>
      current.fitness < best.fitness ? current : best
    );
  }

  /**
   * Get all variants in the population
   */
  getAllVariants(): Variant[] {
    return this.population;
  }

  /**
   * Get current generation number
   */
  getGeneration(): number {
    return this.currentGeneration;
  }

  /**
   * Get boundary
   */
  getBoundary(): Vec2[] {
    return this.boundary;
  }

  /**
   * Convert variant rooms to RoomState format for visualization
   */
  variantToRoomState(variant: Variant): RoomState[] {
    return variant.rooms.map(r => ({
      id: r.id,
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      vx: 0,
      vy: 0,
      targetRatio: r.targetRatio,
    }));
  }
}
