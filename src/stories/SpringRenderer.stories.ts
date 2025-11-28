import type { Meta, StoryObj } from '@storybook/html';
import { SpringSolver } from '../core/solvers/SpringSolver.js';
import { RoomState, Adjacency } from '../types.js';
import { Vec2 } from '../core/geometry/Vector2.js';
import { Polygon } from '../core/geometry/Polygon.js';

type TemplateType = 'small-apartment' | 'office-suite' | 'house' | 'gallery' | 'clinic' | 'restaurant';

interface SpringTemplate {
  boundary: Vec2[];
  rooms: RoomState[];
  adjacencies: Adjacency[];
}

interface SpringRendererArgs {
  template: TemplateType;
  adjacencyForce: number;
  repulsionForce: number;
  boundaryForce: number;
  aspectRatioForce: number;
  friction: number;
  autoPlay: boolean;
  showAdjacencies: boolean;
  showVelocity: boolean;
}

// Spring configuration templates
const templates: Record<TemplateType, SpringTemplate> = {
  'small-apartment': {
    boundary: [
      { x: 50, y: 50 },
      { x: 550, y: 50 },
      { x: 550, y: 450 },
      { x: 50, y: 450 },
    ],
    rooms: [
      { id: 'living', x: 100, y: 100, width: 150, height: 120, vx: 0, vy: 0, minRatio: 1.0, maxRatio: 1.5 },
      { id: 'kitchen', x: 300, y: 100, width: 110, height: 100, vx: 0, vy: 0, minRatio: 0.8, maxRatio: 1.2 },
      { id: 'bedroom', x: 100, y: 280, width: 120, height: 110, vx: 0, vy: 0, minRatio: 0.9, maxRatio: 1.3 },
      { id: 'bathroom', x: 350, y: 300, width: 80, height: 70, vx: 0, vy: 0, minRatio: 0.7, maxRatio: 1.0 },
    ],
    adjacencies: [
      { a: 'living', b: 'kitchen', weight: 2.0 },
      { a: 'kitchen', b: 'bathroom', weight: 1.5 },
      { a: 'bedroom', b: 'bathroom', weight: 1.0 },
    ],
  },
  'office-suite': {
    boundary: [
      { x: 50, y: 50 },
      { x: 650, y: 50 },
      { x: 650, y: 550 },
      { x: 50, y: 550 },
    ],
    rooms: [
      { id: 'reception', x: 100, y: 80, width: 180, height: 140, vx: 0, vy: 0, minRatio: 1.2, maxRatio: 1.8 },
      { id: 'office-1', x: 350, y: 100, width: 120, height: 100, vx: 0, vy: 0, minRatio: 1.0, maxRatio: 1.3 },
      { id: 'office-2', x: 500, y: 100, width: 120, height: 100, vx: 0, vy: 0, minRatio: 1.0, maxRatio: 1.3 },
      { id: 'office-3', x: 350, y: 250, width: 120, height: 100, vx: 0, vy: 0, minRatio: 1.0, maxRatio: 1.3 },
      { id: 'meeting', x: 100, y: 300, width: 200, height: 140, vx: 0, vy: 0, minRatio: 1.0, maxRatio: 1.5 },
      { id: 'restroom', x: 500, y: 400, width: 100, height: 80, vx: 0, vy: 0, minRatio: 0.8, maxRatio: 1.2 },
    ],
    adjacencies: [
      { a: 'reception', b: 'office-1', weight: 1.5 },
      { a: 'reception', b: 'office-2', weight: 1.5 },
      { a: 'reception', b: 'office-3', weight: 1.5 },
      { a: 'reception', b: 'meeting', weight: 2.0 },
      { a: 'meeting', b: 'restroom', weight: 1.0 },
    ],
  },
  'house': {
    boundary: [
      { x: 30, y: 30 },
      { x: 730, y: 30 },
      { x: 730, y: 630 },
      { x: 30, y: 630 },
    ],
    rooms: [
      { id: 'entry', x: 80, y: 80, width: 100, height: 90, vx: 0, vy: 0, minRatio: 0.8, maxRatio: 1.2 },
      { id: 'living', x: 250, y: 100, width: 200, height: 150, vx: 0, vy: 0, minRatio: 1.2, maxRatio: 1.6 },
      { id: 'dining', x: 500, y: 100, width: 150, height: 120, vx: 0, vy: 0, minRatio: 1.0, maxRatio: 1.4 },
      { id: 'kitchen', x: 500, y: 300, width: 150, height: 130, vx: 0, vy: 0, minRatio: 0.9, maxRatio: 1.3 },
      { id: 'bedroom-1', x: 100, y: 350, width: 140, height: 120, vx: 0, vy: 0, minRatio: 1.0, maxRatio: 1.3 },
      { id: 'bedroom-2', x: 300, y: 350, width: 130, height: 110, vx: 0, vy: 0, minRatio: 1.0, maxRatio: 1.3 },
      { id: 'bath-1', x: 150, y: 500, width: 90, height: 80, vx: 0, vy: 0, minRatio: 0.7, maxRatio: 1.0 },
      { id: 'bath-2', x: 350, y: 500, width: 80, height: 70, vx: 0, vy: 0, minRatio: 0.7, maxRatio: 1.0 },
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
  },
  'gallery': {
    boundary: [
      { x: 30, y: 50 },
      { x: 830, y: 50 },
      { x: 830, y: 450 },
      { x: 30, y: 450 },
    ],
    rooms: [
      { id: 'lobby', x: 100, y: 100, width: 200, height: 120, vx: 0, vy: 0, minRatio: 1.5, maxRatio: 2.0 },
      { id: 'gallery-a', x: 350, y: 80, width: 180, height: 140, vx: 0, vy: 0, minRatio: 1.2, maxRatio: 1.8 },
      { id: 'gallery-b', x: 550, y: 80, width: 180, height: 140, vx: 0, vy: 0, minRatio: 1.2, maxRatio: 1.8 },
      { id: 'gallery-c', x: 450, y: 280, width: 170, height: 130, vx: 0, vy: 0, minRatio: 1.0, maxRatio: 1.5 },
      { id: 'storage', x: 100, y: 300, width: 110, height: 90, vx: 0, vy: 0, minRatio: 0.8, maxRatio: 1.2 },
    ],
    adjacencies: [
      { a: 'lobby', b: 'gallery-a', weight: 2.0 },
      { a: 'lobby', b: 'gallery-b', weight: 2.0 },
      { a: 'lobby', b: 'gallery-c', weight: 2.0 },
      { a: 'gallery-a', b: 'gallery-b', weight: 1.5 },
      { a: 'gallery-b', b: 'gallery-c', weight: 1.5 },
      { a: 'lobby', b: 'storage', weight: 1.0 },
    ],
  },
  'clinic': {
    boundary: [
      { x: 50, y: 50 },
      { x: 600, y: 50 },
      { x: 600, y: 500 },
      { x: 50, y: 500 },
    ],
    rooms: [
      { id: 'waiting', x: 100, y: 80, width: 160, height: 120, vx: 0, vy: 0, minRatio: 1.3, maxRatio: 1.7 },
      { id: 'reception', x: 300, y: 80, width: 120, height: 90, vx: 0, vy: 0, minRatio: 1.0, maxRatio: 1.4 },
      { id: 'exam-1', x: 450, y: 80, width: 110, height: 100, vx: 0, vy: 0, minRatio: 0.9, maxRatio: 1.2 },
      { id: 'exam-2', x: 450, y: 220, width: 110, height: 100, vx: 0, vy: 0, minRatio: 0.9, maxRatio: 1.2 },
      { id: 'exam-3', x: 450, y: 350, width: 110, height: 100, vx: 0, vy: 0, minRatio: 0.9, maxRatio: 1.2 },
      { id: 'lab', x: 100, y: 280, width: 130, height: 110, vx: 0, vy: 0, minRatio: 1.0, maxRatio: 1.3 },
      { id: 'staff', x: 280, y: 350, width: 100, height: 80, vx: 0, vy: 0, minRatio: 0.8, maxRatio: 1.2 },
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
  },
  'restaurant': {
    boundary: [
      { x: 30, y: 30 },
      { x: 680, y: 30 },
      { x: 680, y: 580 },
      { x: 30, y: 580 },
    ],
    rooms: [
      { id: 'entrance', x: 80, y: 80, width: 90, height: 80, vx: 0, vy: 0, minRatio: 0.8, maxRatio: 1.2 },
      { id: 'dining-main', x: 250, y: 100, width: 220, height: 160, vx: 0, vy: 0, minRatio: 1.3, maxRatio: 1.7 },
      { id: 'dining-private', x: 500, y: 120, width: 140, height: 110, vx: 0, vy: 0, minRatio: 1.0, maxRatio: 1.4 },
      { id: 'bar', x: 100, y: 300, width: 170, height: 100, vx: 0, vy: 0, minRatio: 1.5, maxRatio: 2.0 },
      { id: 'kitchen', x: 350, y: 320, width: 180, height: 130, vx: 0, vy: 0, minRatio: 1.0, maxRatio: 1.4 },
      { id: 'storage', x: 550, y: 350, width: 100, height: 90, vx: 0, vy: 0, minRatio: 0.8, maxRatio: 1.2 },
      { id: 'restrooms', x: 100, y: 450, width: 120, height: 100, vx: 0, vy: 0, minRatio: 0.9, maxRatio: 1.3 },
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
  },
};

const createRenderer = (args: SpringRendererArgs) => {
  const container = document.createElement('div');
  container.style.padding = '20px';

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return container;

  canvas.width = 800;
  canvas.height = 650;
  canvas.style.border = '1px solid #ccc';

  // Get template
  const template = templates[args.template];
  const { boundary, rooms, adjacencies } = template;

  // Create solver
  const solver = new SpringSolver(rooms, boundary, adjacencies, {
    timestep: 0.016,
    friction: args.friction,
    maxVelocity: 50.0,
    forces: {
      adjacency: args.adjacencyForce,
      repulsion: args.repulsionForce,
      boundary: args.boundaryForce,
      aspectRatio: args.aspectRatioForce,
    },
  });

  const roomColors: Record<string, string> = {
    'living': '#ff6b6b',
    'kitchen': '#4ecdc4',
    'bedroom': '#45b7d1',
    'bedroom-1': '#45b7d1',
    'bedroom-2': '#5f8bc4',
    'bathroom': '#f7b731',
    'bath-1': '#f7b731',
    'bath-2': '#f9ca24',
    'reception': '#a29bfe',
    'office-1': '#fd79a8',
    'office-2': '#fdcb6e',
    'office-3': '#6c5ce7',
    'meeting': '#00b894',
    'restroom': '#fab1a0',
    'entry': '#e17055',
    'dining': '#74b9ff',
    'dining-main': '#74b9ff',
    'dining-private': '#81ecec',
    'lobby': '#ffeaa7',
    'gallery-a': '#dfe6e9',
    'gallery-b': '#b2bec3',
    'gallery-c': '#636e72',
    'storage': '#a29bfe',
    'waiting': '#55efc4',
    'exam-1': '#ff7675',
    'exam-2': '#ff7675',
    'exam-3': '#ff7675',
    'lab': '#74b9ff',
    'staff': '#fdcb6e',
    'entrance': '#e17055',
    'bar': '#6c5ce7',
    'restrooms': '#fab1a0',
  };

  let animationId: number | null = null;
  let iteration = 0;

  const render = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw boundary
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(boundary[0].x, boundary[0].y);
    for (let i = 1; i < boundary.length; i++) {
      ctx.lineTo(boundary[i].x, boundary[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    const state = solver.getState();

    // Draw adjacency connections if enabled
    if (args.showAdjacencies) {
      ctx.setLineDash([5, 5]);

      for (const adj of adjacencies) {
        const roomA = state.find(r => r.id === adj.a);
        const roomB = state.find(r => r.id === adj.b);

        if (roomA && roomB) {
          const centerA = { x: roomA.x + roomA.width / 2, y: roomA.y + roomA.height / 2 };
          const centerB = { x: roomB.x + roomB.width / 2, y: roomB.y + roomB.height / 2 };

          const lineWidth = (adj.weight ?? 1.0) * 1.5;
          ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
          ctx.lineWidth = lineWidth;

          ctx.beginPath();
          ctx.moveTo(centerA.x, centerA.y);
          ctx.lineTo(centerB.x, centerB.y);
          ctx.stroke();
        }
      }

      ctx.setLineDash([]);
    }

    // Check for overlaps and draw rooms
    for (let i = 0; i < state.length; i++) {
      const room = state[i];
      const roomPoly = Polygon.createRectangle(room.x, room.y, room.width, room.height);

      // Check overlap with other rooms
      let hasOverlap = false;
      for (let j = 0; j < state.length; j++) {
        if (i === j) continue;
        const otherRoom = state[j];
        const otherPoly = Polygon.createRectangle(
          otherRoom.x,
          otherRoom.y,
          otherRoom.width,
          otherRoom.height
        );

        const overlapArea = Polygon.intersectionArea(roomPoly, otherPoly);
        if (overlapArea > 0.01) {
          hasOverlap = true;
          break;
        }
      }

      // Draw room
      ctx.fillStyle = roomColors[room.id] || '#cccccc';
      ctx.globalAlpha = hasOverlap ? 0.6 : 0.8;
      ctx.fillRect(room.x, room.y, room.width, room.height);

      // Draw overlap indicator
      if (hasOverlap) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.strokeRect(room.x, room.y, room.width, room.height);
      } else {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(room.x, room.y, room.width, room.height);
      }

      ctx.globalAlpha = 1.0;

      // Draw label
      ctx.fillStyle = '#000000';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Draw background for text
      const textMetrics = ctx.measureText(room.id);
      const padding = 2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(
        room.x + room.width / 2 - textMetrics.width / 2 - padding,
        room.y + room.height / 2 - 6,
        textMetrics.width + padding * 2,
        12
      );

      ctx.fillStyle = '#000000';
      ctx.fillText(
        room.id,
        room.x + room.width / 2,
        room.y + room.height / 2
      );

      // Draw velocity vector if enabled
      if (args.showVelocity) {
        const speed = Math.sqrt(room.vx * room.vx + room.vy * room.vy);
        if (speed > 0.1) {
          const centerX = room.x + room.width / 2;
          const centerY = room.y + room.height / 2;
          const scale = 2;

          ctx.strokeStyle = '#0000ff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(centerX + room.vx * scale, centerY + room.vy * scale);
          ctx.stroke();

          // Arrow head
          const angle = Math.atan2(room.vy, room.vx);
          const headLength = 5;
          ctx.beginPath();
          ctx.moveTo(centerX + room.vx * scale, centerY + room.vy * scale);
          ctx.lineTo(
            centerX + room.vx * scale - headLength * Math.cos(angle - Math.PI / 6),
            centerY + room.vy * scale - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(centerX + room.vx * scale, centerY + room.vy * scale);
          ctx.lineTo(
            centerX + room.vx * scale - headLength * Math.cos(angle + Math.PI / 6),
            centerY + room.vy * scale - headLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }
      }
    }
  };

  const step = () => {
    solver.step();
    iteration++;
    render();

    const energy = solver.getKineticEnergy();
    info.innerHTML = `
      <strong>Spring Solver (Physics Simulation)</strong><br>
      Iteration: ${iteration}<br>
      Kinetic Energy: ${energy.toFixed(2)}<br>
      Converged: ${solver.hasConverged(0.1) ? 'Yes' : 'No'}
    `;

    if (args.autoPlay && !solver.hasConverged(0.1)) {
      animationId = requestAnimationFrame(step);
    }
  };

  // Initial render
  render();

  // Controls
  const controls = document.createElement('div');
  controls.style.marginTop = '10px';

  const stepButton = document.createElement('button');
  stepButton.textContent = 'Step';
  stepButton.onclick = () => step();

  const playButton = document.createElement('button');
  playButton.textContent = args.autoPlay ? 'Pause' : 'Play';
  playButton.onclick = () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
      playButton.textContent = 'Play';
    } else {
      playButton.textContent = 'Pause';
      step();
    }
  };

  const resetButton = document.createElement('button');
  resetButton.textContent = 'Reset';
  resetButton.onclick = () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    iteration = 0;
    const newSolver = new SpringSolver(rooms, boundary, adjacencies, {
      timestep: 0.016,
      friction: args.friction,
      maxVelocity: 50.0,
      forces: {
        adjacency: args.adjacencyForce,
        repulsion: args.repulsionForce,
        boundary: args.boundaryForce,
        aspectRatio: args.aspectRatioForce,
      },
    });
    Object.assign(solver, newSolver);
    render();
    playButton.textContent = 'Play';
  };

  controls.appendChild(stepButton);
  controls.appendChild(playButton);
  controls.appendChild(resetButton);

  // Info display
  const info = document.createElement('div');
  info.style.marginTop = '10px';
  info.style.fontFamily = 'monospace';

  container.appendChild(canvas);
  container.appendChild(controls);
  container.appendChild(info);

  // Auto-play if enabled
  if (args.autoPlay) {
    playButton.textContent = 'Pause';
    animationId = requestAnimationFrame(step);
  } else {
    info.innerHTML = `
      <strong>Spring Solver (Physics Simulation)</strong><br>
      Click "Play" or "Step" to run simulation
    `;
  }

  return container;
};

const meta: Meta<SpringRendererArgs> = {
  title: 'Solvers/Spring Solver',
  tags: ['autodocs'],
  render: createRenderer,
  argTypes: {
    template: {
      control: { type: 'select' },
      options: ['small-apartment', 'office-suite', 'house', 'gallery', 'clinic', 'restaurant'],
      description: 'Room configuration template',
    },
    adjacencyForce: {
      control: { type: 'range', min: 0, max: 50, step: 1 },
      description: 'Spring force between adjacent rooms',
    },
    repulsionForce: {
      control: { type: 'range', min: 0, max: 500, step: 10 },
      description: 'Repulsion force for overlapping rooms',
    },
    boundaryForce: {
      control: { type: 'range', min: 0, max: 100, step: 5 },
      description: 'Force pushing rooms inside boundary',
    },
    aspectRatioForce: {
      control: { type: 'range', min: 0, max: 50, step: 5 },
      description: 'Force preserving room aspect ratios',
    },
    friction: {
      control: { type: 'range', min: 0.5, max: 0.99, step: 0.01 },
      description: 'Friction coefficient (higher = slower)',
    },
    autoPlay: {
      control: { type: 'boolean' },
      description: 'Auto-play simulation on load',
    },
    showAdjacencies: {
      control: { type: 'boolean' },
      description: 'Show adjacency connections between rooms',
    },
    showVelocity: {
      control: { type: 'boolean' },
      description: 'Show velocity vectors (debugging)',
    },
  },
};

export default meta;
type Story = StoryObj<SpringRendererArgs>;

export const Interactive: Story = {
  args: {
    template: 'small-apartment',
    adjacencyForce: 10,
    repulsionForce: 200,
    boundaryForce: 50,
    aspectRatioForce: 20,
    friction: 0.9,
    autoPlay: false,
    showAdjacencies: true,
    showVelocity: false,
  },
};
