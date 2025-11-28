// Grid Cell States
export const CELL_EMPTY = 0;
export const CELL_CORRIDOR = -1;
export const CELL_OUT_OF_BOUNDS = -2; // Used instead of -Infinity for Int32 compatibility

// Defaults
export const DEFAULT_GRID_RESOLUTION = 1.0; // Meters per cell
export const DEFAULT_MAX_ITERATIONS = 500;
export const DEFAULT_MUTATION_RATE = 0.3;
