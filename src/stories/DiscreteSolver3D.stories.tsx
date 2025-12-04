import React, { useMemo, useRef, useState, useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Canvas } from '@react-three/fiber';
import { SceneContainer } from '../visualization/SceneContainer.js';
import { DiscreteGrid3D } from '../visualization/DiscreteGrid3D.js';
import { DiscreteGridOverlay } from '../visualization/DiscreteGridOverlay.js';
import { BoundaryEditor } from '../visualization/BoundaryEditor.js';
import { DiscreteSolver } from '../core/solvers/DiscreteSolver.js';
import { Point } from '../core/grid/GridBuffer.js';
import { Vec2 } from '../core/geometry/Vector2.js';
import { discreteTemplates, type DiscreteTemplate, type DiscreteTemplateType } from './templates/discreteTemplates.js';
import { discreteSolverDefaults, type DiscreteVisualizationArgs } from './configs/discreteSolverDefaults.js';

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

    // Apply boundary scaling towards centroid for symmetric scaling
    const centerX = templateBoundary.reduce((sum, p) => sum + p.x, 0) / templateBoundary.length;
    const centerY = templateBoundary.reduce((sum, p) => sum + p.y, 0) / templateBoundary.length;
    const boundary = templateBoundary.map(p => ({
      x: centerX + (p.x - centerX) * args.boundaryScale,
      y: centerY + (p.y - centerY) * args.boundaryScale
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

  // Calculate center based on actual rendered grid size (in world coordinates)
  const centerX = (grid.width * args.cellSize) / 2;
  const centerY = (grid.height * args.cellSize) / 2;

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <Canvas>
        <SceneContainer zoom={1.2} target={[centerX, centerY, 0]}>
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
      options: ['small-apartment', 'office-suite', 'house', 'gallery', 'clinic', 'restaurant', 'palace', 'hotel'],
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
  args: discreteSolverDefaults,
};
