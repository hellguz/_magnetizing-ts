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
      for (let j = 0; j < 20; j++) {
        // Pass adjacencies to enable attraction during initialization too
        gene.applySquishCollisions(this.boundary, this.config as any, this.globalTargetRatio, this.adjacencies);
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
        gene.applySquishCollisions(this.boundary, this.config as any, this.globalTargetRatio, this.adjacencies);
     }
  }

  /**
   * Run the evolution phase: Selection, Duplication, Mutation.
   * Creates the next generation of variants.
   */
  stepEvolution(): void {
    // 1. Fitness Evaluation
    for (const gene of this.population) {
      gene.calculateEvolutionaryFitness(this.boundary, this.adjacencies, this.config);
    }

    // 2. Selection - Keep best 50%
    this.population.sort((a, b) => a.fitness - b.fitness);
    const numToKeep = Math.ceil(this.config.populationSize * 0.5);
    const survivors = this.population.slice(0, numToKeep);

    // 3. Duplication - Refill to population size
    this.population = [];
    while (this.population.length < this.config.populationSize) {
      const sourceIndex = this.population.length % survivors.length;
      const source = survivors[sourceIndex];
      this.population.push(source.clone());
    }

    // 4. Mutation - Apply mutations to the new generation (except elites if desired, but here we mutate all cloned)
    // Note: We typically keep the top elite unchanged in other GAs, but here we mutate copies.
    // Let's modify: Keep top 1 elite unchanged? No, existing logic was "Create 25 mutants".
    // We will follow the pattern: Clone survivors -> Mutate the Clones.
    
    // Existing logic in `step()` was: 
    // Mutate -> expanded array -> physics -> selection -> duplication.
    // To match that flow in a granular way:
    // We just finished selection & duplication. Now we are at start of next gen.
    // So apply mutations now.
    
    const mutants: EvolutionaryGene[] = [];
    for (const parent of this.population) {
        // We act on the population in place or create new.
        // Since we just refilled `this.population` with clones, we can mutate them directly.
        // However, the original `step` logic created mutants separately. 
        // Let's apply mutation in-place for the granular approach.
        
        const numMutations = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < numMutations; i++) {
             const rand = Math.random();
             const totalProb = this.config.teleportProbability + this.config.swapProbability + this.config.rotationProbability;
             const normalizedRand = rand * totalProb;

             if (normalizedRand < this.config.teleportProbability) {
                 this.applyTeleport(parent);
             } else if (normalizedRand < this.config.teleportProbability + this.config.swapProbability) {
                 this.applySwap(parent);
             } else {
                 this.applyRotation(parent);
             }
        }
    }

    this.generation++;
  }

  /**
   * Legacy Step: Executes ONE full generation cycle.
   * 1. Mutation (on previous population clones)
   * 2. Physics (10 iterations)
   * 3. Selection
   * 4. Duplication
   */
  step(): void {
    // Create mutants from current population
    const mutants = this.applyMutations();
    // Combine parents + mutants (Elitism + Diversity)
    // In the original code: `const expanded = [...this.population, ...mutants];`
    // Then physics on all 50. Then select 13. Then fill back to 25.
    
    // To support the new granular flow AND this legacy flow, we need to be careful.
    // The granular flow modifies `this.population` in place.
    // The legacy flow expanded the population temporarily.
    
    // For consistency, let's switch `step()` to use the granular methods.
    // But wait, the legacy logic had a specific "Expand -> Physics -> Select" order which is slightly different
    // from "Select -> Duplicate -> Mutate -> Physics".
    
    // Let's keep the legacy logic here for safety, but update it to use the new physics with attraction.
    const expanded = [...this.population, ...mutants]; 

    // Physics Loop
    for (const gene of expanded) {
      for (let i = 0; i < this.config.physicsIterations; i++) {
        gene.applySquishCollisions(this.boundary, this.config as any, this.globalTargetRatio, this.adjacencies);
      }
    }

    // Evaluation
    for (const gene of expanded) {
      gene.calculateEvolutionaryFitness(this.boundary, this.adjacencies, this.config);
    }

    // Selection
    expanded.sort((a, b) => a.fitness - b.fitness);
    const numToKeep = Math.ceil(this.config.populationSize * 0.5);
    const survivors = expanded.slice(0, numToKeep);

    // Duplication
    this.population = [];
    while (this.population.length < this.config.populationSize) {
      const sourceIndex = this.population.length % survivors.length;
      const source = survivors[sourceIndex];
      this.population.push(source.clone());
    }

    this.generation++;
  }

  simulate(generations: number): void {
    for (let i = 0; i < generations && this.generation < this.config.maxGenerations; i++) {
      this.step();
    }
  }

  private applyMutations(): EvolutionaryGene[] {
    const mutants: EvolutionaryGene[] = [];
    for (const parent of this.population) {
      const mutant = parent.clone();
      const numMutations = Math.floor(Math.random() * 3) + 1;

      for (let i = 0; i < numMutations; i++) {
        const rand = Math.random();
        const totalProb =
          this.config.teleportProbability +
          this.config.swapProbability +
          this.config.rotationProbability;
        const normalizedRand = rand * totalProb;

        if (normalizedRand < this.config.teleportProbability) {
          this.applyTeleport(mutant);
        } else if (
          normalizedRand <
          this.config.teleportProbability + this.config.swapProbability
        ) {
          this.applySwap(mutant);
        } else {
          this.applyRotation(mutant);
        }
      }
      mutants.push(mutant);
    }
    return mutants;
  }

  private applyTeleport(gene: EvolutionaryGene): void {
    const rooms = gene.rooms;
    if (rooms.length === 0) return;
    const room = rooms[Math.floor(Math.random() * rooms.length)];
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
      bestFitnessArea: best.fitnessArea,
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