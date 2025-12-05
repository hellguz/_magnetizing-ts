import { EvolutionaryGene, EvolutionaryConfig } from './EvolutionaryGene.js';
import { RoomStateES, Adjacency } from '../../types.js';
import { Vec2 } from '../geometry/Vector2.js';
import { Polygon } from '../geometry/Polygon.js';

/**
 * Evolutionary Floorplan Solver
 *
 * Population-based evolutionary algorithm with:
 * - Fixed population of 25 variants
 * - Mutation → Physics → Selection → Duplication cycle
 */
export class EvolutionaryFloorplanSolver {
  private population: EvolutionaryGene[] = [];
  private boundary: Vec2[];
  private adjacencies: Adjacency[];
  private config: EvolutionaryConfig;
  private globalTargetRatio: number | undefined;
  public generation: number = 0;

  constructor(
    initialRooms: RoomStateES[],
    boundary: Vec2[],
    adjacencies: Adjacency[],
    config: EvolutionaryConfig,
    globalTargetRatio?: number
  ) {
    this.boundary = boundary;
    this.adjacencies = adjacencies;
    this.config = config;
    this.globalTargetRatio = globalTargetRatio;

    // Initialize population of 25 random variants
    this.initializePopulation(initialRooms);
  }

  /**
   * Initialize population with 25 random variants
   */
  private initializePopulation(baseRooms: RoomStateES[]): void {
    const boundaryAABB = Polygon.calculateAABB(this.boundary);

    for (let i = 0; i < this.config.populationSize; i++) {
      // Create a copy of rooms with randomized positions
      const randomizedRooms = baseRooms.map(room => ({
        ...room,
        x: boundaryAABB.minX + Math.random() * (boundaryAABB.maxX - boundaryAABB.minX - room.width),
        y: boundaryAABB.minY + Math.random() * (boundaryAABB.maxY - boundaryAABB.minY - room.height),
      }));

      const gene = new EvolutionaryGene(randomizedRooms);

      // CRITICAL: Apply boundary constraints and initial physics
      for (let j = 0; j < 10; j++) {
        gene.applySquishCollisions(this.boundary, this.config as any, this.globalTargetRatio);
      }

      this.population.push(gene);
    }
  }

  /**
   * Run one iteration of physics on all genes in the population.
   * This is used for real-time visualization of the inner loop.
   */
  stepPhysics(): void {
     for (const gene of this.population) {
        // Pass adjacencies here to enable direct attraction forces during physics
        gene.applySquishCollisions(this.boundary, this.config as any, this.globalTargetRatio);
     }
  }

  /**
   * Run the evolution phase: Selection, Duplication, Mutation.
   * Creates the next generation of variants.
   * @param disableMutation - If true, skips mutation phase (for final settling generations)
   */
  stepEvolution(disableMutation: boolean = false): void {
    // 1. Fitness Evaluation
    // Evaluate the ~50 variants from the previous physics phase
    for (const gene of this.population) {
      gene.calculateEvolutionaryFitness(this.boundary, this.adjacencies, this.config);
    }

    // 2. Selection - Sort by fitness (lower is better)
    this.population.sort((a, b) => a.fitness - b.fitness);

    const survivors = this.population.slice(0, this.config.populationSize);
    const nextGenBase: EvolutionaryGene[] = [];
    survivors.forEach(s => nextGenBase.push(s.clone()));

    // At this point nextGenBase has 25 variants.

    if (disableMutation) {
      // Skip mutations - just duplicate survivors for settling phase
      const duplicates: EvolutionaryGene[] = [];
      survivors.forEach(s => duplicates.push(s.clone()));
      this.population = [...nextGenBase, ...duplicates];
    } else {
      // 4. Mutation - Create mutated copies to expand population
      // "So now we have 25 vars. Then we copy 25 variants and to these copies we apply mutations"
      const mutants: EvolutionaryGene[] = [];

      for (const parent of nextGenBase) {
          const mutant = parent.clone();

          // Apply 1 to 3 mutations per mutant
          const numMutations = Math.floor(Math.random() * 3) + 1;
          for (let i = 0; i < numMutations; i++) {
               const rand = Math.random();
               const totalProb = this.config.teleportProbability + this.config.swapProbability + this.config.rotationProbability + this.config.reshapeProbability;

               // BUG FIX: If all probabilities are 0, do not mutate.
               // Previously this fell through to 'else' and rotated.
               if (totalProb <= 0.0001) continue;

               const normalizedRand = rand * totalProb;

               if (normalizedRand < this.config.teleportProbability) {
                   this.applyTeleport(mutant);
               } else if (normalizedRand < this.config.teleportProbability + this.config.swapProbability) {
                   this.applySwap(mutant);
               } else if (normalizedRand < this.config.teleportProbability + this.config.swapProbability + this.config.rotationProbability) {
                   this.applyRotation(mutant);
               } else {
                   this.applyReshape(mutant);
               }
          }
          mutants.push(mutant);
      }

      // 5. Combine parents + mutants (Total 50 vars)
      // "So now we have 2*intial num of vars"
      this.population = [...nextGenBase, ...mutants];
    }

    this.generation++;
  }

  /**
   * Legacy Step: Executes ONE full generation cycle.
   */
  step(): void {
    // Legacy support: Just run the granular steps in order
    this.stepEvolution();
    for(let i=0; i<this.config.physicsIterations; i++) {
        this.stepPhysics();
    }
  }

  simulate(generations: number): void {
    for (let i = 0; i < generations && this.generation < this.config.maxGenerations; i++) {
      this.step();
    }
  }

