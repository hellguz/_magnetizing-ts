# magnetizing-fpg-ts

TypeScript library for procedural floor plan generation using hybrid Discrete-Continuous Evolutionary Strategy.

## Features

- **Discrete Solver**: Grid-based evolutionary placement with connected corridor network
- **Spring Solver**: Physics-based geometric refinement
- **Strict TypeScript**: Full type safety, Int32Array grids
- **Deterministic**: Seeded PRNG for reproducible results

## Quick Start

```bash
npm install
npm run build
npm test
npm run storybook  # Interactive visualizations
```

## Usage

```typescript
import { DiscreteSolver, CorridorRule } from 'magnetizing-fpg-ts';

const boundary = [
  { x: 0, y: 0 }, { x: 50, y: 0 },
  { x: 50, y: 40 }, { x: 0, y: 40 },
];

const rooms = [
  { id: 'living', targetArea: 200, minRatio: 1.0, maxRatio: 1.5, corridorRule: CorridorRule.TWO_SIDES },
  { id: 'kitchen', targetArea: 120, minRatio: 0.8, maxRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
];

const adjacencies = [
  { a: 'living', b: 'kitchen', weight: 2.0 }
];

const solver = new DiscreteSolver(boundary, rooms, adjacencies, {
  gridResolution: 1.0,
  maxIterations: 100,
  mutationRate: 0.3,
  startPoint: { x: 25, y: 20 }, // Entrance point
  weights: { compactness: 2.0, adjacency: 3.0, corridor: 0.5 }
});

const grid = solver.solve();
```

See [examples/](examples/) for complete workflows.

## Corridor System

Rooms stamp corridors during placement. Connectivity enforced via "magnetizing" constraint - rooms must attach to existing corridor network from start point. Single connected network guaranteed.

## Docs

- [STORYBOOK.md](STORYBOOK.md) - Visualizations
- [docs/SPEC.md](docs/SPEC.md) - Technical spec

## License

MIT
