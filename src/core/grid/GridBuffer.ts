import { CELL_EMPTY, CELL_OUT_OF_BOUNDS } from '../../constants.js';

export interface Point {
  x: number;
  y: number;
}

/**
 * Low-level grid buffer using Int32Array for efficient storage.
 * Cells store room IDs (positive integers), corridors (-1), or out-of-bounds (-2).
 */
export class GridBuffer {
  public readonly width: number;
  public readonly height: number;
  public readonly cells: Int32Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cells = new Int32Array(width * height);
    this.cells.fill(CELL_EMPTY);
  }

  /**
   * Convert 2D coordinates to 1D array index
   */
  index(x: number, y: number): number {
    return y * this.width + x;
  }

  /**
   * Get cell value at (x, y). Returns CELL_OUT_OF_BOUNDS if out of range.
   */
  get(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return CELL_OUT_OF_BOUNDS;
    }
    return this.cells[this.index(x, y)];
  }

  /**
   * Set cell value at (x, y). Ignores if out of range.
   */
  set(x: number, y: number, value: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    this.cells[this.index(x, y)] = value;
  }

  /**
   * Rasterize a polygon boundary. Cells outside the polygon are marked as CELL_OUT_OF_BOUNDS.
   * Uses ray casting algorithm for point-in-polygon test.
   */
  rasterizePolygon(polygon: Point[]): void {
    if (polygon.length < 3) {
      return; // Invalid polygon
    }

    // Calculate bounding box
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const p of polygon) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    // Clamp to grid bounds
    const startX = Math.max(0, Math.floor(minX));
    const endX = Math.min(this.width - 1, Math.ceil(maxX));
    const startY = Math.max(0, Math.floor(minY));
    const endY = Math.min(this.height - 1, Math.ceil(maxY));

    // Test each cell
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        // Optimize: skip cells outside bounding box
        if (x < startX || x > endX || y < startY || y > endY) {
          this.cells[this.index(x, y)] = CELL_OUT_OF_BOUNDS;
          continue;
        }

        // Point in polygon test (ray casting)
        const cellCenterX = x + 0.5;
        const cellCenterY = y + 0.5;

        if (!this.isPointInPolygon(cellCenterX, cellCenterY, polygon)) {
          this.cells[this.index(x, y)] = CELL_OUT_OF_BOUNDS;
        }
      }
    }
  }

  /**
   * Ray casting algorithm for point-in-polygon test.
   * Casts a ray from the point to the right and counts edge crossings.
   */
  private isPointInPolygon(x: number, y: number, polygon: Point[]): boolean {
    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Create a deep copy of the grid
   */
  clone(): GridBuffer {
    const copy = new GridBuffer(this.width, this.height);
    copy.cells.set(this.cells);
    return copy;
  }

  /**
   * Clear all cells to CELL_EMPTY
   */
  clear(): void {
    this.cells.fill(CELL_EMPTY);
  }
}
