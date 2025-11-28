export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Static vector math utilities. All operations mutate 'out' parameter to avoid allocations.
 * NEVER use 'new Vector2()' in physics loops.
 */
export class Vector2 {
  /**
   * out = a + b
   */
  static add(out: Vec2, a: Vec2, b: Vec2): void {
    out.x = a.x + b.x;
    out.y = a.y + b.y;
  }

  /**
   * out = a - b
   */
  static sub(out: Vec2, a: Vec2, b: Vec2): void {
    out.x = a.x - b.x;
    out.y = a.y - b.y;
  }

  /**
   * out = a * s (scalar multiplication)
   */
  static mult(out: Vec2, a: Vec2, s: number): void {
    out.x = a.x * s;
    out.y = a.y * s;
  }

  /**
   * Returns magnitude of vector a
   */
  static mag(a: Vec2): number {
    return Math.sqrt(a.x * a.x + a.y * a.y);
  }

  /**
   * Returns distance between vectors a and b
   */
  static dist(a: Vec2, b: Vec2): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * out = normalized(a). Handles zero-length vectors safely.
   */
  static normalize(out: Vec2, a: Vec2): void {
    const m = Vector2.mag(a);
    if (m > 0.00001) {
      out.x = a.x / m;
      out.y = a.y / m;
    } else {
      out.x = 0;
      out.y = 0;
    }
  }
}
