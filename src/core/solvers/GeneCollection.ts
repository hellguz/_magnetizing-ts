import { Gene } from './Gene.js';
import { RoomStateES, Adjacency, SpringConfig } from '../../types.js';
import { Vec2 } from '../geometry/Vector2.js';

/**
 * Manages a population of genes for the evolutionary algorithm.
 * Handles selection, crossover, mutation, and fitness evaluation.
 */
export class GeneCollection {
  private genes: Gene[] = [];
  private boundary: Vec2[];
  private adjacencies: Adjacency[];
  private config: SpringConfig;
  private globalTargetRatio: number | undefined;

  constructor(
    initialRooms: RoomStateES[],
    boundary: Vec2[],
    adjacencies: Adjacency[],
    config: SpringConfig,
    globalTargetRatio?: number
  ) {
    this.boundary = boundary;
    this.adjacencies = adjacencies;
    this.config = config;
    this.globalTargetRatio = globalTargetRatio;

    // Initialize population with random variations
    this.initializePopulation(initialRooms);
  }

  /**
   * Create initial population by mutating the base configuration
   */
  private initializePopulation(baseRooms: RoomStateES[]): void {
    // Create the first gene from the base configuration
    const baseGene = new Gene(baseRooms);
    this.genes.push(baseGene);

    // Create the rest of the population with mutations
    for (let i = 1; i < this.config.populationSize; i++) {
      const gene = baseGene.clone();
      gene.mutate(0.5, this.config.mutationStrength * 2, this.config.aspectRatioMutationRate, this.globalTargetRatio); // Higher initial mutation
      this.genes.push(gene);
    }
  }

  /**
   * Run one generation of the evolutionary algorithm:
   * 1. Apply squish collisions to all genes
   * 2. Evaluate fitness
   * 3. Sort by fitness
   * 4. Perform crossover
   * 5. Mutate offspring
   * 6. Cull worst performers
   */
  iterate(): void {
    // Step 1: Apply collision resolution to all genes
    for (const gene of this.genes) {
      gene.applySquishCollisions(this.boundary, this.globalTargetRatio);
    }

    // Step 2: Calculate fitness for all genes
    for (const gene of this.genes) {
      gene.calculateFitness(this.boundary, this.adjacencies, this.config.fitnessBalance);
    }

    // Step 3: Sort by fitness (lower is better)
    this.genes.sort((a, b) => a.fitness - b.fitness);

    // Step 4: Crossover - create offspring from best genes
    const offspring: Gene[] = [];
    const numOffspring = Math.floor(this.config.populationSize * this.config.crossoverRate);

    for (let i = 0; i < numOffspring; i++) {
      // Select two random parents from the top half
      const topHalfSize = Math.floor(this.genes.length / 2);
      const parentAIndex = Math.floor(Math.random() * topHalfSize);
      const parentBIndex = Math.floor(Math.random() * topHalfSize);

      const parentA = this.genes[parentAIndex];
      const parentB = this.genes[parentBIndex];

      const child = parentA.crossover(parentB);
      offspring.push(child);
    }

    // Step 5: Mutate offspring
    for (const child of offspring) {
      child.mutate(this.config.mutationRate, this.config.mutationStrength, this.config.aspectRatioMutationRate, this.globalTargetRatio);
    }

    // Step 6: Add offspring to population
    this.genes.push(...offspring);

    // Step 7: Cull worst performers
    const numToCull = Math.floor(this.genes.length * this.config.selectionPressure);
    this.genes = this.genes.slice(0, this.genes.length - numToCull);

    // Ensure we maintain minimum population size
    while (this.genes.length < this.config.populationSize) {
      const randomGene = this.genes[Math.floor(Math.random() * this.genes.length)];
      const clone = randomGene.clone();
      clone.mutate(this.config.mutationRate, this.config.mutationStrength, this.config.aspectRatioMutationRate, this.globalTargetRatio);
      this.genes.push(clone);
    }
  }

  /**
   * Get the best gene (lowest fitness)
   */
  getBest(): Gene {
    // Ensure genes are sorted
    this.genes.sort((a, b) => a.fitness - b.fitness);
    return this.genes[0];
  }

  /**
   * Get all genes in the population
   */
  getAll(): Gene[] {
    return [...this.genes];
  }

  /**
   * Get population statistics for monitoring
   */
  getStats(): {
    bestFitness: number;
    worstFitness: number;
    avgFitness: number;
    bestFitnessG: number;
    bestFitnessT: number;
  } {
    if (this.genes.length === 0) {
      return {
        bestFitness: Infinity,
        worstFitness: Infinity,
        avgFitness: Infinity,
        bestFitnessG: Infinity,
        bestFitnessT: Infinity,
      };
    }

    const fitnesses = this.genes.map(g => g.fitness);
    const best = this.getBest();

    return {
      bestFitness: Math.min(...fitnesses),
      worstFitness: Math.max(...fitnesses),
      avgFitness: fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length,
      bestFitnessG: best.fitnessG,
      bestFitnessT: best.fitnessT,
    };
  }
}
