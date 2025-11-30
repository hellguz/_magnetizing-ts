import React, { useMemo, useRef, useState, useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Canvas } from '@react-three/fiber';
import { SceneContainer } from '../visualization/SceneContainer.js';
import { DiscreteGrid3D } from '../visualization/DiscreteGrid3D.js';
import { DiscreteGridOverlay } from '../visualization/DiscreteGridOverlay.js';
import { SpringSystem3D } from '../visualization/SpringSystem3D.js';
import { DiscreteSolver } from '../core/solvers/DiscreteSolver.js';
import { SpringSolver } from '../core/solvers/SpringSolver.js';
import { Point } from '../core/grid/GridBuffer.js';
import { RoomRequest, Adjacency, RoomState, CorridorRule } from '../types.js';
import { Vec2 } from '../core/geometry/Vector2.js';

type TemplateType = 'small-apartment' | 'office-suite' | 'house' | 'gallery' | 'clinic' | 'restaurant';

interface DiscreteTemplate {
  boundary: Point[];
  rooms: RoomRequest[];
  adjacencies: Adjacency[];
  startPoint: { x: number; y: number };
}

interface SpringTemplate {
  boundary: Vec2[];
  rooms: RoomState[];
  adjacencies: Adjacency[];
}

interface DiscreteVisualizationArgs {
  template: TemplateType;
  gridResolution: number;
  mutationRate: number;
  maxIterations: number;
  cellSize: number;
  boundaryScale: number;
  showAdjacencies: boolean;
  showBoundary: boolean;
  showStartPoint: boolean;
}

interface SpringVisualizationArgs {
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
}

