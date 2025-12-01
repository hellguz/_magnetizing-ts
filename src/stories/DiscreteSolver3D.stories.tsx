import React, { useMemo, useRef, useState, useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Canvas } from '@react-three/fiber';
import { SceneContainer } from '../visualization/SceneContainer.js';
import { DiscreteGrid3D } from '../visualization/DiscreteGrid3D.js';
import { DiscreteGridOverlay } from '../visualization/DiscreteGridOverlay.js';
import { BoundaryEditor } from '../visualization/BoundaryEditor.js';
import { DiscreteSolver } from '../core/solvers/DiscreteSolver.js';
import { Point } from '../core/grid/GridBuffer.js';
import { RoomRequest, Adjacency, CorridorRule } from '../types.js';
import { Vec2 } from '../core/geometry/Vector2.js';

type TemplateType = 'small-apartment' | 'office-suite' | 'house' | 'gallery' | 'clinic' | 'restaurant';

interface DiscreteTemplate {
  boundary: Point[];
  rooms: RoomRequest[];
  adjacencies: Adjacency[];
  startPoint: { x: number; y: number };
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
  editBoundary: boolean;
}

// Template configurations
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

// Discrete Solver Story Component
const DiscreteSolverVisualization: React.FC<DiscreteVisualizationArgs> = (args) => {
  const [version, setVersion] = useState(0);
  const solverRef = useRef<DiscreteSolver | null>(null);
  const scaledBoundaryRef = useRef<Point[]>([]);
  const templateRef = useRef<DiscreteTemplate | null>(null);
  const [editableBoundary, setEditableBoundary] = useState<Vec2[]>([]);

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
    setEditableBoundary(boundary);

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

  // Handle boundary changes from editor
  const handleBoundaryChange = useCallback((newPoints: Vec2[]) => {
    setEditableBoundary(newPoints);
    scaledBoundaryRef.current = newPoints as Point[];

    const template = templateRef.current;
    if (!template) return;

    const { rooms, adjacencies, startPoint } = template;

    // Recreate solver with new boundary
    solverRef.current = new DiscreteSolver(
      newPoints as Point[],
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

    solverRef.current.solve();
    setVersion((v) => v + 1);
  }, [args.gridResolution, args.maxIterations, args.mutationRate]);

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
            showBoundary={!args.editBoundary && args.showBoundary}
            showAdjacencies={args.showAdjacencies}
            showStartPoint={args.showStartPoint}
          />
          {args.editBoundary && (
            <BoundaryEditor
              points={editableBoundary}
              onChange={handleBoundaryChange}
              editable={true}
            />
          )}
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

// Storybook Meta for Discrete Solver
const meta: Meta<DiscreteVisualizationArgs> = {
  title: 'Discrete Solver',
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
    editBoundary: {
      control: { type: 'boolean' },
      description: 'Enable interactive boundary editing (drag vertices, click midpoints to add)',
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<DiscreteVisualizationArgs>;

export const Default: Story = {
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
    editBoundary: false,
  },
};
