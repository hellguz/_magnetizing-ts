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
  boundaryScale: number; // New Slider
  showGrid: boolean;
  showStartPoint: boolean;
  showAdjacencies: boolean;
  showBoundary: boolean;
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
  container.style.width = '100%';
  container.style.height = '100vh';
  container.style.margin = '0';
  container.style.padding = '0';
  container.style.overflow = 'hidden';
  container.style.position = 'relative';

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return container;

  // Optimizations for Retina displays and sharpness
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);

  canvas.style.display = 'block';
  canvas.style.cursor = 'grab';

  // Pan and zoom state
  let panOffset = { x: 0, y: 0 };
  let zoom = 1.0;
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };

  // Get template
  const template = templates[args.template];
  const { rooms, adjacencies, startPoint } = template;

  // --- Boundary Scaling Logic ---
  const boundary = template.boundary.map(p => ({
    x: startPoint.x + (p.x - startPoint.x) * args.boundaryScale,
    y: startPoint.y + (p.y - startPoint.y) * args.boundaryScale
  }));
  // ------------------------------

  // Create solver
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
    42
  );

  solver.solve();

  const grid = solver.getGrid();
  const placedRooms = solver.getPlacedRooms();

  // --- Offscreen Buffering Optimization ---
  // We render the static grid ONCE to an offscreen canvas.
  // During pan/zoom, we just draw this image.
  let offscreenCanvas: HTMLCanvasElement | null = null;

  const roomColors = new Map<number, string>([
    [CELL_EMPTY, '#ffffff'],
    [CELL_OUT_OF_BOUNDS, '#000000'],
    [CELL_CORRIDOR, '#e8e8e8'],
    [1, '#ff6b6b'],
    [2, '#4ecdc4'],
    [3, '#45b7d1'],
    [4, '#f7b731'],
    [5, '#5f27cd'],
    [6, '#a29bfe'],
    [7, '#fd79a8'],
    [8, '#fdcb6e'],
  ]);

  const updateOffscreenBuffer = () => {
    if (!offscreenCanvas) {
      offscreenCanvas = document.createElement('canvas');
    }
    // Set offscreen size to exact grid dimensions
    offscreenCanvas.width = grid.width * args.cellSize;
    offscreenCanvas.height = grid.height * args.cellSize;
    const offCtx = offscreenCanvas.getContext('2d');
    if (!offCtx) return;

    offCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cellValue = grid.get(x, y);
        const color = roomColors.get(cellValue) || '#cccccc';

        offCtx.fillStyle = color;
        offCtx.fillRect(
          x * args.cellSize,
          y * args.cellSize,
          args.cellSize,
          args.cellSize
        );

        if (args.showGrid) {
          offCtx.strokeStyle = '#eeeeee';
          offCtx.lineWidth = 0.5;
          offCtx.strokeRect(
            x * args.cellSize,
            y * args.cellSize,
            args.cellSize,
            args.cellSize
          );
        }
      }
    }
  };

  // Build the buffer initially
  updateOffscreenBuffer();
  // ----------------------------------------

  let renderScheduled = false;

  const scheduleRender = () => {
    if (!renderScheduled) {
      renderScheduled = true;
      requestAnimationFrame(() => {
        render();
        renderScheduled = false;
      });
    }
  };

  const render = () => {
    // Clear main canvas
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    // Center the view
    const centerX = (canvas.width / dpr / zoom - grid.width * args.cellSize) / 2;
    const centerY = (canvas.height / dpr / zoom - grid.height * args.cellSize) / 2;
    ctx.translate(centerX, centerY);

    // 1. Draw Cached Grid (FAST)
    if (offscreenCanvas) {
      ctx.drawImage(offscreenCanvas, 0, 0);
    }

    // 2. Draw Dynamic Overlay Elements (Boundary, Connections, Labels)

    // Draw boundary
    if (args.showBoundary) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3 / zoom; // Keep line width consistent visually
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      boundary.forEach((point, i) => {
        const x = point.x * args.cellSize;
        const y = point.y * args.cellSize;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw adjacencies
    if (args.showAdjacencies) {
      adjacencies.forEach((adj) => {
        const roomA = placedRooms.get(adj.a);
        const roomB = placedRooms.get(adj.b);

        if (roomA && roomB) {
          const centerAx = (roomA.x + roomA.width / 2) * args.cellSize;
          const centerAy = (roomA.y + roomA.height / 2) * args.cellSize;
          const centerBx = (roomB.x + roomB.width / 2) * args.cellSize;
          const centerBy = (roomB.y + roomB.height / 2) * args.cellSize;

          const lineWidth = (adj.weight ?? 1.0) * 1.5;
          ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
          ctx.lineWidth = lineWidth / zoom;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(centerAx, centerAy);
          ctx.lineTo(centerBx, centerBy);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    }

    // Draw start point marker
    if (args.showStartPoint) {
      const markerX = (startPoint.x + 0.5) * args.cellSize;
      const markerY = (startPoint.y + 0.5) * args.cellSize;
      const radius = (args.cellSize * 0.4);

      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(markerX, markerY, radius, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();
    }

    // Draw room labels (on top of everything)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Scale font size inversely with zoom so it remains readable
    const fontSize = Math.max(10, 10 / zoom); 
    ctx.font = `${fontSize}px monospace`;

    placedRooms.forEach((room) => {
      const centerX = (room.x + room.width / 2) * args.cellSize;
      const centerY = (room.y + room.height / 2) * args.cellSize;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      const textMetrics = ctx.measureText(room.id);
      const padding = 2;
      ctx.fillRect(
        centerX - textMetrics.width / 2 - padding,
        centerY - (fontSize * 0.6),
        textMetrics.width + padding * 2,
        fontSize * 1.2
      );

      ctx.fillStyle = '#000000';
      ctx.fillText(room.id, centerX, centerY);
    });

    ctx.restore();
  };

  // Pan and zoom handlers
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    canvas.style.cursor = 'grabbing';
    dragStart = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    panOffset = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    };
    scheduleRender();
  });

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
  });

  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    zoom = Math.max(0.1, Math.min(5, zoom * delta));
    scheduleRender();
  });

  // Info overlay
  const info = document.createElement('div');
  info.style.position = 'absolute';
  info.style.top = '10px';
  info.style.left = '10px';
  info.style.background = 'rgba(255, 255, 255, 0.9)';
  info.style.padding = '10px';
  info.style.borderRadius = '4px';
  info.style.fontFamily = 'monospace';
  info.style.fontSize = '12px';
  info.style.pointerEvents = 'none';
  info.innerHTML = `
    <strong>Discrete Solver</strong><br>
    Grid: ${grid.width} × ${grid.height}<br>
    Rooms: ${placedRooms.size}/${rooms.length}<br>
    Resolution: ${args.gridResolution}m/cell<br>
    Boundary Scale: ${args.boundaryScale.toFixed(2)}<br>
    <br>
    <em>Drag to pan, scroll to zoom</em>
  `;

  container.appendChild(canvas);
  container.appendChild(info);

  render();

  return container;
};

const meta: Meta<DiscreteRendererArgs> = {
  title: 'Solvers/Discrete Solver',
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
    boundaryScale: {
      control: { type: 'range', min: 0.1, max: 1.0, step: 0.05 },
      description: 'Scale boundary towards entrance',
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
    showBoundary: {
      control: { type: 'boolean' },
      description: 'Show apartment boundary (red dashed line)',
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<DiscreteRendererArgs>;

export const DiscreteSolverStory: Story = {
  args: {
    template: 'small-apartment',
    gridResolution: 1.0,
    mutationRate: 0.3,
    maxIterations: 100,
    cellSize: 12,
    boundaryScale: 1.0,
    showGrid: true,
    showStartPoint: true,
    showAdjacencies: true,
    showBoundary: true,
  },
};