// Template configurations (reused from existing stories)
const discreteTemplates: Record<TemplateType, DiscreteTemplate> = {
  'small-apartment': {
    boundary: [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 40 },
      { x: 0, y: 40 },
    ],
    rooms: [
      { id: 'living', targetArea: 200, targetRatio: 1.5, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'kitchen', targetArea: 120, targetRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'bedroom', targetArea: 150, targetRatio: 1.3, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'bathroom', targetArea: 60, targetRatio: 1.0, corridorRule: CorridorRule.ONE_SIDE },
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
      { id: 'reception', targetArea: 180, targetRatio: 1.8, corridorRule: CorridorRule.ALL_SIDES },
      { id: 'office-1', targetArea: 140, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'office-2', targetArea: 140, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'office-3', targetArea: 140, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'meeting', targetArea: 200, targetRatio: 1.5, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'restroom', targetArea: 80, targetRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
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
      { id: 'entry', targetArea: 100, targetRatio: 1.2, corridorRule: CorridorRule.ALL_SIDES },
      { id: 'living', targetArea: 300, targetRatio: 1.6, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'dining', targetArea: 180, targetRatio: 1.4, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'kitchen', targetArea: 200, targetRatio: 1.3, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'bedroom-1', targetArea: 200, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'bedroom-2', targetArea: 180, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'bath-1', targetArea: 80, targetRatio: 1.0, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'bath-2', targetArea: 60, targetRatio: 1.0, corridorRule: CorridorRule.ONE_SIDE },
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
      { id: 'lobby', targetArea: 250, targetRatio: 2.0, corridorRule: CorridorRule.ALL_SIDES },
      { id: 'gallery-a', targetArea: 300, targetRatio: 1.8, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'gallery-b', targetArea: 300, targetRatio: 1.8, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'gallery-c', targetArea: 250, targetRatio: 1.5, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'storage', targetArea: 120, targetRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
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
      { id: 'waiting', targetArea: 200, targetRatio: 1.7, corridorRule: CorridorRule.ALL_SIDES },
      { id: 'reception', targetArea: 100, targetRatio: 1.4, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'exam-1', targetArea: 120, targetRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'exam-2', targetArea: 120, targetRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'exam-3', targetArea: 120, targetRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'lab', targetArea: 150, targetRatio: 1.3, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'staff', targetArea: 90, targetRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
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
      { id: 'entrance', targetArea: 80, targetRatio: 1.2, corridorRule: CorridorRule.ALL_SIDES },
      { id: 'dining-main', targetArea: 400, targetRatio: 1.7, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'dining-private', targetArea: 150, targetRatio: 1.4, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'bar', targetArea: 180, targetRatio: 2.0, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'kitchen', targetArea: 250, targetRatio: 1.4, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'storage', targetArea: 100, targetRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'restrooms', targetArea: 120, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
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

const springTemplates: Record<TemplateType, SpringTemplate> = {
  'small-apartment': {
    boundary: [
      { x: 50, y: 50 },
      { x: 550, y: 50 },
      { x: 550, y: 450 },
      { x: 50, y: 450 },
    ],
    rooms: [
      { id: 'living', x: 100, y: 100, width: 150, height: 120, vx: 0, vy: 0, targetRatio: 1.5 },
      { id: 'kitchen', x: 300, y: 100, width: 110, height: 100, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'bedroom', x: 100, y: 280, width: 120, height: 110, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'bathroom', x: 350, y: 300, width: 80, height: 70, vx: 0, vy: 0, targetRatio: 1.0 },
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
      { id: 'reception', x: 100, y: 80, width: 180, height: 140, vx: 0, vy: 0, targetRatio: 1.8 },
      { id: 'office-1', x: 350, y: 100, width: 120, height: 100, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'office-2', x: 500, y: 100, width: 120, height: 100, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'office-3', x: 350, y: 250, width: 120, height: 100, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'meeting', x: 100, y: 300, width: 200, height: 140, vx: 0, vy: 0, targetRatio: 1.5 },
      { id: 'restroom', x: 500, y: 400, width: 100, height: 80, vx: 0, vy: 0, targetRatio: 1.2 },
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
      { id: 'entry', x: 80, y: 80, width: 100, height: 90, vx: 0, vy: 0, targetRatio: 5.0 },
      { id: 'living', x: 250, y: 100, width: 200, height: 150, vx: 0, vy: 0, targetRatio: 1.6 },
      { id: 'dining', x: 500, y: 100, width: 150, height: 120, vx: 0, vy: 0, targetRatio: 1.4 },
      { id: 'kitchen', x: 500, y: 300, width: 150, height: 130, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'bedroom-1', x: 100, y: 350, width: 140, height: 120, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'bedroom-2', x: 300, y: 350, width: 130, height: 110, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'bath-1', x: 150, y: 500, width: 90, height: 80, vx: 0, vy: 0, targetRatio: 5 },
      { id: 'bath-2', x: 350, y: 500, width: 80, height: 70, vx: 0, vy: 0, targetRatio: 5 },
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
      { id: 'lobby', x: 100, y: 100, width: 200, height: 120, vx: 0, vy: 0, targetRatio: 2.0 },
      { id: 'gallery-a', x: 350, y: 80, width: 180, height: 140, vx: 0, vy: 0, targetRatio: 1.8 },
      { id: 'gallery-b', x: 550, y: 80, width: 180, height: 140, vx: 0, vy: 0, targetRatio: 1.8 },
      { id: 'gallery-c', x: 450, y: 280, width: 170, height: 130, vx: 0, vy: 0, targetRatio: 1.5 },
      { id: 'storage', x: 100, y: 300, width: 110, height: 90, vx: 0, vy: 0, targetRatio: 1.2 },
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
      { id: 'waiting', x: 100, y: 80, width: 160, height: 120, vx: 0, vy: 0, targetRatio: 1.7 },
      { id: 'reception', x: 300, y: 80, width: 120, height: 90, vx: 0, vy: 0, targetRatio: 1.4 },
      { id: 'exam-1', x: 450, y: 80, width: 110, height: 100, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'exam-2', x: 450, y: 220, width: 110, height: 100, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'exam-3', x: 450, y: 350, width: 110, height: 100, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'lab', x: 100, y: 280, width: 130, height: 110, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'staff', x: 280, y: 350, width: 100, height: 80, vx: 0, vy: 0, targetRatio: 1.2 },
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
      { id: 'entrance', x: 80, y: 80, width: 90, height: 80, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'dining-main', x: 250, y: 100, width: 220, height: 160, vx: 0, vy: 0, targetRatio: 1.7 },
      { id: 'dining-private', x: 500, y: 120, width: 140, height: 110, vx: 0, vy: 0, targetRatio: 1.4 },
      { id: 'bar', x: 100, y: 300, width: 170, height: 100, vx: 0, vy: 0, targetRatio: 2.0 },
      { id: 'kitchen', x: 350, y: 320, width: 180, height: 130, vx: 0, vy: 0, targetRatio: 1.4 },
      { id: 'storage', x: 550, y: 350, width: 100, height: 90, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'restrooms', x: 100, y: 450, width: 120, height: 100, vx: 0, vy: 0, targetRatio: 1.3 },
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

// Discrete Solver Story Component
const DiscreteSolverVisualization: React.FC<DiscreteVisualizationArgs> = (args) => {
  const [version, setVersion] = useState(0);
  const solverRef = useRef<DiscreteSolver | null>(null);
  const scaledBoundaryRef = useRef<Point[]>([]);
  const templateRef = useRef<DiscreteTemplate | null>(null);

  // Only recreate solver when template or config changes
  useMemo(() => {
    const template = discreteTemplates[args.template];
    templateRef.current = template;
    const { rooms, adjacencies, startPoint, boundary: templateBoundary } = template;

    // Apply boundary scaling
    const boundary = templateBoundary.map(p => ({
      x: startPoint.x + (p.x - startPoint.x) * args.boundaryScale,
      y: startPoint.y + (p.y - startPoint.y) * args.boundaryScale
    }));
    scaledBoundaryRef.current = boundary;

    solverRef.current = new DiscreteSolver(
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

    // Run solver immediately
    solverRef.current.solve();
    setVersion((v) => v + 1);
  }, [args.template, args.gridResolution, args.maxIterations, args.mutationRate, args.boundaryScale]);

  const handleStep = useCallback(() => {
    if (solverRef.current) {
      solverRef.current.solve();
      setVersion((v) => v + 1);
    }
  }, []);

  const grid = solverRef.current?.getGrid();
  const placedRooms = solverRef.current?.getPlacedRooms();
  const template = templateRef.current;

  if (!grid || !template) return null;

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <Canvas>
        <SceneContainer zoom={20}>
          <DiscreteGrid3D grid={grid} cellSize={args.cellSize} />
          <DiscreteGridOverlay
            boundary={scaledBoundaryRef.current}
            adjacencies={template.adjacencies}
            placedRooms={placedRooms}
            startPoint={template.startPoint}
            cellSize={args.cellSize}
            showBoundary={args.showBoundary}
            showAdjacencies={args.showAdjacencies}
            showStartPoint={args.showStartPoint}
          />
        </SceneContainer>
      </Canvas>

      {/* UI Controls Overlay */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '10px',
          borderRadius: '4px',
          display: 'flex',
          gap: '10px',
        }}
      >
        <button
          onClick={handleStep}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            borderRadius: '4px',
            border: '1px solid #ccc',
            background: '#fff',
          }}
        >
          Re-solve
        </button>
      </div>

      {/* Info Display */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '10px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '12px',
        }}
      >
        <strong>Discrete Solver (R3F)</strong>
        <br />
        Grid: {grid.width} × {grid.height}
        <br />
        Rooms: {solverRef.current?.getPlacedRooms().size || 0}
        <br />
        Resolution: {args.gridResolution}m/cell
        <br />
        Boundary Scale: {args.boundaryScale.toFixed(2)}
        <br />
        <br />
        <em>Right-drag to pan, scroll to zoom</em>
      </div>
    </div>
  );
};

// Spring Solver Story Component
const SpringSolverVisualization: React.FC<SpringVisualizationArgs> = (args) => {
  const [version, setVersion] = useState(0);
  const solverRef = useRef<SpringSolver | null>(null);
  const scaledBoundaryRef = useRef<Vec2[]>([]);
  const animationIdRef = useRef<number | null>(null);

  // Helper: Calculate centroid of a polygon
  const calculateCentroid = useCallback((points: Vec2[]) => {
    let x = 0, y = 0;
    for (const p of points) {
      x += p.x;
      y += p.y;
    }
    return { x: x / points.length, y: y / points.length };
  }, []);

  // Only recreate solver when template or config changes
  useMemo(() => {
    const template = springTemplates[args.template];
    const { rooms, boundary: templateBoundary, adjacencies } = template;

    // Apply boundary scaling towards centroid
    const centroid = calculateCentroid(templateBoundary);
    const boundary = templateBoundary.map(p => ({
      x: centroid.x + (p.x - centroid.x) * args.boundaryScale,
      y: centroid.y + (p.y - centroid.y) * args.boundaryScale
    }));

    scaledBoundaryRef.current = boundary;

    solverRef.current = new SpringSolver(rooms, boundary, adjacencies, {
      populationSize: args.populationSize,
      maxGenerations: 1000,
      mutationRate: args.mutationRate,
      mutationStrength: args.mutationStrength,
      crossoverRate: args.crossoverRate,
      selectionPressure: args.selectionPressure,
      fitnessBalance: args.fitnessBalance,
      aspectRatioMutationRate: args.aspectRatioMutationRate,
    });

    setVersion((v) => v + 1);
  }, [args.template, args.populationSize, args.mutationRate, args.mutationStrength, args.crossoverRate, args.selectionPressure, args.fitnessBalance, args.aspectRatioMutationRate, args.boundaryScale, calculateCentroid]);

  // Animation loop controlled by autoPlay prop
  React.useEffect(() => {
    // Cancel any existing animation
    if (animationIdRef.current !== null) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    if (args.autoPlay && solverRef.current) {
      const animate = () => {
        if (solverRef.current && !solverRef.current.hasConverged(0.01)) {
          solverRef.current.step();
          setVersion((v) => v + 1);
          animationIdRef.current = requestAnimationFrame(animate);
        }
      };
      animate();
    }

    return () => {
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, [args.autoPlay, version]);

  const rooms = solverRef.current?.getState() || [];
  const adjacencies = springTemplates[args.template].adjacencies;

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <Canvas>
        <SceneContainer zoom={1}>
          <SpringSystem3D
            rooms={rooms}
            adjacencies={adjacencies}
            boundary={scaledBoundaryRef.current}
            showAdjacencies={args.showAdjacencies}
            showBoundary={args.showBoundary}
          />
        </SceneContainer>
      </Canvas>

      {/* Info Display */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '10px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '12px',
        }}
      >
        <strong>Spring Solver (R3F)</strong>
        <br />
        Generation: {solverRef.current?.getStats().generation || 0}
        <br />
        Best Fitness: {solverRef.current?.getStats().bestFitness.toFixed(4) || '0.0000'}
        <br />
        - FitnessG: {solverRef.current?.getStats().bestFitnessG.toFixed(2) || '0.00'}
        <br />
        - FitnessT: {solverRef.current?.getStats().bestFitnessT.toFixed(2) || '0.00'}
        <br />
        Population: {args.populationSize}
        <br />
        Converged: {solverRef.current?.hasConverged(0.01) ? 'Yes' : 'No'}
        <br />
        Auto-Play: {args.autoPlay ? 'On' : 'Off'}
        <br />
        <br />
        <em>Right-drag to pan, scroll to zoom</em>
      </div>
    </div>
  );
};

// Storybook Meta for Discrete Solver
const discreteMeta: Meta<DiscreteVisualizationArgs> = {
  title: 'Solvers/Discrete Solver 3D',
  component: DiscreteSolverVisualization,
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
      description: 'Scale boundary towards entrance point',
    },
    showAdjacencies: {
      control: { type: 'boolean' },
      description: 'Show adjacency connections between rooms',
    },
    showBoundary: {
      control: { type: 'boolean' },
      description: 'Show boundary (red dashed line)',
    },
    showStartPoint: {
      control: { type: 'boolean' },
      description: 'Show start point (entrance) marker',
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
};

// Storybook Meta for Spring Solver
const springMeta: Meta<SpringVisualizationArgs> = {
  title: 'Solvers/Spring Solver 3D',
  component: SpringSolverVisualization,
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
      description: 'Automatically run the solver animation',
    },
    showAdjacencies: {
      control: { type: 'boolean' },
      description: 'Show adjacency connections between rooms',
    },
    showBoundary: {
      control: { type: 'boolean' },
      description: 'Show boundary (red dashed line)',
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export default discreteMeta;

type DiscreteStory = StoryObj<DiscreteVisualizationArgs>;
type SpringStory = StoryObj<SpringVisualizationArgs>;

export const DiscreteSolver3D: DiscreteStory = {
  args: {
    template: 'small-apartment',
    gridResolution: 1.0,
    mutationRate: 0.3,
    maxIterations: 100,
    cellSize: 12,
    boundaryScale: 1.0,
    showAdjacencies: true,
    showBoundary: true,
    showStartPoint: true,
  },
};

export const SpringSolver3D: SpringStory = {
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
    autoPlay: true,
    showAdjacencies: true,
    showBoundary: true,
  },
  render: (args) => <SpringSolverVisualization {...args} />,
};
