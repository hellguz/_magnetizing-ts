# Technical Specification: magnetizing-fpg-ts (v2.0)

## 1. Executive Summary

**Artifact:** `magnetizing-fpg-ts`
**Description:** A production-grade, dual-stage procedural floor plan generator. It utilizes a **Discrete Evolutionary Solver** for topological graph validation and corridor network generation, followed by a **Continuous Evolutionary Solver** (formerly Spring Solver) for geometric refinement and aspect ratio optimization.
**Tech Stack:** TypeScript (Strict), Vite (Library Mode), Three.js / React-Three-Fiber (Visualization), ClipperLib (Polygon boolean operations).

**Core Design Principles:**
1.  **Strict Isolation:** Core algorithms (`core/`) must remain framework-agnostic. Visualization (`visualization/`) is purely reactive.
2.  **Deterministic Behavior:** All randomness is driven by a seedable PRNG (`Mulberry32`).
3.  **Data-Oriented Discrete Layer:** High-performance `Int32Array` buffers for grid operations.
4.  **Evolutionary, Not Iterative:** Both solvers use evolutionary strategies (population/mutation) rather than deterministic iteration.

---

## 2. Architecture & File Structure

````text
src/
├── index.ts                        # Public API Export
├── types.ts                        # Domain Interfaces (Room, Adjacency, Configs)
├── constants.ts                    # Magic Numbers & Defaults
├── core/
│   ├── geometry/
│   │   ├── Vector2.ts              # Static vector math (Zero-allocation focus)
│   │   └── Polygon.ts              # ClipperLib adapter & AABB utils
│   ├── grid/
│   │   └── GridBuffer.ts           # Int32Array wrapper & Rasterization logic
│   └── solvers/
│       ├── discrete/
│       │   ├── DiscreteSolver.ts   # Topological Optimization
│       │   └── CorridorLogic.ts    # Connectivity & Pruning logic (extracted)
│       └── continuous/
│           ├── SpringSolver.ts     # Main Interface (Evolutionary Strategy)
│           ├── Gene.ts             # Individual candidate solution
│           └── GeneCollection.ts   # Population management
├── visualization/
│   ├── SceneContainer.tsx          # Shared R3F Camera/Lighting/Controls
│   ├── BoundaryEditor.tsx          # Interactive Polygon Editor (@use-gesture)
│   ├── DiscreteGrid3D.tsx          # InstancedMesh Grid Renderer
│   ├── DiscreteGridOverlay.tsx     # Overlay lines/text
│   └── SpringSystem3D.tsx          # Continuous Mesh Renderer
└── utils/
    └── Random.ts                   # Seedable PRNG
````

-----

## 3\. Core Types & Data Models

### 3.1 Domain Entities (`src/types.ts`)

```typescript
// --- Configuration ---

export enum CorridorRule {
  NONE = 0,
  ONE_SIDE = 1,   // Bottom strip
  TWO_SIDES = 2,  // L-Shape (Bottom + Right)
  ALL_SIDES = 3,  // Halo
}

export interface RoomRequest {
  id: string;
  targetArea: number;
  targetRatio: number; // Maximum aspect ratio deviation
  corridorRule?: CorridorRule;
}

export interface Adjacency {
  a: string;
  b: string;
  weight: number;
}

// --- Solver Configs ---

export interface DiscreteConfig {
  gridResolution: number; // Meters per cell
  maxIterations: number;
  mutationRate: number;
  startPoint?: { x: number; y: number }; // Corridor network root
  weights: {
    compactness: number;
    adjacency: number;
    corridor: number;
  };
}

export interface SpringConfig {
  populationSize: number;
  maxGenerations: number;
  mutationRate: number;
  mutationStrength: number;
  crossoverRate: number;
  selectionPressure: number;     // % of population to cull
  fitnessBalance: number;        // 0.0 (Geometric) <-> 1.0 (Topological)
  aspectRatioMutationRate: number;
}

// --- State ---

export interface RoomState {
  id: string;
  x: number; y: number;
  width: number; height: number;
  // Velocity fields are kept for legacy compatibility but unused in ES
  vx: number; vy: number; 
  targetRatio: number;
}
```

-----

## 4\. Algorithm Specification

### 4.1 Common Geometry (`core/geometry/`)

