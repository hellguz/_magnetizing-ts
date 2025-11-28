import { GridBuffer, Point } from '../grid/GridBuffer.js';
import { Random } from '../../utils/Random.js';
import { DiscreteConfig, RoomRequest, Adjacency } from '../../types.js';
import { CELL_EMPTY, CELL_CORRIDOR, CELL_OUT_OF_BOUNDS, DEFAULT_GRID_RESOLUTION, DEFAULT_MAX_ITERATIONS, DEFAULT_MUTATION_RATE } from '../../constants.js';

interface PlacedRoom {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  roomIndex: number;
  corridorRule?: number;
}

interface RoomFootprint {
  coreWidth: number;
  coreHeight: number;
  effectiveWidth: number;
  effectiveHeight: number;
  offsetX: number;
  offsetY: number;
  corridorCells: Point[];
}

interface PlacementCandidate {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
}

/**
 * Discrete solver for topological optimization using evolutionary strategy.
 * Places rooms on a grid using mutation and scoring.
 */
export class DiscreteSolver {
  private grid: GridBuffer;
  private rooms: RoomRequest[];
  private adjacencies: Adjacency[];
  private config: DiscreteConfig;
  private rng: Random;
  private roomIndexMap: Map<string, number>;
  private placedRooms: Map<string, PlacedRoom>;
  private bestGrid: GridBuffer | null = null;
  private bestScore: number = -Infinity;

  constructor(
    boundary: Point[],
    rooms: RoomRequest[],
    adjacencies: Adjacency[],
    config: Partial<DiscreteConfig> = {},
    seed: number = Date.now()
  ) {
    this.rooms = [...rooms];
    this.adjacencies = adjacencies;
    this.rng = new Random(seed);

    // Merge with defaults
    this.config = {
      gridResolution: config.gridResolution ?? DEFAULT_GRID_RESOLUTION,
      maxIterations: config.maxIterations ?? DEFAULT_MAX_ITERATIONS,
      mutationRate: config.mutationRate ?? DEFAULT_MUTATION_RATE,
      weights: {
        compactness: config.weights?.compactness ?? 2.0,
        adjacency: config.weights?.adjacency ?? 3.0,
        corridor: config.weights?.corridor ?? 0.5,
      },
    };

    // Calculate grid dimensions from boundary
    const { width, height } = this.calculateGridDimensions(boundary);
    this.grid = new GridBuffer(width, height);
    this.grid.rasterizePolygon(boundary);

    // Initialize start point (entrance) for corridor network
    if (this.config.startPoint) {
      this.grid.set(this.config.startPoint.x, this.config.startPoint.y, CELL_CORRIDOR);
    } else {
      // Default: place start point at center of grid if not specified
      const startX = Math.floor(width / 2);
      const startY = Math.floor(height / 2);
      this.grid.set(startX, startY, CELL_CORRIDOR);
    }

    // Create room index map (1-based indexing for grid cells)
    this.roomIndexMap = new Map();
    this.rooms.forEach((room, idx) => {
      this.roomIndexMap.set(room.id, idx + 1);
    });

    this.placedRooms = new Map();
  }

  /**
   * Calculate grid dimensions from boundary polygon
   */
  private calculateGridDimensions(boundary: Point[]): { width: number; height: number } {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const p of boundary) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    const width = Math.ceil((maxX - minX) / this.config.gridResolution);
    const height = Math.ceil((maxY - minY) / this.config.gridResolution);

