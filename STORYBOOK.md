# Storybook

Run: `npm run storybook`

## Stories

**Solvers/Discrete Solver** - Grid-based evolutionary solver with corridor connectivity
**Solvers/Spring Solver** - Physics-based continuous solver

## Controls

- **Template**: 6 room configs (small-apartment, office-suite, house, gallery, clinic, restaurant)
- **Show Adjacencies**: Red dashed lines (thickness = weight)
- **Show Start Point**: Red circle (Discrete only)
- **Show Velocity**: Blue arrows (Spring only)

## Visual Legend

**Discrete**: Gray = corridors, Colors = rooms, Black = out of bounds, Red circle = entrance
**Spring**: Red outline = overlap, Blue arrows = velocity
