# magnetizing-fpg-ts

High-performance headless TypeScript library for procedural floor plan generation using a hybrid Discrete-Continuous Evolutionary Strategy.

## Project Status

🚧 **In Development** - See [TODO.md](TODO.md) for current progress

## Quick Start

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run tests
npm test

# Development mode (watch)
npm run dev
```

## Documentation

- [SPEC.md](SPEC.md) - Complete technical specification
- [TODO.md](TODO.md) - Implementation roadmap

## Architecture

```
src/
├── index.ts          # Public API
├── types.ts          # Type definitions
├── constants.ts      # Configuration constants
├── core/
│   ├── geometry/     # Vector math & polygon utilities
│   ├── grid/         # Grid buffer (Int32Array)
│   └── solvers/      # Discrete & Spring solvers
└── utils/            # PRNG & helpers
```

## License

MIT
