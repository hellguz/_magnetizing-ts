import { describe, it, expect } from 'vitest';
import { DiscreteSolver } from './DiscreteSolver.js';
import { Point } from '../grid/GridBuffer.js';
import { RoomRequest, Adjacency } from '../../types.js';

describe('DiscreteSolver', () => {
  const createSimpleBoundary = (): Point[] => [
    { x: 0, y: 0 },
    { x: 20, y: 0 },
    { x: 20, y: 20 },
    { x: 0, y: 20 },
  ];

  const createSimpleRooms = (): RoomRequest[] => [
    {
      id: 'room1',
      targetArea: 25,
      targetRatio: 1.2,
    },
    {
      id: 'room2',
      targetArea: 30,
      targetRatio: 1.2,
    },
    {
      id: 'room3',
      targetArea: 20,
      targetRatio: 1.2,
    },
  ];

  const createSimpleAdjacencies = (): Adjacency[] => [
    { a: 'room1', b: 'room2', weight: 1.0 },
    { a: 'room2', b: 'room3', weight: 1.0 },
  ];

  describe('constructor', () => {
    it('should initialize with boundary and rooms', () => {
      const boundary = createSimpleBoundary();
      const rooms = createSimpleRooms();
      const adjacencies = createSimpleAdjacencies();

      const solver = new DiscreteSolver(boundary, rooms, adjacencies, {}, 12345);

      expect(solver).toBeDefined();
      expect(solver.getGrid()).toBeDefined();
      expect(solver.getPlacedRooms().size).toBe(0);
    });

    it('should use default config values', () => {
      const boundary = createSimpleBoundary();
      const rooms = createSimpleRooms();
      const adjacencies: Adjacency[] = [];

      const solver = new DiscreteSolver(boundary, rooms, adjacencies);

      expect(solver).toBeDefined();
    });

    it('should accept custom config', () => {
      const boundary = createSimpleBoundary();
      const rooms = createSimpleRooms();
      const adjacencies: Adjacency[] = [];

      const solver = new DiscreteSolver(boundary, rooms, adjacencies, {
        gridResolution: 0.5,
        maxIterations: 10,
        mutationRate: 0.1,
        weights: {
          compactness: 1.0,
          adjacency: 2.0,
          corridor: 0.3,
        },
      });

      expect(solver).toBeDefined();
    });
  });

  describe('solve', () => {
    it('should place at least some rooms', () => {
      const boundary = createSimpleBoundary();
      const rooms = createSimpleRooms();
      const adjacencies = createSimpleAdjacencies();

      const solver = new DiscreteSolver(
        boundary,
        rooms,
        adjacencies,
        { maxIterations: 50 },
        42
      );

      const result = solver.solve();

      expect(result).toBeDefined();
      expect(solver.getPlacedRooms().size).toBeGreaterThan(0);
    });

    it('should be deterministic with same seed', () => {
      const boundary = createSimpleBoundary();
      const rooms = createSimpleRooms();
      const adjacencies = createSimpleAdjacencies();

      const solver1 = new DiscreteSolver(
        boundary,
        rooms,
        adjacencies,
        { maxIterations: 20 },
        999
      );

      const solver2 = new DiscreteSolver(
        boundary,
        rooms,
        adjacencies,
        { maxIterations: 20 },
        999
      );

      const result1 = solver1.solve();
      const result2 = solver2.solve();

      expect(solver1.getPlacedRooms().size).toBe(solver2.getPlacedRooms().size);

      // Check that same rooms were placed
      const rooms1 = Array.from(solver1.getPlacedRooms().keys()).sort();
      const rooms2 = Array.from(solver2.getPlacedRooms().keys()).sort();
      expect(rooms1).toEqual(rooms2);
    });

    it('should handle single room', () => {
      const boundary = createSimpleBoundary();
      const rooms: RoomRequest[] = [
        {
          id: 'only-room',
          targetArea: 50,
          targetRatio: 1.0,
        },
      ];
      const adjacencies: Adjacency[] = [];

      const solver = new DiscreteSolver(
        boundary,
        rooms,
        adjacencies,
        { maxIterations: 10 },
        123
      );

      const result = solver.solve();

      expect(solver.getPlacedRooms().size).toBe(1);
      expect(solver.getPlacedRooms().has('only-room')).toBe(true);
    });

    it('should respect adjacency weights', () => {
      const boundary: Point[] = [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 30 },
        { x: 0, y: 30 },
      ];

      const rooms: RoomRequest[] = [
        { id: 'A', targetArea: 50, targetRatio: 1.0 },
        { id: 'B', targetArea: 50, targetRatio: 1.0 },
      ];

      const adjacencies: Adjacency[] = [
        { a: 'A', b: 'B', weight: 10.0 }, // Strong adjacency
      ];

      const solver = new DiscreteSolver(
        boundary,
        rooms,
        adjacencies,
        { maxIterations: 100, weights: { compactness: 1, adjacency: 5, corridor: 0 } },
        777
      );

      solver.solve();

      const placedRooms = solver.getPlacedRooms();
      if (placedRooms.size === 2) {
        const roomA = placedRooms.get('A')!;
        const roomB = placedRooms.get('B')!;

        const centerA = { x: roomA.x + roomA.width / 2, y: roomA.y + roomA.height / 2 };
        const centerB = { x: roomB.x + roomB.width / 2, y: roomB.y + roomB.height / 2 };

        const distance = Math.sqrt(
          Math.pow(centerA.x - centerB.x, 2) + Math.pow(centerA.y - centerB.y, 2)
        );

        // Rooms should be relatively close due to high adjacency weight
        expect(distance).toBeLessThan(20);
      }
    });

    it('should improve over iterations', () => {
      const boundary = createSimpleBoundary();
      const rooms = createSimpleRooms();
      const adjacencies = createSimpleAdjacencies();

      const solver1 = new DiscreteSolver(
        boundary,
        rooms,
        adjacencies,
        { maxIterations: 1 },
        555
      );

      const solver2 = new DiscreteSolver(
        boundary,
        rooms,
        adjacencies,
        { maxIterations: 100 },
        555
      );

      solver1.solve();
      solver2.solve();

      // More iterations should place at least as many rooms
      expect(solver2.getPlacedRooms().size).toBeGreaterThanOrEqual(
        solver1.getPlacedRooms().size
      );
    });
  });

  describe('getGrid', () => {
    it('should return grid buffer', () => {
      const boundary = createSimpleBoundary();
      const rooms = createSimpleRooms();
      const adjacencies: Adjacency[] = [];

      const solver = new DiscreteSolver(boundary, rooms, adjacencies);
      const grid = solver.getGrid();

      expect(grid).toBeDefined();
      expect(grid.width).toBeGreaterThan(0);
      expect(grid.height).toBeGreaterThan(0);
    });
  });

  describe('getPlacedRooms', () => {
    it('should return placed rooms map', () => {
      const boundary = createSimpleBoundary();
      const rooms = createSimpleRooms();
      const adjacencies = createSimpleAdjacencies();

      const solver = new DiscreteSolver(boundary, rooms, adjacencies, { maxIterations: 10 }, 111);
      solver.solve();

      const placedRooms = solver.getPlacedRooms();

      expect(placedRooms).toBeInstanceOf(Map);
      placedRooms.forEach((room, id) => {
        expect(room.id).toBe(id);
        expect(room.x).toBeGreaterThanOrEqual(0);
        expect(room.y).toBeGreaterThanOrEqual(0);
        expect(room.width).toBeGreaterThan(0);
        expect(room.height).toBeGreaterThan(0);
      });
    });
  });
});