**Vector2:**

  * Stateless class with static methods (`add`, `sub`, `mult`, `mag`, `normalize`).
  * **Constraint:** All methods must mutate an `out` parameter to prevent Garbage Collection pauses during physics loops.

**Polygon (ClipperLib Adapter):**

  * **AABB Check:** Fast rejection using Axis-Aligned Bounding Boxes.
  * **Intersection:** Returns area of intersection between two polygons.
  * **Containment:** Checks if Polygon A strictly contains Polygon B.
  * **PointInPolygon:** Ray casting algorithm.
  * **Squish Resolution:** Detects overlap direction (horizontal vs vertical) to guide mutation.

-----

### 4.2 Discrete Solver (Topological)

**Goal:** Place rooms on a coarse grid such that they fit, satisfy adjacencies, and form a valid corridor network connected to a specific `startPoint`.

**Grid State (`Int32Array`):**

  * `0`: Empty
  * `-1`: Corridor
  * `-2`: Out of Bounds
  * `>0`: Room Index

**Algorithm:**

1.  **Initialization:**

      * Rasterize Boundary Polygon into grid (`-2` for outside).
      * Mark `startPoint` as `-1`.
      * Sort rooms by Connectivity Degree (descending).

2.  **Evolutionary Loop:**

      * **Snapshot:** Clone current grid state.
      * **Destructive Mutation:** Remove $N$ random rooms ($N = \text{Total} \times \text{MutationRate}$).
      * **Re-Placement (Greedy):** For each unplaced room:
          * Generate random aspect ratio within `[1/target, target]`.
          * Scan all valid grid positions $(x, y)$.
          * **Validity Check:**
              * Room area must be empty.
              * **The "Magnetizing" Constraint:** The room's "Corridor Footprint" (defined by `CorridorRule`) must touch an existing `-1` cell or the `startPoint`.
          * **Scoring:**
              * $S = (Compactness \times W_c) - (AdjacencyDist \times W_a)$.
          * Place at position with Max $S$.
      * **Evaluation:**
          * Calculate Global Score. If `NewScore > BestScore`, keep. Else, revert to snapshot.

3.  **Post-Processing:**

      * **Pruning:** Iteratively remove corridor cells with $\le 1$ neighbor (dead ends) unless they connect two rooms.
      * **Validation:** Flood fill from `startPoint` to ensure single connected component.

-----

### 4.3 Continuous Solver (Evolutionary Strategy)

**Goal:** Refine geometric shapes and positions to satisfy exact areas, aspect ratios, and smooth boundaries, resolving overlaps and optimizing adjacency distances.

**Structure:**

  * **Gene:** A complete definition of all rooms (position `x,y` and dimension `w,h`).
  * **Population:** Array of `Gene` instances.

**Evolutionary Step (`step()`):**

1.  **Squish Collision Resolution (The "Physics"):**

      * Iterate all pairs of rooms in every Gene.
      * If `Overlap > 0`:
          * Determine dominant axis of overlap (X or Y).
          * **Attempt Squish:** Reduce dimensions along that axis. Check if `NewRatio` is within `[1/target, target]`.
          * If Squish fails (ratio violation), **Translate** rooms apart.
      * **Boundary Constrain:** If room is outside boundary, push centroid towards closest polygon edge.

2.  **Fitness Calculation:**

      * $F_{geo} = \sum (\text{Overlap Area}) + \sum (\text{Area Outside Boundary})$
      * $F_{topo} = \sum (\text{Distance between adjacent rooms})$
      * $Fitness = (F_{geo} \times Balance) + (F_{topo}^{-1} \times (1-Balance))$

3.  **Selection & Crossover:**

      * Sort Population by Fitness.
      * **Elitism:** Keep top 1 (Best Gene).
      * **Crossover:** Create offspring by mixing Room States from two parents (Uniform Crossover).

4.  **Mutation:**

      * **Positional:** Jitter `x,y` by `mutationStrength`.
      * **Dimensional (Aspect Ratio):** With probability `aspectRatioMutationRate`, pick new random ratio within bounds, recalculate `w,h` preserving `targetArea`.

-----

## 5\. Visualization & UI Specification

### 5.1 Interactive Boundary Editor

