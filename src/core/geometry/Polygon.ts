import ClipperLib from 'clipper-lib';
import { Vec2 } from './Vector2.js';

export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Polygon utilities using Clipper library for precise geometric operations.
 */
export class Polygon {
  /**
   * Calculate axis-aligned bounding box for a polygon
   */
  static calculateAABB(points: Vec2[]): AABB {
    if (points.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Check if two AABBs intersect
   */
  static aabbIntersects(a: AABB, b: AABB): boolean {
    return !(
      a.maxX < b.minX ||
      a.minX > b.maxX ||
      a.maxY < b.minY ||
      a.minY > b.maxY
    );
  }

  /**
   * Calculate centroid of a polygon
   */
  static calculateCentroid(points: Vec2[]): Vec2 {
    if (points.length === 0) {
      return { x: 0, y: 0 };
    }

    let cx = 0;
    let cy = 0;

    for (const p of points) {
      cx += p.x;
      cy += p.y;
    }

    return {
      x: cx / points.length,
      y: cy / points.length,
    };
  }

  /**
   * Create a rectangle polygon from position and size
   */
  static createRectangle(x: number, y: number, width: number, height: number): Vec2[] {
    return [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ];
  }

  /**
   * Convert Vec2[] to Clipper path format (scaled integers)
   */
  private static toClipperPath(points: Vec2[], scale: number = 1000): ClipperLib.IntPoint[] {
    return points.map(p => ({
      X: Math.round(p.x * scale),
      Y: Math.round(p.y * scale),
    }));
  }


  /**
   * Calculate intersection area of two polygons using Clipper
   */
  static intersectionArea(poly1: Vec2[], poly2: Vec2[]): number {
    const scale = 1000;

    // Early exit with AABB check
    const aabb1 = Polygon.calculateAABB(poly1);
    const aabb2 = Polygon.calculateAABB(poly2);

    if (!Polygon.aabbIntersects(aabb1, aabb2)) {
      return 0;
    }

    // Convert to Clipper format
    const clipper = new ClipperLib.Clipper();
    const path1 = Polygon.toClipperPath(poly1, scale);
    const path2 = Polygon.toClipperPath(poly2, scale);

    clipper.AddPath(path1, ClipperLib.PolyType.ptSubject, true);
    clipper.AddPath(path2, ClipperLib.PolyType.ptClip, true);

    const solution: ClipperLib.IntPoint[][] = [];
    clipper.Execute(
      ClipperLib.ClipType.ctIntersection,
      solution,
      ClipperLib.PolyFillType.pftEvenOdd,
      ClipperLib.PolyFillType.pftEvenOdd
    );

    if (solution.length === 0) {
      return 0;
    }

    // Calculate total area
    let totalArea = 0;
    for (const path of solution) {
      const area = Math.abs(ClipperLib.Clipper.Area(path));
      totalArea += area / (scale * scale); // Unscale
    }

    return totalArea;
  }

  /**
   * Check if polygon A contains polygon B
   */
  static contains(outer: Vec2[], inner: Vec2[]): boolean {
    const scale = 1000;

    const clipper = new ClipperLib.Clipper();
    const outerPath = Polygon.toClipperPath(outer, scale);
    const innerPath = Polygon.toClipperPath(inner, scale);

    clipper.AddPath(outerPath, ClipperLib.PolyType.ptSubject, true);
    clipper.AddPath(innerPath, ClipperLib.PolyType.ptClip, true);

    const solution: ClipperLib.IntPoint[][] = [];
    clipper.Execute(
      ClipperLib.ClipType.ctIntersection,
      solution,
      ClipperLib.PolyFillType.pftEvenOdd,
      ClipperLib.PolyFillType.pftEvenOdd
    );

    if (solution.length === 0) {
      return false;
    }

    // Calculate area of intersection vs inner polygon
    const innerArea = Math.abs(ClipperLib.Clipper.Area(innerPath));
    let intersectionArea = 0;

    for (const path of solution) {
      intersectionArea += Math.abs(ClipperLib.Clipper.Area(path));
    }

    // If intersection area equals inner area, then outer contains inner
    const ratio = intersectionArea / innerArea;
    return ratio > 0.99; // Allow small floating point errors
  }

  /**
   * Calculate area of a polygon
   */
  static area(points: Vec2[]): number {
    if (points.length < 3) {
      return 0;
    }

    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }

    return Math.abs(area) / 2;
  }

  /**
   * Check if a point is inside a polygon (ray casting algorithm)
   */
  static pointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Find the closest point on a polygon's boundary to a given point.
   * Iterates through all edges and finds the closest point on any edge.
   */
  static closestPointOnPolygon(point: Vec2, polygon: Vec2[]): Vec2 {
    if (polygon.length === 0) {
      return { x: point.x, y: point.y };
    }

    let closestPoint: Vec2 = { x: polygon[0].x, y: polygon[0].y };
    let minDistSq = Infinity;

    // Check all edges
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];

      // Find closest point on edge segment [a, b]
      const edge = Polygon.closestPointOnSegment(point, a, b);
      const distSq = (edge.x - point.x) ** 2 + (edge.y - point.y) ** 2;

      if (distSq < minDistSq) {
        minDistSq = distSq;
        closestPoint = edge;
      }
    }

    return closestPoint;
  }

  /**
   * Find the closest point on a line segment [a, b] to a given point.
   */
  private static closestPointOnSegment(point: Vec2, a: Vec2, b: Vec2): Vec2 {
    const dx = b.x - a.x;
    const dy = b.y - a.y;

    // Handle degenerate case where a === b
    if (dx === 0 && dy === 0) {
      return { x: a.x, y: a.y };
    }

    // Project point onto line segment
    // t = ((P - A) · (B - A)) / ||B - A||²
    const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy);

    // Clamp t to [0, 1] to stay on segment
    const tClamped = Math.max(0, Math.min(1, t));

    return {
      x: a.x + tClamped * dx,
      y: a.y + tClamped * dy,
    };
  }
}
