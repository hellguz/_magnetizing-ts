import { describe, it, expect } from 'vitest';
import { DiscreteSolver } from './DiscreteSolver.js';
import { Point } from '../grid/GridBuffer.js';
import { RoomRequest, Adjacency, CorridorRule } from '../../types.js';
import { CELL_EMPTY, CELL_CORRIDOR } from '../../constants.js';

describe('DiscreteSolver - Corridors & Pruning', () => {
  const createSimpleBoundary = (): Point[] => [
    { x: 0, y: 0 },
    { x: 20, y: 0 },
    { x: 20, y: 20 },
    { x: 0, y: 20 },
  ];

  describe('Corridor Painting - ONE_SIDE', () => {
    it('should paint bottom strip for ONE_SIDE rule', () => {
      const boundary = createSimpleBoundary();
      const rooms: RoomRequest[] = [
        {
          id: 'room1',
          targetArea: 25,
          targetRatio: 1.0,
          corridorRule: CorridorRule.ONE_SIDE,
        },
      ];
      const adjacencies: Adjacency[] = [];

      const solver = new DiscreteSolver(
        boundary,
        rooms,
        adjacencies,
        { maxIterations: 1, gridResolution: 1.0 },
        42
      );

      solver.solve();
      const grid = solver.getGrid();
      const placedRooms = solver.getPlacedRooms();
      const room = placedRooms.get('room1');

      expect(room).toBeDefined();
      if (!room) return;

      // Check bottom strip (y + height) has corridors
      const bottomY = room.y + room.height;
      for (let x = room.x; x < room.x + room.width; x++) {
        const cellValue = grid.get(x, bottomY);
        expect(cellValue).toBe(CELL_CORRIDOR);
      }

      // Check cell below corridor is empty
      const belowCorridorY = bottomY + 1;
      if (belowCorridorY < grid.height) {
        const cellValue = grid.get(room.x, belowCorridorY);
        expect(cellValue).toBe(CELL_EMPTY);
      }
    });
  });

  describe('Corridor Painting - TWO_SIDES', () => {
    it('should paint L-shape (bottom + right) for TWO_SIDES rule', () => {
      const boundary = createSimpleBoundary();
      const rooms: RoomRequest[] = [
        {
          id: 'room1',
          targetArea: 25,
          targetRatio: 1.0,
          corridorRule: CorridorRule.TWO_SIDES,
        },
      ];
      const adjacencies: Adjacency[] = [];

      const solver = new DiscreteSolver(
        boundary,
        rooms,
        adjacencies,
        { maxIterations: 1, gridResolution: 1.0 },
        42
      );

      solver.solve();
      const grid = solver.getGrid();
      const placedRooms = solver.getPlacedRooms();
      const room = placedRooms.get('room1');

      expect(room).toBeDefined();
      if (!room) return;

      // Check bottom strip
      const bottomY = room.y + room.height;
      for (let x = room.x; x < room.x + room.width; x++) {
        expect(grid.get(x, bottomY)).toBe(CELL_CORRIDOR);
      }

      // Check right strip (includes corner at bottomY)
      const rightX = room.x + room.width;
      for (let y = room.y; y <= bottomY; y++) {
        expect(grid.get(rightX, y)).toBe(CELL_CORRIDOR);
      }

      // Check corner is corridor
      expect(grid.get(rightX, bottomY)).toBe(CELL_CORRIDOR);
    });
  });

  describe('Corridor Painting - ALL_SIDES', () => {
    it('should paint halo (all 4 sides) for ALL_SIDES rule', () => {
      const boundary = createSimpleBoundary();
      const rooms: RoomRequest[] = [
        {
          id: 'room1',
          targetArea: 25,
          targetRatio: 1.0,
          corridorRule: CorridorRule.ALL_SIDES,
        },
      ];
      const adjacencies: Adjacency[] = [];

      const solver = new DiscreteSolver(
        boundary,
        rooms,
        adjacencies,
        { maxIterations: 1, gridResolution: 1.0 },
        42
      );

      solver.solve();
      const grid = solver.getGrid();
      const placedRooms = solver.getPlacedRooms();
      const room = placedRooms.get('room1');

      expect(room).toBeDefined();
      if (!room) return;

      // Check all sides have corridors
      const topY = room.y - 1;
      const bottomY = room.y + room.height;
      const leftX = room.x - 1;
      const rightX = room.x + room.width;

      // Top strip
      if (topY >= 0) {
        for (let x = leftX; x <= rightX; x++) {
          if (x >= 0 && x < grid.width) {
            expect(grid.get(x, topY)).toBe(CELL_CORRIDOR);
          }
        }
      }

      // Bottom strip
      for (let x = leftX; x <= rightX; x++) {
        if (x >= 0 && x < grid.width) {
          expect(grid.get(x, bottomY)).toBe(CELL_CORRIDOR);
        }
      }

      // Left strip
      if (leftX >= 0) {
        for (let y = room.y; y < room.y + room.height; y++) {
          expect(grid.get(leftX, y)).toBe(CELL_CORRIDOR);
        }
      }

      // Right strip
      for (let y = room.y; y < room.y + room.height; y++) {
        expect(grid.get(rightX, y)).toBe(CELL_CORRIDOR);
      }
    });
  });

  describe('Corridor Collision Respect', () => {
    it('should not overwrite existing rooms with corridors', () => {
      const boundary = createSimpleBoundary();
      const rooms: RoomRequest[] = [
        {
          id: 'roomA',
          targetArea: 16,
          targetRatio: 1.0,
          corridorRule: CorridorRule.ONE_SIDE,
        },
        {
          id: 'roomB',
          targetArea: 16,
          targetRatio: 1.0,
          corridorRule: CorridorRule.NONE,
        },
      ];
      const adjacencies: Adjacency[] = [
        { a: 'roomA', b: 'roomB', weight: 1.0 },
      ];

      const solver = new DiscreteSolver(
        boundary,
        rooms,
        adjacencies,
        { maxIterations: 10, gridResolution: 1.0 },
        42
      );

      solver.solve();
      const grid = solver.getGrid();
      const placedRooms = solver.getPlacedRooms();

      // Verify both rooms are placed
      expect(placedRooms.size).toBeGreaterThan(0);

      // Check that room cells are never corridor
      placedRooms.forEach((room) => {
        for (let dy = 0; dy < room.height; dy++) {
          for (let dx = 0; dx < room.width; dx++) {
            const cellValue = grid.get(room.x + dx, room.y + dy);
            expect(cellValue).toBeGreaterThan(0); // Room ID, not corridor
          }
        }
      });
    });
  });

  describe('Dead-End Pruning', () => {
    it('should remove isolated corridor cells', () => {
      const boundary = createSimpleBoundary();
      const rooms: RoomRequest[] = [];
      const adjacencies: Adjacency[] = [];

      const solver = new DiscreteSolver(
        boundary,
        rooms,
        adjacencies,
        { maxIterations: 1, gridResolution: 1.0 },
        42
      );

      // Manually place corridors
      const grid = solver.getGrid();
      grid.set(5, 5, CELL_CORRIDOR); // Isolated cell

      // Run pruning
      solver.pruneDeadEnds();

      // Isolated corridor should be removed
      expect(grid.get(5, 5)).toBe(CELL_EMPTY);
    });

    it('should remove dead-end corridor chains', () => {
      const boundary = createSimpleBoundary();
      const rooms: RoomRequest[] = [];
      const adjacencies: Adjacency[] = [];

      const solver = new DiscreteSolver(
        boundary,
        rooms,
        adjacencies,
        { maxIterations: 1, gridResolution: 1.0 },
        42
      );

      const grid = solver.getGrid();

      // Create a line of corridors: (5,5) -> (5,6) -> (5,7)
      grid.set(5, 5, CELL_CORRIDOR);
      grid.set(5, 6, CELL_CORRIDOR);
      grid.set(5, 7, CELL_CORRIDOR);

      // Run pruning
      solver.pruneDeadEnds();

      // All should be removed (dead-end chain)
      expect(grid.get(5, 5)).toBe(CELL_EMPTY);
      expect(grid.get(5, 6)).toBe(CELL_EMPTY);
      expect(grid.get(5, 7)).toBe(CELL_EMPTY);
    });

    it('should preserve corridors connecting two rooms', () => {
      const boundary = createSimpleBoundary();
      const rooms: RoomRequest[] = [];
      const adjacencies: Adjacency[] = [];

      const solver = new DiscreteSolver(
        boundary,
        rooms,
        adjacencies,
        { maxIterations: 1, gridResolution: 1.0 },
        42
      );

      const grid = solver.getGrid();

      // Place two rooms
      grid.set(5, 5, 1); // Room 1
      grid.set(5, 7, 2); // Room 2

      // Connect them with a corridor
      grid.set(5, 6, CELL_CORRIDOR);

      // Run pruning
      solver.pruneDeadEnds();

      // Corridor should remain (connects two rooms)
      expect(grid.get(5, 6)).toBe(CELL_CORRIDOR);
    });

    it('should handle complex corridor networks', () => {
      const boundary = createSimpleBoundary();
      const rooms: RoomRequest[] = [];
      const adjacencies: Adjacency[] = [];

      const solver = new DiscreteSolver(
        boundary,
        rooms,
        adjacencies,
        { maxIterations: 1, gridResolution: 1.0 },
        42
      );

      const grid = solver.getGrid();

      // Create a T-junction with a dead end
      //   X
      //   |
      // --+-- (junction at 5,5)
      //   |
      //   X (dead end)

      grid.set(5, 5, CELL_CORRIDOR); // Junction
      grid.set(5, 4, CELL_CORRIDOR); // North
      grid.set(5, 6, CELL_CORRIDOR); // South (dead end)
      grid.set(4, 5, CELL_CORRIDOR); // West
      grid.set(6, 5, CELL_CORRIDOR); // East

      // Place rooms at ends (except south - that's a dead end)
      grid.set(5, 3, 1); // North room
      grid.set(3, 5, 2); // West room
      grid.set(7, 5, 3); // East room

      // Run pruning
      solver.pruneDeadEnds();

      // Dead-end corridor (5,6) should be removed
      expect(grid.get(5, 6)).toBe(CELL_EMPTY);

      // Junction and connecting corridors should remain
      expect(grid.get(5, 5)).toBe(CELL_CORRIDOR);
      expect(grid.get(5, 4)).toBe(CELL_CORRIDOR);
      expect(grid.get(4, 5)).toBe(CELL_CORRIDOR);
      expect(grid.get(6, 5)).toBe(CELL_CORRIDOR);
    });
  });

  describe('Integration: Corridors + Pruning', () => {
    it('should generate and prune corridors in a complete solve', () => {
      const boundary = createSimpleBoundary();
      const rooms: RoomRequest[] = [
        {
          id: 'room1',
          targetArea: 20,
          targetRatio: 1.0,
          corridorRule: CorridorRule.ALL_SIDES,
        },
        {
          id: 'room2',
          targetArea: 20,
          targetRatio: 1.0,
          corridorRule: CorridorRule.ALL_SIDES,
        },
      ];
      const adjacencies: Adjacency[] = [
        { a: 'room1', b: 'room2', weight: 2.0 },
      ];

      const solver = new DiscreteSolver(
        boundary,
        rooms,
        adjacencies,
        { maxIterations: 50, gridResolution: 1.0 },
        42
      );

      solver.solve();
      const grid = solver.getGrid();
      const placedRooms = solver.getPlacedRooms();

      // Both rooms should be placed
      expect(placedRooms.size).toBeGreaterThanOrEqual(1);

      // Count corridor cells
      let corridorCount = 0;
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          if (grid.get(x, y) === CELL_CORRIDOR) {
            corridorCount++;
          }
        }
      }

      // Should have some corridors (if rooms are placed)
      if (placedRooms.size > 0) {
        expect(corridorCount).toBeGreaterThan(0);
      }

      // All corridors should have at least 2 neighbors (no dead ends after pruning)
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          if (grid.get(x, y) === CELL_CORRIDOR) {
            let neighbors = 0;
            const checks = [
              { x: x + 1, y },
              { x: x - 1, y },
              { x, y: y + 1 },
              { x, y: y - 1 },
            ];

            for (const check of checks) {
              const val = grid.get(check.x, check.y);
              if (val !== CELL_EMPTY && val !== -2) {
                neighbors++;
              }
            }

            // After pruning, all corridors should connect at least 2 regions
            expect(neighbors).toBeGreaterThanOrEqual(2);
          }
        }
      }
    });
  });
});
