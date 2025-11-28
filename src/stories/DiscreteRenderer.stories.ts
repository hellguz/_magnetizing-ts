import type { Meta, StoryObj } from '@storybook/html';
import { DiscreteSolver } from '../core/solvers/DiscreteSolver.js';
import { Point } from '../core/grid/GridBuffer.js';
import { RoomRequest, Adjacency, CorridorRule } from '../types.js';
import { CELL_EMPTY, CELL_OUT_OF_BOUNDS, CELL_CORRIDOR } from '../constants.js';

type TemplateType = 'small-apartment' | 'office-suite' | 'house' | 'gallery' | 'clinic' | 'restaurant';

interface RoomTemplate {
  boundary: Point[];
  rooms: RoomRequest[];
  adjacencies: Adjacency[];
  startPoint: { x: number; y: number };
}

interface DiscreteRendererArgs {
  template: TemplateType;
  gridResolution: number;
  mutationRate: number;
  maxIterations: number;
  cellSize: number;
  showGrid: boolean;
  showStartPoint: boolean;
  showAdjacencies: boolean;
}

// Room configuration templates
const templates: Record<TemplateType, RoomTemplate> = {
  'small-apartment': {
    boundary: [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 40 },
      { x: 0, y: 40 },
    ],
    rooms: [
      { id: 'living', targetArea: 200, minRatio: 1.0, maxRatio: 1.5, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'kitchen', targetArea: 120, minRatio: 0.8, maxRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'bedroom', targetArea: 150, minRatio: 0.9, maxRatio: 1.3, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'bathroom', targetArea: 60, minRatio: 0.7, maxRatio: 1.0, corridorRule: CorridorRule.ONE_SIDE },
    ],
    adjacencies: [
      { a: 'living', b: 'kitchen', weight: 2.0 },
      { a: 'kitchen', b: 'bathroom', weight: 1.5 },
      { a: 'bedroom', b: 'bathroom', weight: 1.0 },
    ],
    startPoint: { x: 25, y: 20 },
  },
  'office-suite': {
    boundary: [
      { x: 0, y: 0 },
      { x: 60, y: 0 },
      { x: 60, y: 50 },
      { x: 0, y: 50 },
    ],
    rooms: [
      { id: 'reception', targetArea: 180, minRatio: 1.2, maxRatio: 1.8, corridorRule: CorridorRule.ALL_SIDES },
      { id: 'office-1', targetArea: 140, minRatio: 1.0, maxRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'office-2', targetArea: 140, minRatio: 1.0, maxRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'office-3', targetArea: 140, minRatio: 1.0, maxRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'meeting', targetArea: 200, minRatio: 1.0, maxRatio: 1.5, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'restroom', targetArea: 80, minRatio: 0.8, maxRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
    ],
    adjacencies: [
      { a: 'reception', b: 'office-1', weight: 1.5 },
      { a: 'reception', b: 'office-2', weight: 1.5 },
      { a: 'reception', b: 'office-3', weight: 1.5 },
      { a: 'reception', b: 'meeting', weight: 2.0 },
      { a: 'meeting', b: 'restroom', weight: 1.0 },
    ],
    startPoint: { x: 30, y: 5 },
  },
  'house': {
    boundary: [
      { x: 0, y: 0 },
      { x: 70, y: 0 },
      { x: 70, y: 60 },
      { x: 0, y: 60 },
    ],
    rooms: [
      { id: 'entry', targetArea: 100, minRatio: 0.8, maxRatio: 1.2, corridorRule: CorridorRule.ALL_SIDES },
      { id: 'living', targetArea: 300, minRatio: 1.2, maxRatio: 1.6, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'dining', targetArea: 180, minRatio: 1.0, maxRatio: 1.4, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'kitchen', targetArea: 200, minRatio: 0.9, maxRatio: 1.3, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'bedroom-1', targetArea: 200, minRatio: 1.0, maxRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'bedroom-2', targetArea: 180, minRatio: 1.0, maxRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'bath-1', targetArea: 80, minRatio: 0.7, maxRatio: 1.0, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'bath-2', targetArea: 60, minRatio: 0.7, maxRatio: 1.0, corridorRule: CorridorRule.ONE_SIDE },
    ],
    adjacencies: [
      { a: 'entry', b: 'living', weight: 2.5 },
      { a: 'living', b: 'dining', weight: 2.0 },
      { a: 'dining', b: 'kitchen', weight: 2.5 },
      { a: 'entry', b: 'bedroom-1', weight: 1.0 },
      { a: 'entry', b: 'bedroom-2', weight: 1.0 },
      { a: 'bedroom-1', b: 'bath-1', weight: 2.0 },
      { a: 'bedroom-2', b: 'bath-2', weight: 2.0 },
    ],
    startPoint: { x: 35, y: 5 },
  },
  'gallery': {
    boundary: [
      { x: 0, y: 0 },
      { x: 80, y: 0 },
      { x: 80, y: 40 },
      { x: 0, y: 40 },
    ],
    rooms: [
      { id: 'lobby', targetArea: 250, minRatio: 1.5, maxRatio: 2.0, corridorRule: CorridorRule.ALL_SIDES },
      { id: 'gallery-a', targetArea: 300, minRatio: 1.2, maxRatio: 1.8, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'gallery-b', targetArea: 300, minRatio: 1.2, maxRatio: 1.8, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'gallery-c', targetArea: 250, minRatio: 1.0, maxRatio: 1.5, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'storage', targetArea: 120, minRatio: 0.8, maxRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
    ],
    adjacencies: [
      { a: 'lobby', b: 'gallery-a', weight: 2.0 },
      { a: 'lobby', b: 'gallery-b', weight: 2.0 },
      { a: 'lobby', b: 'gallery-c', weight: 2.0 },
      { a: 'gallery-a', b: 'gallery-b', weight: 1.5 },
      { a: 'gallery-b', b: 'gallery-c', weight: 1.5 },
      { a: 'lobby', b: 'storage', weight: 1.0 },
    ],
    startPoint: { x: 40, y: 5 },
  },
  'clinic': {
    boundary: [
      { x: 0, y: 0 },
      { x: 55, y: 0 },
      { x: 55, y: 45 },
      { x: 0, y: 45 },
    ],
    rooms: [
      { id: 'waiting', targetArea: 200, minRatio: 1.3, maxRatio: 1.7, corridorRule: CorridorRule.ALL_SIDES },
      { id: 'reception', targetArea: 100, minRatio: 1.0, maxRatio: 1.4, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'exam-1', targetArea: 120, minRatio: 0.9, maxRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'exam-2', targetArea: 120, minRatio: 0.9, maxRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'exam-3', targetArea: 120, minRatio: 0.9, maxRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'lab', targetArea: 150, minRatio: 1.0, maxRatio: 1.3, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'staff', targetArea: 90, minRatio: 0.8, maxRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
    ],
    adjacencies: [
      { a: 'waiting', b: 'reception', weight: 2.5 },
      { a: 'reception', b: 'exam-1', weight: 1.5 },
      { a: 'reception', b: 'exam-2', weight: 1.5 },
      { a: 'reception', b: 'exam-3', weight: 1.5 },
      { a: 'reception', b: 'lab', weight: 2.0 },
      { a: 'reception', b: 'staff', weight: 1.0 },
      { a: 'lab', b: 'exam-1', weight: 1.0 },
    ],
    startPoint: { x: 27, y: 5 },
  },
  'restaurant': {
    boundary: [
      { x: 0, y: 0 },
      { x: 65, y: 0 },
      { x: 65, y: 55 },
      { x: 0, y: 55 },
    ],
    rooms: [
      { id: 'entrance', targetArea: 80, minRatio: 0.8, maxRatio: 1.2, corridorRule: CorridorRule.ALL_SIDES },
      { id: 'dining-main', targetArea: 400, minRatio: 1.3, maxRatio: 1.7, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'dining-private', targetArea: 150, minRatio: 1.0, maxRatio: 1.4, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'bar', targetArea: 180, minRatio: 1.5, maxRatio: 2.0, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'kitchen', targetArea: 250, minRatio: 1.0, maxRatio: 1.4, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'storage', targetArea: 100, minRatio: 0.8, maxRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'restrooms', targetArea: 120, minRatio: 0.9, maxRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
    ],
    adjacencies: [
      { a: 'entrance', b: 'dining-main', weight: 2.5 },
      { a: 'entrance', b: 'bar', weight: 2.0 },
      { a: 'dining-main', b: 'dining-private', weight: 1.5 },
      { a: 'dining-main', b: 'kitchen', weight: 2.5 },
      { a: 'bar', b: 'kitchen', weight: 2.0 },
      { a: 'kitchen', b: 'storage', weight: 2.0 },
      { a: 'entrance', b: 'restrooms', weight: 1.5 },
    ],
    startPoint: { x: 32, y: 5 },
  },
};

const createRenderer = (args: DiscreteRendererArgs) => {
  const container = document.createElement('div');
  container.style.padding = '20px';

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return container;

  // Get template
  const template = templates[args.template];
  const { boundary, rooms, adjacencies, startPoint } = template;

  // Create solver with start point for corridor network
  const solver = new DiscreteSolver(
    boundary,
    rooms,
    adjacencies,
    {
      gridResolution: args.gridResolution,
      maxIterations: args.maxIterations,
      mutationRate: args.mutationRate,
      startPoint,
      weights: {
        compactness: 2.0,
        adjacency: 3.0,
        corridor: 0.5,
      },
    },
    42 // Fixed seed for consistency
  );

  // Solve
  solver.solve();

  const grid = solver.getGrid();
  const placedRooms = solver.getPlacedRooms();

  // Set canvas size
  canvas.width = grid.width * args.cellSize;
  canvas.height = grid.height * args.cellSize;
  canvas.style.border = '1px solid #ccc';

  // Color map for rooms and corridors
  const roomColors = new Map<number, string>([
    [CELL_EMPTY, '#ffffff'],
    [CELL_OUT_OF_BOUNDS, '#000000'],
    [CELL_CORRIDOR, '#e8e8e8'], // Corridors in light gray
    [1, '#ff6b6b'], // Room 1 - Living Room
    [2, '#4ecdc4'], // Room 2 - Kitchen
    [3, '#45b7d1'], // Room 3 - Bedroom
    [4, '#f7b731'], // Room 4 - Bathroom
    [5, '#5f27cd'], // Room 5
  ]);

  // Draw grid
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cellValue = grid.get(x, y);
      const color = roomColors.get(cellValue) || '#cccccc';

      ctx.fillStyle = color;
      ctx.fillRect(
        x * args.cellSize,
        y * args.cellSize,
        args.cellSize,
        args.cellSize
      );

      // Draw grid lines
      if (args.showGrid) {
        ctx.strokeStyle = '#eeeeee';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(
          x * args.cellSize,
          y * args.cellSize,
          args.cellSize,
          args.cellSize
        );
      }
    }
  }

  // Draw adjacencies (connections between rooms) if enabled
  if (args.showAdjacencies) {
    adjacencies.forEach((adj) => {
      const roomA = placedRooms.get(adj.a);
      const roomB = placedRooms.get(adj.b);

      if (roomA && roomB) {
        const centerAx = (roomA.x + roomA.width / 2) * args.cellSize;
        const centerAy = (roomA.y + roomA.height / 2) * args.cellSize;
        const centerBx = (roomB.x + roomB.width / 2) * args.cellSize;
        const centerBy = (roomB.y + roomB.height / 2) * args.cellSize;

        // Draw line with thickness based on weight
        const lineWidth = (adj.weight ?? 1.0) * 1.5;
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
        ctx.lineWidth = lineWidth;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(centerAx, centerAy);
        ctx.lineTo(centerBx, centerBy);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  }

  // Draw start point marker if enabled
  if (args.showStartPoint) {
    const markerX = (startPoint.x + 0.5) * args.cellSize;
    const markerY = (startPoint.y + 0.5) * args.cellSize;

    // Draw a star or circle to mark the entrance
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(markerX, markerY, args.cellSize * 0.4, 0, 2 * Math.PI);
    ctx.fill();

    // Add a white border for visibility
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Draw room labels
  ctx.fillStyle = '#000000';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  placedRooms.forEach((room) => {
    const centerX = (room.x + room.width / 2) * args.cellSize;
    const centerY = (room.y + room.height / 2) * args.cellSize;

    // Draw background for text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const textMetrics = ctx.measureText(room.id);
    const padding = 2;
    ctx.fillRect(
      centerX - textMetrics.width / 2 - padding,
      centerY - 6,
      textMetrics.width + padding * 2,
      12
    );

    // Draw text
    ctx.fillStyle = '#000000';
    ctx.fillText(room.id, centerX, centerY);
  });

  // Add info text
  const info = document.createElement('div');
  info.style.marginTop = '10px';
  info.style.fontFamily = 'monospace';
  info.innerHTML = `
    <strong>Discrete Solver Result</strong><br>
    Grid: ${grid.width} × ${grid.height}<br>
    Placed: ${placedRooms.size}/${rooms.length} rooms<br>
    Resolution: ${args.gridResolution}m/cell<br>
    Iterations: ${args.maxIterations}<br>
    Mutation Rate: ${(args.mutationRate * 100).toFixed(0)}%
  `;

  container.appendChild(canvas);
  container.appendChild(info);

  return container;
};

const meta: Meta<DiscreteRendererArgs> = {
  title: 'Solvers/Discrete Solver',
  tags: ['autodocs'],
  render: createRenderer,
  argTypes: {
    template: {
      control: { type: 'select' },
      options: ['small-apartment', 'office-suite', 'house', 'gallery', 'clinic', 'restaurant'],
      description: 'Room configuration template',
    },
    gridResolution: {
      control: { type: 'range', min: 0.5, max: 2.0, step: 0.1 },
      description: 'Grid resolution in meters per cell',
    },
    mutationRate: {
      control: { type: 'range', min: 0.1, max: 0.9, step: 0.1 },
      description: 'Mutation rate for evolutionary algorithm',
    },
    maxIterations: {
      control: { type: 'range', min: 10, max: 500, step: 10 },
      description: 'Maximum number of iterations',
    },
    cellSize: {
      control: { type: 'range', min: 5, max: 20, step: 1 },
      description: 'Visual size of each grid cell in pixels',
    },
    showGrid: {
      control: { type: 'boolean' },
      description: 'Show grid lines',
    },
    showStartPoint: {
      control: { type: 'boolean' },
      description: 'Show start point (entrance) marker',
    },
    showAdjacencies: {
      control: { type: 'boolean' },
      description: 'Show adjacency connections between rooms',
    },
  },
};

export default meta;
type Story = StoryObj<DiscreteRendererArgs>;

export const Interactive: Story = {
  args: {
    template: 'small-apartment',
    gridResolution: 1.0,
    mutationRate: 0.3,
    maxIterations: 100,
    cellSize: 12,
    showGrid: true,
    showStartPoint: true,
    showAdjacencies: true,
  },
};
