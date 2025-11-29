import type { Meta, StoryObj } from '@storybook/html';
import { SpringSolver } from '../core/solvers/SpringSolver.js';
import { RoomState, Adjacency } from '../types.js';
import { Vec2 } from '../core/geometry/Vector2.js';

type TemplateType = 'small-apartment' | 'office-suite' | 'house' | 'gallery' | 'clinic' | 'restaurant';

interface SpringTemplate {
  boundary: Vec2[];
  rooms: RoomState[];
  adjacencies: Adjacency[];
}

interface SpringRendererArgs {
  template: TemplateType;
  populationSize: number;
  mutationRate: number;
  mutationStrength: number;
  crossoverRate: number;
  selectionPressure: number;
  fitnessBalance: number;
  aspectRatioMutationRate: number;
  boundaryScale: number;
  autoPlay: boolean;
  showAdjacencies: boolean;
  showBoundary: boolean;
  showPopulation: boolean;
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
      { id: 'entry', x: 80, y: 80, width: 100, height: 90, vx: 0, vy: 0, minRatio: 0.4, maxRatio: 1.6 },
      { id: 'living', x: 250, y: 100, width: 200, height: 150, vx: 0, vy: 0, minRatio: 1.2, maxRatio: 1.6 },
      { id: 'dining', x: 500, y: 100, width: 150, height: 120, vx: 0, vy: 0, minRatio: 1.0, maxRatio: 1.4 },
      { id: 'kitchen', x: 500, y: 300, width: 150, height: 130, vx: 0, vy: 0, minRatio: 0.9, maxRatio: 1.3 },
      { id: 'bedroom-1', x: 100, y: 350, width: 140, height: 120, vx: 0, vy: 0, minRatio: 1.0, maxRatio: 1.3 },
      { id: 'bedroom-2', x: 300, y: 350, width: 130, height: 110, vx: 0, vy: 0, minRatio: 1.0, maxRatio: 1.3 },
      { id: 'bath-1', x: 150, y: 500, width: 90, height: 80, vx: 0, vy: 0, minRatio: 0.3, maxRatio:3 },
      { id: 'bath-2', x: 350, y: 500, width: 80, height: 70, vx: 0, vy: 0, minRatio: 0.3, maxRatio: 3 },
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

// Helper: fast AABB overlap check
const checkAABBOverlap = (r1: RoomState, r2: RoomState) => {
  const r1Right = r1.x + r1.width;
  const r1Bottom = r1.y + r1.height;
  const r2Right = r2.x + r2.width;
  const r2Bottom = r2.y + r2.height;

  return !(r1.x > r2Right || r1Right < r2.x || r1.y > r2Bottom || r1Bottom < r2.y);
};

// Helper: Calculate centroid of a polygon
const calculateCentroid = (points: Vec2[]) => {
  let x = 0, y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
};

const createRenderer = (args: SpringRendererArgs) => {
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

  // Optimizations for Retina displays
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
  const { rooms, adjacencies } = template;

  // Boundary Scaling Logic
  const initialBoundary = template.boundary;
  const centroid = calculateCentroid(initialBoundary);

  const boundary = initialBoundary.map(p => ({
    x: centroid.x + (p.x - centroid.x) * args.boundaryScale,
    y: centroid.y + (p.y - centroid.y) * args.boundaryScale
  }));

  // Create solver with ES config
  const solver = new SpringSolver(rooms, boundary, adjacencies, {
    populationSize: args.populationSize,
    maxGenerations: 1000,
    mutationRate: args.mutationRate,
    mutationStrength: args.mutationStrength,
    crossoverRate: args.crossoverRate,
    selectionPressure: args.selectionPressure,
    fitnessBalance: args.fitnessBalance,
    aspectRatioMutationRate: args.aspectRatioMutationRate,
  });

  let animationId: number | null = null;
  let renderScheduled = false;

  // Info display
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
    const centerX = (canvas.width / dpr / zoom - 800) / 2;
    const centerY = (canvas.height / dpr / zoom - 650) / 2;
    ctx.translate(centerX, centerY);

    // Draw boundary
    if (args.showBoundary) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3 / zoom;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(boundary[0].x, boundary[0].y);
      for (let i = 1; i < boundary.length; i++) {
        ctx.lineTo(boundary[i].x, boundary[i].y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const state = solver.getState();

    // Draw adjacency connections
    if (args.showAdjacencies) {
      ctx.setLineDash([5, 5]);

      for (const adj of adjacencies) {
        const roomA = state.find((r) => r.id === adj.a);
        const roomB = state.find((r) => r.id === adj.b);

        if (roomA && roomB) {
          const centerA = { x: roomA.x + roomA.width / 2, y: roomA.y + roomA.height / 2 };
          const centerB = { x: roomB.x + roomB.width / 2, y: roomB.y + roomB.height / 2 };

          const lineWidth = (adj.weight ?? 1.0) * 1.5;
          ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
          ctx.lineWidth = lineWidth / zoom;

          ctx.beginPath();
          ctx.moveTo(centerA.x, centerA.y);
          ctx.lineTo(centerB.x, centerB.y);
          ctx.stroke();
        }
      }

      ctx.setLineDash([]);
    }

    // Draw rooms
    for (let i = 0; i < state.length; i++) {
      const room = state[i];
      let hasOverlap = false;

      // AABB overlap check
      for (let j = 0; j < state.length; j++) {
        if (i === j) continue;
        if (checkAABBOverlap(room, state[j])) {
          hasOverlap = true;
          break;
        }
      }

      ctx.fillStyle = roomColors[room.id] || '#cccccc';
      ctx.globalAlpha = hasOverlap ? 0.6 : 0.8;
      ctx.fillRect(room.x, room.y, room.width, room.height);

      ctx.lineWidth = hasOverlap ? (3 / zoom) : (1 / zoom);
      ctx.strokeStyle = hasOverlap ? '#ff0000' : '#000000';
      ctx.strokeRect(room.x, room.y, room.width, room.height);

      ctx.globalAlpha = 1.0;

      // Draw label
      ctx.fillStyle = '#000000';
      const fontSize = Math.max(10, 10 / zoom);
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const textMetrics = ctx.measureText(room.id);
      const padding = 2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(
        room.x + room.width / 2 - textMetrics.width / 2 - padding,
        room.y + room.height / 2 - (fontSize * 0.6),
        textMetrics.width + padding * 2,
        fontSize * 1.2
      );

      ctx.fillStyle = '#000000';
      ctx.fillText(room.id, room.x + room.width / 2, room.y + room.height / 2);
    }

    ctx.restore();

    // Update info
    const stats = solver.getStats();
    const converged = solver.hasConverged(0.01);
    info.innerHTML = `
      <strong>Spring Solver (Evolutionary Strategy)</strong><br>
      Generation: ${stats.generation}<br>
      Best Fitness: ${stats.bestFitness.toFixed(4)}<br>
      - FitnessG (Overlap): ${stats.bestFitnessG.toFixed(2)}<br>
      - FitnessT (Distance): ${stats.bestFitnessT.toFixed(2)}<br>
      Avg Fitness: ${stats.avgFitness.toFixed(4)}<br>
      Population: ${args.populationSize}<br>
      Converged: ${converged ? 'Yes' : 'No'}<br>
      <br>
      <em>Drag to pan, scroll to zoom</em>
    `;
  };

  const step = () => {
    solver.step();
    render();

    if (args.autoPlay && !solver.hasConverged(0.01)) {
      animationId = requestAnimationFrame(step);
    }
  };

  // Initial render
  render();

  // Controls
  const controls = document.createElement('div');
  controls.style.position = 'absolute';
  controls.style.top = '10px';
  controls.style.right = '10px';
  controls.style.display = 'flex';
  controls.style.gap = '5px';
  controls.style.zIndex = '1000';

  const stepButton = document.createElement('button');
  stepButton.textContent = 'Step';
  stepButton.style.padding = '5px 10px';
  stepButton.style.cursor = 'pointer';
  stepButton.onclick = () => step();

  const playButton = document.createElement('button');
  playButton.textContent = args.autoPlay ? 'Pause' : 'Play';
  playButton.style.padding = '5px 10px';
  playButton.style.cursor = 'pointer';
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
  resetButton.style.padding = '5px 10px';
  resetButton.style.cursor = 'pointer';
  resetButton.onclick = () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    // Re-create solver
    const newBoundary = initialBoundary.map(p => ({
        x: centroid.x + (p.x - centroid.x) * args.boundaryScale,
        y: centroid.y + (p.y - centroid.y) * args.boundaryScale
    }));

    const newSolver = new SpringSolver(rooms, newBoundary, adjacencies, {
      populationSize: args.populationSize,
      maxGenerations: 1000,
      mutationRate: args.mutationRate,
      mutationStrength: args.mutationStrength,
      crossoverRate: args.crossoverRate,
      selectionPressure: args.selectionPressure,
      fitnessBalance: args.fitnessBalance,
      aspectRatioMutationRate: args.aspectRatioMutationRate,
    });
    Object.assign(solver, newSolver);
    render();
    playButton.textContent = 'Play';
  };

  controls.appendChild(stepButton);
  controls.appendChild(playButton);
  controls.appendChild(resetButton);

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

  container.appendChild(canvas);
  container.appendChild(controls);
  container.appendChild(info);

  // Auto-play if enabled
  if (args.autoPlay) {
    playButton.textContent = 'Pause';
    animationId = requestAnimationFrame(step);
  }

  return container;
};

const meta: Meta<SpringRendererArgs> = {
  title: 'Solvers/Spring Solver',
  render: createRenderer,
  argTypes: {
    template: {
      control: { type: 'select' },
      options: ['small-apartment', 'office-suite', 'house', 'gallery', 'clinic', 'restaurant'],
      description: 'Room configuration template',
    },
    populationSize: {
      control: { type: 'range', min: 5, max: 50, step: 5 },
      description: 'Number of candidate solutions (genes)',
    },
    mutationRate: {
      control: { type: 'range', min: 0.0, max: 1.0, step: 0.05 },
      description: 'Probability of mutation per gene',
    },
    mutationStrength: {
      control: { type: 'range', min: 1, max: 50, step: 1 },
      description: 'Magnitude of position/dimension changes',
    },
    crossoverRate: {
      control: { type: 'range', min: 0.0, max: 1.0, step: 0.05 },
      description: 'Rate of offspring generation',
    },
    selectionPressure: {
      control: { type: 'range', min: 0.1, max: 0.5, step: 0.05 },
      description: 'Percentage of population to cull',
    },
    fitnessBalance: {
      control: { type: 'range', min: 0.0, max: 1.0, step: 0.05 },
      description: 'Balance: 0=Geometric only, 1=Topological only',
    },
    aspectRatioMutationRate: {
      control: { type: 'range', min: 0.0, max: 1.0, step: 0.05 },
      description: 'Probability of aspect ratio mutation (room shape exploration)',
    },
    boundaryScale: {
      control: { type: 'range', min: 0.1, max: 1.0, step: 0.05 },
      description: 'Scale boundary towards centroid',
    },
    autoPlay: {
      control: { type: 'boolean' },
      description: 'Auto-play simulation on load',
    },
    showAdjacencies: {
      control: { type: 'boolean' },
      description: 'Show adjacency connections between rooms',
    },
    showBoundary: {
      control: { type: 'boolean' },
      description: 'Show apartment boundary (red dashed line)',
    },
    showPopulation: {
      control: { type: 'boolean' },
      description: 'Show all genes in population (future feature)',
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<SpringRendererArgs>;

export const Default: Story = {
  args: {
    template: 'small-apartment',
    populationSize: 15,
    mutationRate: 0.3,
    mutationStrength: 10,
    crossoverRate: 0.5,
    selectionPressure: 0.3,
    fitnessBalance: 0.5,
    aspectRatioMutationRate: 0.3,
    boundaryScale: 1.0,
    autoPlay: false,
    showAdjacencies: true,
    showBoundary: true,
    showPopulation: false,
  },
};