    return { width, height };
  }

  /**
   * Calculate the effective footprint of a room including its corridor stamp.
   * Returns the core dimensions, effective dimensions, offsets, and corridor cell positions.
   */
  private getRoomFootprint(x: number, y: number, width: number, height: number, rule: number = 0): RoomFootprint {
    let effectiveWidth = width;
    let effectiveHeight = height;
    let offsetX = 0;
    let offsetY = 0;
    const corridorCells: Point[] = [];

    if (rule === 1) {
      // CorridorRule.ONE_SIDE: Bottom strip
      effectiveHeight = height + 1;
      const bottomY = y + height;
      for (let dx = 0; dx < width; dx++) {
        corridorCells.push({ x: x + dx, y: bottomY });
      }
    } else if (rule === 2) {
      // CorridorRule.TWO_SIDES: Bottom + Right (L-shape)
      effectiveWidth = width + 1;
      effectiveHeight = height + 1;
      // Bottom strip
      const bottomY = y + height;
      for (let dx = 0; dx <= width; dx++) {
        corridorCells.push({ x: x + dx, y: bottomY });
      }
      // Right strip (excluding corner already added)
      const rightX = x + width;
      for (let dy = 0; dy < height; dy++) {
        corridorCells.push({ x: rightX, y: y + dy });
      }
    } else if (rule >= 3) {
      // CorridorRule.ALL_SIDES: Halo around room
      effectiveWidth = width + 2;
      effectiveHeight = height + 2;
      offsetX = -1;
      offsetY = -1;

      // Top strip
      const topY = y - 1;
      for (let dx = -1; dx <= width; dx++) {
        corridorCells.push({ x: x + dx, y: topY });
      }
      // Bottom strip
      const bottomY = y + height;
      for (let dx = -1; dx <= width; dx++) {
        corridorCells.push({ x: x + dx, y: bottomY });
      }
      // Left strip (excluding corners)
      const leftX = x - 1;
      for (let dy = 0; dy < height; dy++) {
        corridorCells.push({ x: leftX, y: y + dy });
      }
      // Right strip (excluding corners)
      const rightX = x + width;
      for (let dy = 0; dy < height; dy++) {
        corridorCells.push({ x: rightX, y: y + dy });
      }
    }

    return {
      coreWidth: width,
      coreHeight: height,
      effectiveWidth,
      effectiveHeight,
      offsetX,
      offsetY,
      corridorCells,
    };
  }

  /**
   * Check if any corridor cell from the footprint touches an existing corridor network.
   * This is the "magnetizing" constraint that ensures a connected corridor system.
   */
  private checkConnectivity(corridorCells: Point[]): boolean {
    // If no corridor cells (NONE rule), always connected
    if (corridorCells.length === 0) {
      return true;
    }

    // Check if any corridor cell neighbors an existing CELL_CORRIDOR
    for (const cell of corridorCells) {
      const neighbors = [
        { x: cell.x + 1, y: cell.y },
        { x: cell.x - 1, y: cell.y },
        { x: cell.x, y: cell.y + 1 },
        { x: cell.x, y: cell.y - 1 },
      ];

      for (const neighbor of neighbors) {
        const val = this.grid.get(neighbor.x, neighbor.y);
        if (val === CELL_CORRIDOR) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Sort rooms by connectivity degree (most connected first)
   */
  private sortRoomsByConnectivity(): RoomRequest[] {
    const connectivityMap = new Map<string, number>();

    // Count connections for each room
    this.rooms.forEach(room => connectivityMap.set(room.id, 0));
    this.adjacencies.forEach(adj => {
      connectivityMap.set(adj.a, (connectivityMap.get(adj.a) || 0) + 1);
      connectivityMap.set(adj.b, (connectivityMap.get(adj.b) || 0) + 1);
    });

    // Sort descending by connectivity
    return [...this.rooms].sort((a, b) => {
      return (connectivityMap.get(b.id) || 0) - (connectivityMap.get(a.id) || 0);
    });
  }

  /**
   * Check if a room with corridor footprint can be placed at position (x, y).
   * Checks both space availability AND corridor connectivity (the "magnetizing" constraint).
   */
  private canPlaceRoom(x: number, y: number, width: number, height: number, corridorRule: number = 0): boolean {
    // Get the complete footprint including corridors
    const footprint = this.getRoomFootprint(x, y, width, height, corridorRule);

    // Check if the core room area is empty
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const cellValue = this.grid.get(x + dx, y + dy);
        if (cellValue !== CELL_EMPTY) {
          return false;
        }
      }
    }

    // Check if corridor cells are empty (can overlap with existing corridors)
    for (const cell of footprint.corridorCells) {
      const cellValue = this.grid.get(cell.x, cell.y);
      // Corridor cells can only be placed on EMPTY or existing CORRIDOR
      if (cellValue !== CELL_EMPTY && cellValue !== CELL_CORRIDOR) {
        return false;
      }
    }

    // CRITICAL: Check corridor connectivity (the "magnetizing" constraint)
    // Rooms must connect to the existing corridor network
    if (!this.checkConnectivity(footprint.corridorCells)) {
      return false;
    }

    return true;
  }

  /**
   * Calculate compactness score (number of edges touching non-empty cells)
   */
  private calculateCompactness(x: number, y: number, width: number, height: number): number {
    let touchCount = 0;

    // Check perimeter cells
    for (let dx = 0; dx < width; dx++) {
      // Top edge
      const topCell = this.grid.get(x + dx, y - 1);
      if (topCell !== CELL_EMPTY && topCell !== CELL_OUT_OF_BOUNDS) touchCount++;

      // Bottom edge
      const bottomCell = this.grid.get(x + dx, y + height);
      if (bottomCell !== CELL_EMPTY && bottomCell !== CELL_OUT_OF_BOUNDS) touchCount++;
    }

    for (let dy = 0; dy < height; dy++) {
      // Left edge
      const leftCell = this.grid.get(x - 1, y + dy);
      if (leftCell !== CELL_EMPTY && leftCell !== CELL_OUT_OF_BOUNDS) touchCount++;

      // Right edge
      const rightCell = this.grid.get(x + width, y + dy);
      if (rightCell !== CELL_EMPTY && rightCell !== CELL_OUT_OF_BOUNDS) touchCount++;
    }

    return touchCount;
  }

  /**
   * Calculate adjacency score (distance to required neighbors)
   */
  private calculateAdjacencyScore(roomId: string, cx: number, cy: number): number {
    let totalDistance = 0;
    let count = 0;

    // Find all required adjacencies for this room
    const requiredNeighbors = this.adjacencies.filter(
      adj => adj.a === roomId || adj.b === roomId
    );

    for (const adj of requiredNeighbors) {
      const neighborId = adj.a === roomId ? adj.b : adj.a;
      const neighbor = this.placedRooms.get(neighborId);

      if (neighbor) {
        // Calculate distance from center to neighbor center
        const neighborCx = neighbor.x + neighbor.width / 2;
        const neighborCy = neighbor.y + neighbor.height / 2;
        const distance = Math.sqrt(
          Math.pow(cx - neighborCx, 2) + Math.pow(cy - neighborCy, 2)
        );
        totalDistance += distance * (adj.weight ?? 1.0);
        count++;
      }
    }

    return count > 0 ? totalDistance / count : 0;
  }

  /**
   * Place a room on the grid using the "stamp" strategy.
   * This stamps the room core AND its corridor footprint as a single atomic operation.
   */
  private placeRoom(room: RoomRequest, x: number, y: number, width: number, height: number): void {
    const roomIndex = this.roomIndexMap.get(room.id) || 0;
    const corridorRule = room.corridorRule || 0;

    // Place room core
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        this.grid.set(x + dx, y + dy, roomIndex);
      }
    }

    // Stamp corridors (atomic with room placement)
    const footprint = this.getRoomFootprint(x, y, width, height, corridorRule);
    for (const cell of footprint.corridorCells) {
      this.grid.set(cell.x, cell.y, CELL_CORRIDOR);
    }

    this.placedRooms.set(room.id, {
      id: room.id,
      x,
      y,
      width,
      height,
      roomIndex,
      corridorRule,
    });
  }

  /**
   * Remove a room from the grid, including its corridor footprint.
   */
  private removeRoom(roomId: string): void {
    const room = this.placedRooms.get(roomId);
    if (!room) return;

    // Clear room core
    for (let dy = 0; dy < room.height; dy++) {
      for (let dx = 0; dx < room.width; dx++) {
        this.grid.set(room.x + dx, room.y + dy, CELL_EMPTY);
      }
    }

    // Clear corridor footprint
    if (room.corridorRule) {
      const footprint = this.getRoomFootprint(room.x, room.y, room.width, room.height, room.corridorRule);
      for (const cell of footprint.corridorCells) {
        // Only clear if it's actually a corridor (could be shared by another room)
        if (this.grid.get(cell.x, cell.y) === CELL_CORRIDOR) {
          this.grid.set(cell.x, cell.y, CELL_EMPTY);
        }
      }
    }

    this.placedRooms.delete(roomId);
  }

  /**
   * Find best placement for a room
   */
  private findBestPlacement(room: RoomRequest): PlacementCandidate | null {
    // Calculate target dimensions
    const ratio = this.rng.nextFloat(room.minRatio, room.maxRatio);
    const width = Math.ceil(Math.sqrt(room.targetArea / ratio) / this.config.gridResolution);
    const height = Math.ceil((room.targetArea / (width * this.config.gridResolution)) / this.config.gridResolution);
    const corridorRule = room.corridorRule || 0;

    let bestCandidate: PlacementCandidate | null = null;
    let bestScore = -Infinity;

    // Scan all grid positions
    for (let y = 0; y < this.grid.height - height; y++) {
      for (let x = 0; x < this.grid.width - width; x++) {
        // Check if room can be placed (includes connectivity check)
        if (!this.canPlaceRoom(x, y, width, height, corridorRule)) {
          continue;
        }

        const cx = x + width / 2;
        const cy = y + height / 2;

        const compactness = this.calculateCompactness(x, y, width, height);
        const adjacencyDist = this.calculateAdjacencyScore(room.id, cx, cy);

        const score =
          compactness * this.config.weights.compactness -
          adjacencyDist * this.config.weights.adjacency;

        if (score > bestScore) {
          bestScore = score;
          bestCandidate = { x, y, width, height, score };
        }
      }
    }

    return bestCandidate;
  }

  /**
   * Calculate global score of current layout
   */
  private calculateGlobalScore(): number {
    let score = 0;

    // Score based on number of rooms placed
    score += this.placedRooms.size * 100;

    // Score based on satisfied adjacencies
    for (const adj of this.adjacencies) {
      const roomA = this.placedRooms.get(adj.a);
      const roomB = this.placedRooms.get(adj.b);

      if (roomA && roomB) {
        const dx = (roomA.x + roomA.width / 2) - (roomB.x + roomB.width / 2);
        const dy = (roomA.y + roomA.height / 2) - (roomB.y + roomB.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Closer is better
        score -= dist * (adj.weight ?? 1.0);
      }
    }

    return score;
  }

  /**
   * Count non-empty neighbors (not CELL_EMPTY and not CELL_OUT_OF_BOUNDS)
   */
  private countNonEmptyNeighbors(x: number, y: number): number {
    let count = 0;
    const neighbors = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    ];

    for (const neighbor of neighbors) {
      const val = this.grid.get(neighbor.x, neighbor.y);
      if (val !== CELL_EMPTY && val !== CELL_OUT_OF_BOUNDS) {
        count++;
      }
    }

    return count;
  }

  /**
   * Iteratively remove dead-end corridor cells.
   * A dead end is a corridor cell with <= 1 non-empty neighbor.
   */
  pruneDeadEnds(): void {
    let changed = true;

    while (changed) {
      changed = false;

      for (let y = 0; y < this.grid.height; y++) {
        for (let x = 0; x < this.grid.width; x++) {
          if (this.grid.get(x, y) === CELL_CORRIDOR) {
            const neighbors = this.countNonEmptyNeighbors(x, y);
            if (neighbors <= 1) {
              this.grid.set(x, y, CELL_EMPTY);
              changed = true;
            }
          }
        }
      }
    }
  }

  /**
   * Validate that all corridors form a single connected network using flood fill.
   * Returns true if the network is fully connected, false if there are isolated islands.
   */
  validateCorridorNetwork(): boolean {
    // Find the start point (should be a CELL_CORRIDOR)
    let startX = -1;
    let startY = -1;

    if (this.config.startPoint) {
      startX = this.config.startPoint.x;
      startY = this.config.startPoint.y;
    } else {
      // Default start point at center
      startX = Math.floor(this.grid.width / 2);
      startY = Math.floor(this.grid.height / 2);
    }

    // Verify start point is a corridor
    if (this.grid.get(startX, startY) !== CELL_CORRIDOR) {
      return false;
    }

    // Count total corridor cells
    let totalCorridors = 0;
    for (let y = 0; y < this.grid.height; y++) {
      for (let x = 0; x < this.grid.width; x++) {
        if (this.grid.get(x, y) === CELL_CORRIDOR) {
          totalCorridors++;
        }
      }
    }

    // Flood fill from start point
    const visited = new Set<number>();
    const queue: Point[] = [{ x: startX, y: startY }];
    let connectedCount = 0;

    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = current.y * this.grid.width + current.x;

      if (visited.has(key)) continue;
      visited.add(key);

      if (this.grid.get(current.x, current.y) === CELL_CORRIDOR) {
        connectedCount++;

        // Add neighbors to queue
        const neighbors = [
          { x: current.x + 1, y: current.y },
          { x: current.x - 1, y: current.y },
          { x: current.x, y: current.y + 1 },
          { x: current.x, y: current.y - 1 },
        ];

        for (const neighbor of neighbors) {
          const neighborKey = neighbor.y * this.grid.width + neighbor.x;
          if (!visited.has(neighborKey)) {
            queue.push(neighbor);
          }
        }
      }
    }

    // Check if all corridors are reachable
    return connectedCount === totalCorridors;
  }

  /**
   * Run the evolutionary algorithm
   */
  solve(): GridBuffer {
    // Initial placement (greedy)
    const sortedRooms = this.sortRoomsByConnectivity();
    for (const room of sortedRooms) {
      const candidate = this.findBestPlacement(room);
      if (candidate) {
        this.placeRoom(room, candidate.x, candidate.y, candidate.width, candidate.height);
      }
    }

    this.bestGrid = this.grid.clone();
    this.bestScore = this.calculateGlobalScore();

    // Evolutionary loop
    for (let iter = 0; iter < this.config.maxIterations; iter++) {
      // Create snapshot
      const snapshot = this.grid.clone();
      const snapshotRooms = new Map(this.placedRooms);

      // Mutation: remove K random rooms
      const placedRoomIds = Array.from(this.placedRooms.keys());
      const numToRemove = Math.ceil(placedRoomIds.length * this.config.mutationRate);
      const toRemove = this.rng.shuffle([...placedRoomIds]).slice(0, numToRemove);

      for (const roomId of toRemove) {
        this.removeRoom(roomId);
      }

      // Re-place removed rooms
      const unplacedRooms = this.rooms.filter(room => !this.placedRooms.has(room.id));
      for (const room of unplacedRooms) {
        const candidate = this.findBestPlacement(room);
        if (candidate) {
          this.placeRoom(room, candidate.x, candidate.y, candidate.width, candidate.height);
        }
      }

      // Evaluate
      const newScore = this.calculateGlobalScore();

      if (newScore > this.bestScore) {
        // Accept new state
        this.bestScore = newScore;
        this.bestGrid = this.grid.clone();
      } else {
        // Revert to snapshot
        this.grid = snapshot;
        this.placedRooms = snapshotRooms;
      }
    }

    // Final cleanup: remove dead-end corridors
    this.pruneDeadEnds();
    if (this.bestGrid) {
      // Also prune the best grid
      const tempGrid = this.grid;
      this.grid = this.bestGrid;
      this.pruneDeadEnds();
      this.bestGrid = this.grid;
      this.grid = tempGrid;
    }

    return this.bestGrid || this.grid;
  }

  /**
   * Get current grid state
   */
  getGrid(): GridBuffer {
    return this.grid;
  }

  /**
   * Get placed rooms
   */
  getPlacedRooms(): Map<string, PlacedRoom> {
    return new Map(this.placedRooms);
  }
}
