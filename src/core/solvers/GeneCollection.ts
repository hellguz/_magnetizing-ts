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
  private currentGeneration: number = 0; // Track generation for simulated annealing
  private baseRooms: RoomStateES[]; // Store initial room configuration for fresh blood

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
    this.baseRooms = initialRooms; // Store for fresh blood initialization

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
      gene.mutate(0.5, this.config.mutationStrength * 2, this.config.aspectRatioMutationRate, this.globalTargetRatio, this.config, this.adjacencies); // Higher initial mutation
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
      gene.applySquishCollisions(this.boundary, this.config, this.globalTargetRatio);
    }

    // Step 2: Calculate fitness for all genes
    for (const gene of this.genes) {
      gene.calculateFitness(this.boundary, this.adjacencies, this.config.fitnessBalance, this.config);
    }

    // Step 3: Sort by fitness (lower is better)
    this.genes.sort((a, b) => a.fitness - b.fitness);

    // Step 4: Crossover - create offspring from best genes
    const offspring: Gene[] = [];
    const numOffspring = Math.floor(this.config.populationSize * this.config.crossoverRate);

    // FIX: Widen the parent pool. Instead of top 50% (0.5), use top 90% (0.9) or 100%
    // This allows "worse" genes (like fresh blood) a chance to pass on diversity before dying.
    const parentPoolFraction = 0.5;
    const parentPoolSize = Math.max(2, Math.floor(this.genes.length * parentPoolFraction));

    for (let i = 0; i < numOffspring; i++) {
      // Select random parents from the WIDER pool
      const parentAIndex = Math.floor(Math.random() * parentPoolSize);
      const parentBIndex = Math.floor(Math.random() * parentPoolSize);

      const parentA = this.genes[parentAIndex];
      const parentB = this.genes[parentBIndex];

      const child = parentA.crossover(parentB);
      offspring.push(child);
    }

    // Step 5: Mutate offspring
    for (const child of offspring) {
      child.mutate(
        this.config.mutationRate,
        this.config.mutationStrength,
        this.config.aspectRatioMutationRate,
        this.globalTargetRatio,
        this.config,
        this.adjacencies
      );

      // FEATURE: Physics Warm-Up - allow mutated genes to settle before evaluation
      // Run multiple physics iterations immediately to prevent "death of potential geniuses"
      const warmUpIterations = this.config.warmUpIterations ?? 0;
      for (let i = 0; i < warmUpIterations; i++) {
        child.applySquishCollisions(this.boundary, this.config, this.globalTargetRatio);
      }
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
      clone.mutate(
        this.config.mutationRate,
        this.config.mutationStrength,
        this.config.aspectRatioMutationRate,
        this.globalTargetRatio,
        this.config,
        this.adjacencies
      );

      // FEATURE: Physics Warm-Up - allow mutated genes to settle before evaluation
      const warmUpIterations = this.config.warmUpIterations ?? 0;
      for (let i = 0; i < warmUpIterations; i++) {
        clone.applySquishCollisions(this.boundary, this.config, this.globalTargetRatio);
      }

      this.genes.push(clone);
    }

    // Increment generation counter for simulated annealing
    this.currentGeneration++;

    // FEATURE: Fresh Blood - periodically replace worst performers with new random genes
    // This maintains genetic diversity and prevents premature convergence
    if (this.config.useFreshBlood) {
      const interval = this.config.freshBloodInterval ?? 20;

      // Skip generation 0 (population is already random at initialization)
      if (this.currentGeneration > 0 && this.currentGeneration % interval === 0) {
        // Sort by fitness to identify worst performers (lower is better, so worst are at the end)
        this.genes.sort((a, b) => a.fitness - b.fitness);

        // Replace worst quarter with fresh random genes
        const quarterSize = Math.floor(this.genes.length / 4);
        const numToReplace = Math.max(1, quarterSize); // At least 1

        // Keep the best 75%
        this.genes = this.genes.slice(0, this.genes.length - numToReplace);

        // PREPARE INCUBATION CONFIG
        // Create a "Hyper-Active" config for the warm-up phase to force topological untangling
        const incubationConfig: SpringConfig = {
          ...this.config,
          // Force topological tools ON with aggressive parameters
          useSwapMutation: true,
          swapMutationRate: 0.5,           // Very high swap rate to untangle crossed rooms
          usePartnerBias: true,
          partnerBiasRate: 0.8,            // Very high attraction to connected neighbors
        };

        // Generate fresh genes and run INCUBATION PHASE
        for (let i = 0; i < numToReplace; i++) {
          // 1. INITIAL POSITION RESET: Use original room positions from initialization
          // This ensures fresh blood gets the same starting point as initializePopulation
          const freshGene = new Gene(this.baseRooms);

          // Reset dimensions to initial target values (removes any "squished" bias)
          // and reset accumulated pressure history to prevent momentum carryover
          for (const room of freshGene.rooms) {
            room.width = Math.sqrt(room.targetArea * room.targetRatio);
            room.height = room.targetArea / room.width;
            room.accumulatedPressureX = 0;
            room.accumulatedPressureY = 0;
          }

          // 2. INCUBATION PHASE: The "Mini-Evolution" / "Boot Camp"
          // Run a private, accelerated evolution loop to untangle topology before
          // this gene joins the main population. This prevents "survival of the luckiest"
          // by allowing the fresh gene to organize itself first.
          const warmUpSteps = this.config.freshBloodWarmUp || 100;

          for (let j = 0; j < warmUpSteps; j++) {
            // Step A: AGGRESSIVE MUTATION (The "Pull")
            // Force topological untangling through swaps, partner attraction, and centering
            freshGene.mutate(
              0.9,                                    // 90% chance to mutate (very high activity)
              this.config.mutationStrength * 3.0,    // Violent movement allowed for rapid organization
              1.0,                                    // 100% aspect ratio adaptation for shape flexibility
              this.globalTargetRatio,
              incubationConfig,                       // Use hyper-active config
              this.adjacencies
            );

            // Step B: PHYSICS RESOLUTION (The "Push")
            // Resolve overlaps and boundary violations created by aggressive mutation
            freshGene.applySquishCollisions(this.boundary, incubationConfig, this.globalTargetRatio);
          }

          // 3. GRADUATION
          // The gene is now "incubated" and ready to join the main population
          // Final collision pass to ensure valid state
          freshGene.applySquishCollisions(this.boundary, this.config, this.globalTargetRatio);

          // CRITICAL: Calculate fitness so the gene can compete fairly
          // Without this, fresh genes inherit the best fitness from templateGene.clone()
          // which breaks selection pressure (random genes masquerading as elite)
          freshGene.calculateFitness(
            this.boundary,
            this.adjacencies,
            this.config.fitnessBalance,
            this.config
          );

          this.genes.push(freshGene);
        }
        console.log(`[Fresh Blood] Gen ${this.currentGeneration}: Injected ${numToReplace} fresh genes into main pool (replaced worst performers)`);
      }
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
