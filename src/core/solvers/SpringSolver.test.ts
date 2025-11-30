import { describe, it, expect } from 'vitest';
import { SpringSolver } from './SpringSolver.js';
import { RoomState } from '../../types.js';
import { Vec2 } from '../geometry/Vector2.js';

describe('SpringSolver', () => {
  const createSimpleBoundary = (): Vec2[] => [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];

  const createSimpleRooms = (): RoomState[] => [
    {
      id: 'room1',
      x: 10,
      y: 10,
      width: 20,
      height: 20,
      vx: 0,
      vy: 0,
      targetRatio: 1.2,
    },
    {
      id: 'room2',
      x: 50,
      y: 50,
      width: 20,
      height: 20,
      vx: 0,
      vy: 0,
      targetRatio: 1.2,
    },
  ];

  describe('constructor', () => {
    it('should initialize with rooms and boundary', () => {
      const rooms = createSimpleRooms();
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, []);

      expect(solver).toBeDefined();
      expect(solver.getState().length).toBe(2);
    });

    it('should not mutate input rooms array', () => {
      const rooms = createSimpleRooms();
      const boundary = createSimpleBoundary();
      const originalRooms = JSON.stringify(rooms);

      const solver = new SpringSolver(rooms, boundary, []);
      solver.step();

      expect(JSON.stringify(rooms)).toBe(originalRooms);
    });

    it('should accept custom config', () => {
      const rooms = createSimpleRooms();
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, [], {
        timestep: 0.01,
        friction: 0.95,
        maxVelocity: 100,
        forces: {
          adjacency: 5,
          repulsion: 100,
          boundary: 25,
          aspectRatio: 10,
        },
      });

      expect(solver).toBeDefined();
    });
  });

  describe('step', () => {
    it('should update room positions', () => {
      const rooms: RoomState[] = [
        {
          id: 'room1',
          x: 10,
          y: 10,
          width: 20,
          height: 20,
          vx: 5,
          vy: 5,
          targetRatio: 1.0,
        },
      ];
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, []);
      const beforeX = solver.getState()[0].x;
      const beforeY = solver.getState()[0].y;

      solver.step();

      const afterX = solver.getState()[0].x;
      const afterY = solver.getState()[0].y;

      // Position should have changed due to velocity
      expect(afterX).not.toBe(beforeX);
      expect(afterY).not.toBe(beforeY);
    });

    it('should apply friction to velocity', () => {
      const rooms: RoomState[] = [
        {
          id: 'room1',
          x: 50,
          y: 50,
          width: 20,
          height: 20,
          vx: 10,
          vy: 10,
          targetRatio: 1.0,
        },
      ];
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, [], {
        friction: 0.9,
      });

      solver.step();
      const state = solver.getState()[0];

      // Velocity should be reduced but not zero
      expect(Math.abs(state.vx)).toBeLessThan(10);
      expect(Math.abs(state.vy)).toBeLessThan(10);
      expect(Math.abs(state.vx)).toBeGreaterThan(0);
      expect(Math.abs(state.vy)).toBeGreaterThan(0);
    });

    it('should clamp velocity to maxVelocity', () => {
      const rooms: RoomState[] = [
        {
          id: 'room1',
          x: 50,
          y: 50,
          width: 20,
          height: 20,
          vx: 1000,
          vy: 1000,
          targetRatio: 1.0,
        },
      ];
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, [], {
        maxVelocity: 50,
      });

      solver.step();
      const state = solver.getState()[0];
      const speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);

      expect(speed).toBeLessThanOrEqual(50);
    });
  });

  describe('adjacency forces', () => {
    it('should pull adjacent rooms together', () => {
      const rooms: RoomState[] = [
        {
          id: 'A',
          x: 10,
          y: 10,
          width: 20,
          height: 20,
          vx: 0,
          vy: 0,
          targetRatio: 1.0,
        },
        {
          id: 'B',
          x: 70,
          y: 70,
          width: 20,
          height: 20,
          vx: 0,
          vy: 0,
          targetRatio: 1.0,
        },
      ];
      const boundary = createSimpleBoundary();
      const adjacencies = [{ a: 'A', b: 'B', weight: 1.0 }];

      const solver = new SpringSolver(rooms, boundary, adjacencies, {
        forces: { adjacency: 10, repulsion: 0, boundary: 0, aspectRatio: 0 },
      });

      const beforeDist = Math.sqrt(
        Math.pow(70 - 10, 2) + Math.pow(70 - 10, 2)
      );

      solver.simulate(50);

      const state = solver.getState();
      const roomA = state.find(r => r.id === 'A')!;
      const roomB = state.find(r => r.id === 'B')!;

      const afterDist = Math.sqrt(
        Math.pow(roomB.x - roomA.x, 2) + Math.pow(roomB.y - roomA.y, 2)
      );

      // Distance should decrease
      expect(afterDist).toBeLessThan(beforeDist);
    });
  });

  describe('repulsion forces', () => {
    it('should push overlapping rooms apart', () => {
      const rooms: RoomState[] = [
        {
          id: 'A',
          x: 40,
          y: 40,
          width: 20,
          height: 20,
          vx: 0,
          vy: 0,
          targetRatio: 1.0,
        },
        {
          id: 'B',
          x: 50,
          y: 50,
          width: 20,
          height: 20,
          vx: 0,
          vy: 0,
          targetRatio: 1.0,
        },
      ];
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, [], {
        forces: { adjacency: 0, repulsion: 200, boundary: 0, aspectRatio: 0 },
      });

      const beforeDist = Math.sqrt(
        Math.pow(50 - 40, 2) + Math.pow(50 - 40, 2)
      );

      solver.simulate(20);

      const state = solver.getState();
      const roomA = state.find(r => r.id === 'A')!;
      const roomB = state.find(r => r.id === 'B')!;

      const afterDist = Math.sqrt(
        Math.pow(roomB.x - roomA.x, 2) + Math.pow(roomB.y - roomA.y, 2)
      );

      // Distance should increase (rooms pushed apart)
      expect(afterDist).toBeGreaterThan(beforeDist);
    });
  });

  describe('boundary forces', () => {
    it('should pull rooms back inside boundary', () => {
      const rooms: RoomState[] = [
        {
          id: 'escapee',
          x: -10, // Outside boundary
          y: -10,
          width: 20,
          height: 20,
          vx: 0,
          vy: 0,
          targetRatio: 1.0,
        },
      ];
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, [], {
        forces: { adjacency: 0, repulsion: 0, boundary: 50, aspectRatio: 0 },
      });

      solver.simulate(50);

      const state = solver.getState()[0];

      // Should have moved towards positive coordinates
      expect(state.x).toBeGreaterThan(-10);
      expect(state.y).toBeGreaterThan(-10);
    });
  });

  describe('aspect ratio forces', () => {
    it('should preserve aspect ratio within bounds', () => {
      const rooms: RoomState[] = [
        {
          id: 'room',
          x: 50,
          y: 50,
          width: 10,
          height: 30, // Ratio = 0.33, below minRatio
          vx: 0,
          vy: 0,
          targetRatio: 1.2,
        },
      ];
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, [], {
        forces: { adjacency: 0, repulsion: 0, boundary: 0, aspectRatio: 20 },
      });

      const beforeRatio = rooms[0].width / rooms[0].height;

      solver.simulate(100);

      const state = solver.getState()[0];
      const afterRatio = state.width / state.height;

      // Ratio should move towards valid range (0.8)
      expect(afterRatio).toBeGreaterThan(beforeRatio);
      // Allow for gradual convergence - should be significantly improved
      expect(afterRatio).toBeGreaterThan(0.6);
    });
  });

  describe('hasConverged', () => {
    it('should return true when all velocities are near zero', () => {
      const rooms: RoomState[] = [
        {
          id: 'room1',
          x: 50,
          y: 50,
          width: 20,
          height: 20,
          vx: 0.05,
          vy: 0.05,
          targetRatio: 1.0,
        },
      ];
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, []);

      expect(solver.hasConverged(0.1)).toBe(true);
    });

    it('should return false when velocities are high', () => {
      const rooms: RoomState[] = [
        {
          id: 'room1',
          x: 50,
          y: 50,
          width: 20,
          height: 20,
          vx: 10,
          vy: 10,
          targetRatio: 1.0,
        },
      ];
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, []);

      expect(solver.hasConverged(0.1)).toBe(false);
    });
  });

  describe('getKineticEnergy', () => {
    it('should calculate total kinetic energy', () => {
      const rooms: RoomState[] = [
        {
          id: 'room1',
          x: 50,
          y: 50,
          width: 20,
          height: 20,
          vx: 3,
          vy: 4,
          targetRatio: 1.0,
        },
      ];
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, []);
      const energy = solver.getKineticEnergy();

      // Energy = vx^2 + vy^2 = 9 + 16 = 25
      expect(energy).toBe(25);
    });

    it('should decrease over time with friction', () => {
      const rooms: RoomState[] = [
        {
          id: 'room1',
          x: 50,
          y: 50,
          width: 20,
          height: 20,
          vx: 10,
          vy: 10,
          targetRatio: 1.0,
        },
      ];
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, [], {
        friction: 0.9,
        forces: { adjacency: 0, repulsion: 0, boundary: 0, aspectRatio: 0 },
      });

      const energyBefore = solver.getKineticEnergy();
      solver.simulate(10);
      const energyAfter = solver.getKineticEnergy();

      expect(energyAfter).toBeLessThan(energyBefore);
    });
  });

  describe('simulate', () => {
    it('should run multiple steps', () => {
      const rooms = createSimpleRooms();
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, []);

      expect(() => solver.simulate(100)).not.toThrow();
    });
  });
});
