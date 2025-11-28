import { describe, it, expect } from 'vitest';
import { Vector2, Vec2 } from './Vector2.js';

describe('Vector2', () => {
  describe('add', () => {
    it('should add two vectors', () => {
      const out: Vec2 = { x: 0, y: 0 };
      const a: Vec2 = { x: 3, y: 4 };
      const b: Vec2 = { x: 1, y: 2 };

      Vector2.add(out, a, b);

      expect(out.x).toBe(4);
      expect(out.y).toBe(6);
    });

    it('should handle negative values', () => {
      const out: Vec2 = { x: 0, y: 0 };
      const a: Vec2 = { x: -3, y: 5 };
      const b: Vec2 = { x: 2, y: -7 };

      Vector2.add(out, a, b);

      expect(out.x).toBe(-1);
      expect(out.y).toBe(-2);
    });
  });

  describe('sub', () => {
    it('should subtract two vectors', () => {
      const out: Vec2 = { x: 0, y: 0 };
      const a: Vec2 = { x: 5, y: 8 };
      const b: Vec2 = { x: 2, y: 3 };

      Vector2.sub(out, a, b);

      expect(out.x).toBe(3);
      expect(out.y).toBe(5);
    });

    it('should handle negative results', () => {
      const out: Vec2 = { x: 0, y: 0 };
      const a: Vec2 = { x: 1, y: 2 };
      const b: Vec2 = { x: 3, y: 4 };

      Vector2.sub(out, a, b);

      expect(out.x).toBe(-2);
      expect(out.y).toBe(-2);
    });
  });

  describe('mult', () => {
    it('should multiply vector by scalar', () => {
      const out: Vec2 = { x: 0, y: 0 };
      const a: Vec2 = { x: 3, y: 4 };

      Vector2.mult(out, a, 2);

      expect(out.x).toBe(6);
      expect(out.y).toBe(8);
    });

    it('should handle negative scalar', () => {
      const out: Vec2 = { x: 0, y: 0 };
      const a: Vec2 = { x: 2, y: -3 };

      Vector2.mult(out, a, -1.5);

      expect(out.x).toBe(-3);
      expect(out.y).toBe(4.5);
    });

    it('should handle zero scalar', () => {
      const out: Vec2 = { x: 0, y: 0 };
      const a: Vec2 = { x: 5, y: 10 };

      Vector2.mult(out, a, 0);

      expect(out.x).toBe(0);
      expect(out.y).toBe(0);
    });
  });

  describe('mag', () => {
    it('should calculate magnitude of vector', () => {
      const a: Vec2 = { x: 3, y: 4 };
      const magnitude = Vector2.mag(a);
      expect(magnitude).toBe(5);
    });

    it('should handle zero vector', () => {
      const a: Vec2 = { x: 0, y: 0 };
      const magnitude = Vector2.mag(a);
      expect(magnitude).toBe(0);
    });

    it('should handle negative components', () => {
      const a: Vec2 = { x: -3, y: -4 };
      const magnitude = Vector2.mag(a);
      expect(magnitude).toBe(5);
    });
  });

  describe('dist', () => {
    it('should calculate distance between two vectors', () => {
      const a: Vec2 = { x: 0, y: 0 };
      const b: Vec2 = { x: 3, y: 4 };
      const distance = Vector2.dist(a, b);
      expect(distance).toBe(5);
    });

    it('should be symmetric', () => {
      const a: Vec2 = { x: 1, y: 2 };
      const b: Vec2 = { x: 4, y: 6 };
      expect(Vector2.dist(a, b)).toBe(Vector2.dist(b, a));
    });

    it('should return zero for same point', () => {
      const a: Vec2 = { x: 5, y: 7 };
      expect(Vector2.dist(a, a)).toBe(0);
    });
  });

  describe('normalize', () => {
    it('should normalize vector to unit length', () => {
      const out: Vec2 = { x: 0, y: 0 };
      const a: Vec2 = { x: 3, y: 4 };

      Vector2.normalize(out, a);

      expect(out.x).toBeCloseTo(0.6);
      expect(out.y).toBeCloseTo(0.8);
      expect(Vector2.mag(out)).toBeCloseTo(1.0);
    });

    it('should handle zero vector safely', () => {
      const out: Vec2 = { x: 99, y: 99 };
      const a: Vec2 = { x: 0, y: 0 };

      Vector2.normalize(out, a);

      expect(out.x).toBe(0);
      expect(out.y).toBe(0);
    });

    it('should handle very small vectors safely', () => {
      const out: Vec2 = { x: 0, y: 0 };
      const a: Vec2 = { x: 0.000001, y: 0.000001 };

      Vector2.normalize(out, a);

      expect(out.x).toBe(0);
      expect(out.y).toBe(0);
    });

    it('should normalize negative vectors correctly', () => {
      const out: Vec2 = { x: 0, y: 0 };
      const a: Vec2 = { x: -1, y: 0 };

      Vector2.normalize(out, a);

      expect(out.x).toBeCloseTo(-1);
      expect(out.y).toBeCloseTo(0);
      expect(Vector2.mag(out)).toBeCloseTo(1.0);
    });
  });
});