  private applyTeleport(gene: EvolutionaryGene): void {
    const rooms = gene.rooms;
    if (rooms.length === 0) return;
    const room = rooms[Math.floor(Math.random() * rooms.length)];

    // Randomize aspect ratio within allowed range
    const maxRatio = this.globalTargetRatio ?? room.targetRatio;
    const minRatio = 1.0 / maxRatio;
    // Random aspect ratio (width/height) in range [minRatio, maxRatio]
    const newAspectRatio = minRatio + Math.random() * (maxRatio - minRatio);

    // Recalculate width and height maintaining target area
    // area = width * height, aspectRatio = width / height
    // => width = sqrt(area * aspectRatio), height = sqrt(area / aspectRatio)
    const newWidth = Math.sqrt(room.targetArea * newAspectRatio);
    const newHeight = Math.sqrt(room.targetArea / newAspectRatio);

    room.width = newWidth;
    room.height = newHeight;

    // Teleport to random position
    const boundaryAABB = Polygon.calculateAABB(this.boundary);
    const maxX = boundaryAABB.maxX - room.width;
    const maxY = boundaryAABB.maxY - room.height;

    if (maxX > boundaryAABB.minX && maxY > boundaryAABB.minY) {
      room.x = boundaryAABB.minX + Math.random() * (maxX - boundaryAABB.minX);
      room.y = boundaryAABB.minY + Math.random() * (maxY - boundaryAABB.minY);
    }
  }

  private applySwap(gene: EvolutionaryGene): void {
    const rooms = gene.rooms;
    if (rooms.length < 2) return;
    const numRoomsToSwap = Math.min(4, Math.floor(Math.random() * 3) + 2);
    const indices: number[] = [];
    while (indices.length < numRoomsToSwap && indices.length < rooms.length) {
      const idx = Math.floor(Math.random() * rooms.length);
      if (!indices.includes(idx)) {
        indices.push(idx);
      }
    }
    for (let i = 0; i < Math.floor(indices.length / 2); i++) {
      const idxA = indices[i];
      const idxB = indices[indices.length - 1 - i];
      const tempX = rooms[idxA].x;
      const tempY = rooms[idxA].y;
      rooms[idxA].x = rooms[idxB].x;
      rooms[idxA].y = rooms[idxB].y;
      rooms[idxB].x = tempX;
      rooms[idxB].y = tempY;
    }
  }

  private applyRotation(gene: EvolutionaryGene): void {
    const angleDegrees = 25 + Math.random() * (335 - 25);
    const angleRadians = (angleDegrees * Math.PI) / 180;
    const center = this.calculateCentroid(this.boundary);
    for (const room of gene.rooms) {
      const roomCenterX = room.x + room.width / 2;
      const roomCenterY = room.y + room.height / 2;
      const dx = roomCenterX - center.x;
      const dy = roomCenterY - center.y;
      const cos = Math.cos(angleRadians);
      const sin = Math.sin(angleRadians);
      const newDx = dx * cos - dy * sin;
      const newDy = dx * sin + dy * cos;
      const newCenterX = center.x + newDx;
      const newCenterY = center.y + newDy;
      room.x = newCenterX - room.width / 2;
      room.y = newCenterY - room.height / 2;
    }
  }

  private applyReshape(gene: EvolutionaryGene): void {
    const rooms = gene.rooms;
    if (rooms.length === 0) return;
    const room = rooms[Math.floor(Math.random() * rooms.length)];

    // Randomize aspect ratio within allowed range
    const maxRatio = this.globalTargetRatio ?? room.targetRatio;
    const minRatio = 1.0 / maxRatio;
    // Random aspect ratio (width/height) in range [minRatio, maxRatio]
    const newAspectRatio = minRatio + Math.random() * (maxRatio - minRatio);

    // Store room center position
    const centerX = room.x + room.width / 2;
    const centerY = room.y + room.height / 2;

    // Recalculate width and height maintaining target area
    // area = width * height, aspectRatio = width / height
    // => width = sqrt(area * aspectRatio), height = sqrt(area / aspectRatio)
    const newWidth = Math.sqrt(room.targetArea * newAspectRatio);
    const newHeight = Math.sqrt(room.targetArea / newAspectRatio);

    room.width = newWidth;
    room.height = newHeight;

    // Reposition to keep center in same place
    room.x = centerX - newWidth / 2;
    room.y = centerY - newHeight / 2;
  }

  private calculateCentroid(points: Vec2[]): Vec2 {
    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x, y };
  }

  getBest(): EvolutionaryGene {
    return this.population.reduce((best, gene) =>
      gene.fitness < best.fitness ? gene : best
    );
  }

  getPopulation(): EvolutionaryGene[] {
    return this.population;
  }

  getStats() {
    const fitnesses = this.population.map(g => g.fitness);
    const best = this.getBest();
    return {
      generation: this.generation,
      bestFitness: Math.min(...fitnesses),
      avgFitness: fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length,
      worstFitness: Math.max(...fitnesses),
      bestFitnessG: best.fitnessG,
      bestFitnessT: best.fitnessT,
      bestFitnessSharedWall: best.fitnessSharedWall,
    };
  }

  hasReachedMaxGenerations(): boolean {
    return this.generation >= this.config.maxGenerations;
  }

  getState(): Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    targetRatio: number;
    vx: number;
    vy: number;
  }> {
    const best = this.getBest();
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

  hasConverged(threshold: number = 0.01): boolean {
    const stats = this.getStats();
    if (stats.bestFitness < threshold) return true;
    const fitnessRange = stats.worstFitness - stats.bestFitness;
    return fitnessRange < threshold;
  }

  getGeneration(): number {
    return this.generation;
  }

  getKineticEnergy(): number {
    return this.getBest().fitness;
  }
}