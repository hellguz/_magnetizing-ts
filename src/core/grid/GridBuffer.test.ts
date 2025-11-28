import { describe, it, expect } from 'vitest';
import { GridBuffer, Point } from './GridBuffer.js';
import { CELL_EMPTY, CELL_OUT_OF_BOUNDS, CELL_CORRIDOR } from '../../constants.js';

describe('GridBuffer', () => {
  describe('constructor', () => {
    it('should create grid with correct dimensions', () => {
      const grid = new GridBuffer(10, 20);

      expect(grid.width).toBe(10);
      expect(grid.height).toBe(20);
      expect(grid.cells.length).toBe(200);
    });

    it('should initialize all cells to CELL_EMPTY', () => {
      const grid = new GridBuffer(5, 5);

      for (let i = 0; i < grid.cells.length; i++) {
        expect(grid.cells[i]).toBe(CELL_EMPTY);
      }
    });
  });

  describe('index', () => {
    it('should convert 2D coordinates to 1D index', () => {
      const grid = new GridBuffer(10, 10);

      expect(grid.index(0, 0)).toBe(0);
      expect(grid.index(5, 0)).toBe(5);
      expect(grid.index(0, 1)).toBe(10);
      expect(grid.index(5, 3)).toBe(35); // 3 * 10 + 5
    });
  });

  describe('get and set', () => {
    it('should get and set cell values', () => {
      const grid = new GridBuffer(10, 10);

      grid.set(5, 5, 42);
      expect(grid.get(5, 5)).toBe(42);

      grid.set(0, 0, CELL_CORRIDOR);
      expect(grid.get(0, 0)).toBe(CELL_CORRIDOR);
    });

    it('should return CELL_OUT_OF_BOUNDS for out-of-range get', () => {
      const grid = new GridBuffer(10, 10);

      expect(grid.get(-1, 5)).toBe(CELL_OUT_OF_BOUNDS);
      expect(grid.get(5, -1)).toBe(CELL_OUT_OF_BOUNDS);
      expect(grid.get(10, 5)).toBe(CELL_OUT_OF_BOUNDS);
      expect(grid.get(5, 10)).toBe(CELL_OUT_OF_BOUNDS);
    });

    it('should ignore out-of-range set operations', () => {
      const grid = new GridBuffer(10, 10);

      // Should not throw
      grid.set(-1, 5, 99);
      grid.set(5, -1, 99);
      grid.set(10, 5, 99);
      grid.set(5, 10, 99);

      // Verify nothing changed
      expect(grid.cells.every(c => c === CELL_EMPTY)).toBe(true);
    });
  });

  describe('rasterizePolygon', () => {
    it('should mark cells outside rectangle as CELL_OUT_OF_BOUNDS', () => {
      const grid = new GridBuffer(10, 10);

      // Rectangle from (2,2) to (7,7)
      const polygon: Point[] = [
        { x: 2, y: 2 },
        { x: 7, y: 2 },
        { x: 7, y: 7 },
        { x: 2, y: 7 },
      ];

      grid.rasterizePolygon(polygon);

      // Inside rectangle should be CELL_EMPTY
      expect(grid.get(3, 3)).toBe(CELL_EMPTY);
      expect(grid.get(5, 5)).toBe(CELL_EMPTY);

      // Outside rectangle should be CELL_OUT_OF_BOUNDS
      expect(grid.get(0, 0)).toBe(CELL_OUT_OF_BOUNDS);
      expect(grid.get(9, 9)).toBe(CELL_OUT_OF_BOUNDS);
      expect(grid.get(1, 5)).toBe(CELL_OUT_OF_BOUNDS);
      expect(grid.get(8, 5)).toBe(CELL_OUT_OF_BOUNDS);
    });

    it('should handle triangle polygon', () => {
      const grid = new GridBuffer(10, 10);

      const triangle: Point[] = [
        { x: 5, y: 1 },
        { x: 9, y: 9 },
        { x: 1, y: 9 },
      ];

      grid.rasterizePolygon(triangle);

      // Center should be inside
      expect(grid.get(5, 6)).toBe(CELL_EMPTY);

      // Top corners should be outside
      expect(grid.get(0, 0)).toBe(CELL_OUT_OF_BOUNDS);
      expect(grid.get(9, 0)).toBe(CELL_OUT_OF_BOUNDS);
    });

    it('should handle polygon at grid boundary', () => {
      const grid = new GridBuffer(10, 10);

      const polygon: Point[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ];

      grid.rasterizePolygon(polygon);

      // All cells should be inside (CELL_EMPTY)
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          expect(grid.get(x, y)).toBe(CELL_EMPTY);
        }
      }
    });

    it('should ignore invalid polygon with less than 3 points', () => {
      const grid = new GridBuffer(5, 5);

      const invalid: Point[] = [
        { x: 1, y: 1 },
        { x: 3, y: 3 },
      ];

      grid.rasterizePolygon(invalid);

      // All cells should remain CELL_EMPTY
      expect(grid.cells.every(c => c === CELL_EMPTY)).toBe(true);
    });

    it('should handle concave polygon', () => {
      const grid = new GridBuffer(10, 10);

      // L-shaped polygon
      const lShape: Point[] = [
        { x: 1, y: 1 },
        { x: 5, y: 1 },
        { x: 5, y: 5 },
        { x: 3, y: 5 },
        { x: 3, y: 8 },
        { x: 1, y: 8 },
      ];

      grid.rasterizePolygon(lShape);

      // Point in horizontal part
      expect(grid.get(2, 2)).toBe(CELL_EMPTY);

      // Point in vertical part
      expect(grid.get(2, 6)).toBe(CELL_EMPTY);

      // Point in concave region (should be outside)
      expect(grid.get(4, 6)).toBe(CELL_OUT_OF_BOUNDS);
    });
  });

  describe('clone', () => {
    it('should create deep copy of grid', () => {
      const original = new GridBuffer(5, 5);
      original.set(2, 2, 42);
      original.set(3, 3, CELL_CORRIDOR);

      const copy = original.clone();

      expect(copy.width).toBe(original.width);
      expect(copy.height).toBe(original.height);
      expect(copy.get(2, 2)).toBe(42);
      expect(copy.get(3, 3)).toBe(CELL_CORRIDOR);

      // Verify it's a deep copy
      copy.set(2, 2, 99);
      expect(original.get(2, 2)).toBe(42);
      expect(copy.get(2, 2)).toBe(99);
    });
  });

  describe('clear', () => {
    it('should reset all cells to CELL_EMPTY', () => {
      const grid = new GridBuffer(5, 5);

      grid.set(1, 1, 10);
      grid.set(2, 2, CELL_CORRIDOR);
      grid.set(3, 3, CELL_OUT_OF_BOUNDS);

      grid.clear();

      for (let i = 0; i < grid.cells.length; i++) {
        expect(grid.cells[i]).toBe(CELL_EMPTY);
      }
    });
  });
});