**Component:** `BoundaryEditor.tsx`
**Libraries:** `@use-gesture/react`, `@react-three/drei`.
**Features:**

  * **Vertex Handles:** Large black dots. Drag to move vertex.
  * **Edge Splitters:** Small gray dots at edge midpoints. Drag to promote to Vertex (inserts new point).
  * **State:** Controlled component. Accepts `points[]` and emits `onChange(points[])`.
  * **UX:** Cursor changes (`grab`, `grabbing`, `copy`). Prevents camera pan/zoom during interaction.

### 5.2 Discrete Visualization

**Component:** `DiscreteGrid3D.tsx`
**Technology:** `InstancedMesh`.
**Logic:**

  * Flatten grid to 1D array.
  * Render $W \times H$ instances of a Plane geometry.
  * Color mapping: White (Empty), Grey (Corridor), Colors (Rooms).
  * **Optimization:** Update `instanceColor` buffer only on grid change. Do not re-mount mesh.

### 5.3 Continuous Visualization

**Component:** `SpringSystem3D.tsx`
**Logic:**

  * Render rooms as `mesh` (BoxGeometry) with semi-transparent colors.
  * Render `Edges` (drei) for crisp borders.
  * Render Adjacency lines as dashed lines between centroids.
  * Updates on every animation frame via `requestAnimationFrame`.

### 5.4 Storybook Controls

All stories must wrap visualization in `SceneContainer` (Orthographic Camera, MapControls).

**Global Controls:**

  * `Template`: Dropdown (House, Palace, Hotel, etc.).
  * `Edit Boundary`: Boolean toggle (enables `BoundaryEditor`).

**Discrete Controls:**

  * `Grid Resolution`: 0.5 to 2.0.
  * `Mutation Rate`: 0.1 to 0.9.
  * `Boundary Scale`: 0.1 to 1.0.

**Spring Controls:**

  * `Global Target Ratio`: Slider 1.0 to 5.0 (Overrides individual room ratios).
  * `Auto Play`: Boolean.
  * `Solver Params`: Population Size, Mutation Strength, etc.

-----

## 6\. Implementation Roadmap

### Phase 1: Core Geometry & Utils

1.  Implement `Vector2` (static).
2.  Implement `Random` (Mulberry32).
3.  Implement `Polygon` (ClipperLib wrapper) with AABB and Area utilities.
4.  **Test:** Unit tests for intersection area and point-in-polygon.

### Phase 2: Discrete Solver

1.  Implement `GridBuffer` (Int32Array).
2.  Implement `CorridorLogic` (Footprint calculation, Connectivity checks).
3.  Implement `DiscreteSolver` class with `step()` and `solve()` methods.
4.  **Test:** Verify "magnetizing" behavior (rooms must touch corridors).

### Phase 3: Continuous Solver

1.  Implement `Gene` class (Collision "Squish" logic, Fitness calc).
2.  Implement `GeneCollection` (Crossover, Selection).
3.  Implement `SpringSolver` interface (Facade for GeneCollection).
4.  **Test:** Verify aspect ratio constraints are respected during squishing.

### Phase 4: Visualization

1.  Setup `BoundaryEditor` with strict event bubbling control.
2.  Implement `DiscreteGrid3D` using `InstancedMesh`.
3.  Implement `SpringSystem3D`.
4.  Integrate into Storybook.

-----

## 7\. Default Constants & Configurations

**`src/constants.ts`**

```typescript
export const CELL_EMPTY = 0;
export const CELL_CORRIDOR = -1;
export const CELL_OUT_OF_BOUNDS = -2;

export const DEFAULT_DISCRETE_CONFIG: DiscreteConfig = {
  gridResolution: 1.0,
  maxIterations: 100,
  mutationRate: 0.3,
  weights: { compactness: 2.0, adjacency: 3.0, corridor: 0.5 }
};

export const DEFAULT_SPRING_CONFIG: SpringConfig = {
  populationSize: 15,
  maxGenerations: 100,
  mutationRate: 0.3,
  mutationStrength: 10.0,
  crossoverRate: 0.5,
  selectionPressure: 0.3,
  fitnessBalance: 0.5,
  aspectRatioMutationRate: 0.3
};
```

**Colors:**
Use a standardized palette (e.g., Palace rooms = Gold/Purple, Service = Blue/Gray) mapped by Room ID prefixes or explicit definitions in the Template object.
