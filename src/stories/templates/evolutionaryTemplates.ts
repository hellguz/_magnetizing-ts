import { springTemplates, type SpringTemplateType, type SpringTemplate } from './springTemplates.js';
import { RoomState } from '../../types.js';
import { Vec2 } from '../../core/geometry/Vector2.js';

/**
 * Evolutionary template type - excludes palace and hotel
 */
export type EvolutionaryTemplateType = Exclude<SpringTemplateType, 'palace' | 'hotel'>;

/**
 * Filtered templates for evolutionary solver (excludes palace and hotel)
 */
export const evolutionaryTemplates: Record<EvolutionaryTemplateType, SpringTemplate> =
  Object.fromEntries(
    Object.entries(springTemplates).filter(([key]) => key !== 'palace' && key !== 'hotel')
  ) as Record<EvolutionaryTemplateType, SpringTemplate>;

/**
 * Calculate the area of a polygon using the shoelace formula
 */
export function calculatePolygonArea(points: Vec2[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
}

/**
 * Calculate the centroid of a polygon
 */
export function calculateCentroid(points: Vec2[]): Vec2 {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

/**
 * Helper function to scale boundary to match total room area.
 * Ensures that boundary area = sum of room target areas.
 *
 * @param boundary Template boundary polygon
 * @param rooms Array of room states
 * @param manualScale Additional manual scaling factor (default 1.0)
 * @returns Scaled boundary polygon
 */
export function scaleBoundaryToRoomArea(
  boundary: Vec2[],
  rooms: RoomState[],
  manualScale: number = 1.0
): Vec2[] {
  // Calculate total room area
  const totalRoomArea = rooms.reduce((sum, r) => sum + r.width * r.height, 0);

  // Calculate template boundary area
  const boundaryArea = calculatePolygonArea(boundary);

  // Calculate area-based scale factor
  const areaScale = Math.sqrt(totalRoomArea / boundaryArea);

  // Get boundary centroid
  const centroid = calculateCentroid(boundary);

  // Combine area scale with manual scale
  const combinedScale = areaScale * manualScale;

  // Scale all boundary points from centroid
  return boundary.map(p => ({
    x: centroid.x + (p.x - centroid.x) * combinedScale,
    y: centroid.y + (p.y - centroid.y) * combinedScale,
  }));
}

/**
 * Simple boundary scaling (no area matching)
 */
export function scaleBoundary(
  boundary: Vec2[],
  scale: number
): Vec2[] {
  const centroid = calculateCentroid(boundary);

  return boundary.map(p => ({
    x: centroid.x + (p.x - centroid.x) * scale,
    y: centroid.y + (p.y - centroid.y) * scale,
  }));
}

/**
 * Scale rooms to match boundary area.
 * Ensures that total room area fits within the boundary.
 *
 * @param rooms Array of room states to scale
 * @param boundary Boundary polygon
 * @param targetFillRatio Ratio of room area to boundary area (default 0.8 for 80% fill)
 * @returns Scaled rooms
 */
export function scaleRoomsToBoundary(
  rooms: RoomState[],
  boundary: Vec2[],
  targetFillRatio: number = 0.8
): RoomState[] {
  // Calculate total room area
  const totalRoomArea = rooms.reduce((sum, r) => sum + r.width * r.height, 0);

  // Calculate boundary area
  const boundaryArea = calculatePolygonArea(boundary);

  // Calculate scale factor (area scales with square of linear scale)
  const targetArea = boundaryArea * targetFillRatio;
  const areaScale = Math.sqrt(targetArea / totalRoomArea);

  // Scale all room dimensions
  return rooms.map(r => ({
    ...r,
    width: r.width * areaScale,
    height: r.height * areaScale,
    x: r.x * areaScale,
    y: r.y * areaScale,
  }));
}
