# magnetizing-fpg-ts - Implementation Roadmap

## Phase 1: Foundation ✓
- [x] Project structure & docs
- [x] TypeScript config
- [x] Package.json setup
- [x] Constants & Types
- [x] Vector2 + tests
- [x] GridBuffer + tests

## Phase 2: Discrete Solver
- [ ] Random utility (PCG/Mulberry32)
- [ ] Room placement logic
- [ ] Mutation & scoring
- [ ] Evolutionary loop
- [ ] Unit tests

## Phase 3: Spring Solver
- [ ] Polygon utilities (Clipper adapter)
- [ ] Force calculations (adjacency, repulsion, boundary, aspect)
- [ ] Integration loop (Symplectic Euler)
- [ ] Velocity clamping
- [ ] Unit tests

## Phase 4: Visualization
- [ ] Vite + Storybook setup
- [ ] Discrete grid renderer (Canvas 2D)
- [ ] Continuous polygon renderer
- [ ] Leva controls
- [ ] Interactive demos

## Phase 5: Polish
- [ ] Public API export
- [ ] Documentation
- [ ] Performance profiling
- [ ] Example usage

---
**Status Legend:** ⏳ In Progress | ✓ Complete | ○ Pending
**Last Updated:** 2025-11-28
