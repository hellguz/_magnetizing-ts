import React, { useRef, useState, useEffect, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Line, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { SceneContainer } from '../visualization/SceneContainer.js';
import { EvolutionarySolver, type Variant } from '../core/solvers/EvolutionarySolver.js';
import { Vec2 } from '../core/geometry/Vector2.js';
import { Adjacency } from '../types.js';
import { springTemplates, type SpringTemplateType } from './templates/springTemplates.js';

// Filter templates to exclude 'palace' and 'hotel'
const AVAILABLE_TEMPLATES = Object.keys(springTemplates).filter(
  (key) => key !== 'palace' && key !== 'hotel'
) as SpringTemplateType[];

// Color map matching SpringSystem3D
// Note: Defined outside component to avoid recreation on every render
const ROOM_COLORS: Record<string, string> = {
  'living': '#ff6b6b',
  'kitchen': '#4ecdc4',
  'bedroom': '#45b7d1',
  'bedroom-1': '#45b7d1',
  'bedroom-2': '#5f8bc4',
  'bedroom-3': '#6a9bd1',
  'bedroom-4': '#7ba8d8',
  'bedroom-5': '#8cb5df',
  'bathroom': '#f7b731',
  'bath-1': '#f7b731',
  'bath-2': '#f9ca24',
  'bath-3': '#ffd93d',
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
  'storage-1': '#9b8fc9',
  'storage-2': '#8b7eb8',
  'balcony': '#98d8c8',
  'waiting': '#55efc4',
  'exam-1': '#ff7675',
  'exam-2': '#ff7675',
  'exam-3': '#ff7675',
  'lab': '#74b9ff',
  'staff': '#fdcb6e',
  'entrance': '#e17055',
  'bar': '#6c5ce7',
  'restrooms': '#fab1a0',
  'corridor-1': '#808080',
};

/**
 * Get color for a room by ID
 * Note: Defined outside component to avoid recreation on every render
 */
const getRoomColor = (id: string): string => {
  return ROOM_COLORS[id] || '#cccccc';
};

/**
 * BestVariantView: Optimized component for the best variant with imperative updates
 * Uses refs and useFrame for 60fps updates without triggering React re-renders
 */
interface BestVariantViewProps {
  solverRef: React.MutableRefObject<EvolutionarySolver | null>;
  boundary: Vec2[];
  adjacencies: Adjacency[];
  showBoundary?: boolean;
  showAdjacencies?: boolean;
  showLabels?: boolean;
}

const BestVariantView: React.FC<BestVariantViewProps> = ({
  solverRef,
  boundary,
  adjacencies,
  showBoundary = true,
  showAdjacencies = true,
  showLabels = true,
}) => {
  // Store mesh and text references for imperative updates
  const meshRefsMap = useRef<Map<string, THREE.Mesh>>(new Map());
  const textRefsMap = useRef<Map<string, any>>(new Map());
  const lineRefsMap = useRef<Map<number, THREE.Line>>(new Map());

  // Store initial room snapshot for rendering structure
  const [roomsSnapshot, setRoomsSnapshot] = useState<any[]>([]);

  // Initialize room snapshot when solver changes
  useEffect(() => {
    if (solverRef.current) {
      const bestVariant = solverRef.current.getBest();
      setRoomsSnapshot(bestVariant.rooms);
    }
  }, [solverRef]);

  // Update mesh positions imperatively every frame (no React re-render!)
  useFrame(() => {
    if (!solverRef.current) return;

    const bestVariant = solverRef.current.getBest();
    const rooms = bestVariant.rooms;

    // Update each room's mesh position imperatively
    for (const room of rooms) {
      const mesh = meshRefsMap.current.get(room.id);
      const text = textRefsMap.current.get(room.id);

      if (mesh) {
        const centerX = room.x + room.width / 2;
        const centerY = room.y + room.height / 2;

        // Imperative update - no React re-render!
        mesh.position.set(centerX, centerY, 0);
        mesh.scale.set(room.width, room.height, 1);

        if (text) {
          text.position.set(centerX, centerY, 1);
        }
      }
    }

    // Update adjacency lines imperatively
    adjacencies.forEach((adj, index) => {
      const line = lineRefsMap.current.get(index);
      if (!line) return;

      const roomA = rooms.find((r: any) => r.id === adj.a);
      const roomB = rooms.find((r: any) => r.id === adj.b);

      if (roomA && roomB && line.geometry) {
        const centerA = {
          x: roomA.x + roomA.width / 2,
          y: roomA.y + roomA.height / 2,
        };
        const centerB = {
          x: roomB.x + roomB.width / 2,
          y: roomB.y + roomB.height / 2,
        };

        // Update line geometry positions
        const positions = line.geometry.attributes.position;
        if (positions) {
          positions.setXYZ(0, centerA.x, centerA.y, 0);
          positions.setXYZ(1, centerB.x, centerB.y, 0);
          positions.needsUpdate = true;
        }
      }
    });
  });

  return (
    <>
      {/* Boundary */}
      {showBoundary && boundary.length > 0 && (
        <Line
          points={[...boundary.map((p) => [p.x, p.y, 0] as [number, number, number]), [boundary[0].x, boundary[0].y, 0] as [number, number, number]]}
          color="#2c2c2cff"
          lineWidth={3}
        />
      )}

      {/* Adjacency lines - will be updated imperatively via refs */}
      {showAdjacencies && adjacencies.map((adj, index) => {
        const roomA = roomsSnapshot.find((r: any) => r.id === adj.a);
        const roomB = roomsSnapshot.find((r: any) => r.id === adj.b);

        if (!roomA || !roomB) return null;

        const centerA = {
          x: roomA.x + roomA.width / 2,
          y: roomA.y + roomA.height / 2,
        };
        const centerB = {
          x: roomB.x + roomB.width / 2,
          y: roomB.y + roomB.height / 2,
        };

        return (
          <line
            key={`adj-${index}`}
            ref={(line: any) => {
              if (line) lineRefsMap.current.set(index, line);
            }}
          >
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([
                  centerA.x, centerA.y, 0,
                  centerB.x, centerB.y, 0
                ])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#757575" />
          </line>
        );
      })}

      {/* Rooms - meshes will be updated imperatively via refs */}
      {roomsSnapshot.map((room: any) => {
        const color = getRoomColor(room.id);
        const centerX = room.x + room.width / 2;
        const centerY = room.y + room.height / 2;

        return (
          <group key={room.id}>
            {/* Room box - ref stored for imperative updates */}
            <mesh
              ref={(mesh) => {
                if (mesh) meshRefsMap.current.set(room.id, mesh);
              }}
              position={[centerX, centerY, 0]}
            >
              {/* Unit cube - will be scaled imperatively in useFrame */}
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color={color} opacity={0.8} transparent />
              <Edges color="black" />
            </mesh>

            {/* Room label - ref stored for imperative updates */}
            {showLabels && (
              <Text
                ref={(text) => {
                  if (text) textRefsMap.current.set(room.id, text);
                }}
                position={[centerX, centerY, 1]}
                fontSize={12}
                color="black"
                anchorX="center"
                anchorY="middle"
                renderOrder={1}
              >
                {room.id}
              </Text>
            )}
          </group>
        );
      })}
    </>
  );
};

/**
 * Component to render a single variant (floorplan)
 */
interface VariantViewProps {
  variant: Variant;
  boundary: Vec2[];
  adjacencies?: Adjacency[];
  showBoundary?: boolean;
  showAdjacencies?: boolean;
  showLabels?: boolean;
  scale?: number;
}

const VariantView: React.FC<VariantViewProps> = React.memo(({
  variant,
  boundary,
  adjacencies = [],
  showBoundary = true,
  showAdjacencies = true,
  showLabels = true,
  scale = 1,
}) => {
  // Memoize room lookup map to avoid repeated .find() calls
  const roomMap = useMemo(() => {
    const map = new Map();
    variant.rooms.forEach(room => map.set(room.id, room));
    return map;
  }, [variant.rooms]);

  // Memoize boundary points to avoid recreating array on every render
  const boundaryPoints = useMemo(() => {
    if (!showBoundary || boundary.length === 0) return [];
    return [...boundary.map((p) => [p.x, p.y, 0] as [number, number, number]), [boundary[0].x, boundary[0].y, 0] as [number, number, number]];
  }, [boundary, showBoundary]);

  return (
    <group scale={[scale, scale, scale]}>
      {/* Boundary - matching SpringSystem3D style */}
      {showBoundary && boundaryPoints.length > 0 && (
        <Line
          points={boundaryPoints}
          color="#2c2c2cff"
          lineWidth={3}
        />
      )}

      {/* Adjacency lines - matching SpringSystem3D style */}
      {showAdjacencies && adjacencies.map((adj) => {
        const roomA = roomMap.get(adj.a);
        const roomB = roomMap.get(adj.b);

        if (!roomA || !roomB) return null;

        const centerA = {
          x: roomA.x + roomA.width / 2,
          y: roomA.y + roomA.height / 2,
        };
        const centerB = {
          x: roomB.x + roomB.width / 2,
          y: roomB.y + roomB.height / 2,
        };

        return (
          <line key={`adj-${adj.a}-${adj.b}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([
                  centerA.x, centerA.y, 0,
                  centerB.x, centerB.y, 0
                ])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#757575" />
          </line>
        );
      })}

      {/* Rooms - matching SpringSystem3D style */}
      {variant.rooms.map((room) => {
        const centerX = room.x + room.width / 2;
        const centerY = room.y + room.height / 2;
        const color = getRoomColor(room.id);

        return (
          <group key={room.id}>
            {/* Room box with black edges */}
            <mesh position={[centerX, centerY, 0]}>
              <boxGeometry args={[room.width, room.height, 1]} />
              <meshBasicMaterial color={color} opacity={0.8} transparent />
              <Edges color="black" />
            </mesh>

            {/* Room label - matching SpringSystem3D style */}
            {showLabels && (
              <Text
                position={[centerX, centerY, 1]}
                fontSize={12}
                color="black"
                anchorX="center"
                anchorY="middle"
                renderOrder={1}
              >
                {room.id}
              </Text>
            )}
          </group>
        );
      })}
    </group>
  );
});

/**
 * Story Args Interface
 */
interface EvolutionaryStoryArgs {
  template: SpringTemplateType;
  autoPlay: boolean;
  populationSize: number;
  physicsIterations: number;
  wallConstraintMeters: number;
  weightWallCompliance: number;
  weightOverlap: number;
  weightOutOfBounds: number;
  weightArea: number;
  mutationTeleport: number;
  mutationSwap: number;
  mutationRotate: number;
  showGridView: boolean;
  gridScale: number;
}

/**
 * Main Story Component
 */
const EvolutionarySolverVisualization: React.FC<EvolutionaryStoryArgs> = (args) => {
  const solverRef = useRef<EvolutionarySolver | null>(null);
  const animationIdRef = useRef<number | null>(null);

  // Batch state updates to reduce re-renders (was 3 setState calls = 3 renders per frame)
  const [solverState, setSolverState] = useState<{
    bestVariant: Variant | null;
    allVariants: Variant[];
    generation: number;
  }>({
    bestVariant: null,
    allVariants: [],
    generation: 0,
  });

  const [boundary, setBoundary] = useState<Vec2[]>([]);
  const [adjacencies, setAdjacencies] = useState<Adjacency[]>([]);
  const [solverVersion, setSolverVersion] = useState(0);

  // Destructure batched state for easier access
  const { bestVariant, allVariants, generation } = solverState;

  // Initialize solver when config changes
  useEffect(() => {
    const template = springTemplates[args.template];
    const { rooms, adjacencies } = template;

    // Cancel any running animation
    if (animationIdRef.current !== null) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    // Create new solver
    solverRef.current = new EvolutionarySolver(rooms, template.boundary, adjacencies, {
      populationSize: args.populationSize,
      maxGenerations: 1000,
      physicsIterations: args.physicsIterations,
      wallConstraintMeters: args.wallConstraintMeters,
      weights: {
        wallCompliance: args.weightWallCompliance,
        overlap: args.weightOverlap,
        outOfBounds: args.weightOutOfBounds,
        area: args.weightArea,
      },
      mutationRates: {
        teleport: args.mutationTeleport,
        swap: args.mutationSwap,
        rotate: args.mutationRotate,
      },
    });

    // Get initial state (batched update)
    setSolverState({
      bestVariant: solverRef.current.getBest(),
      allVariants: solverRef.current.getAllVariants(),
      generation: solverRef.current.getGeneration(),
    });
    setBoundary(solverRef.current.getBoundary());
    setAdjacencies(adjacencies);
    setSolverVersion((v) => v + 1);
  }, [
    args.template,
    args.populationSize,
    args.physicsIterations,
    args.wallConstraintMeters,
    args.weightWallCompliance,
    args.weightOverlap,
    args.weightOutOfBounds,
    args.weightArea,
    args.mutationTeleport,
    args.mutationSwap,
    args.mutationRotate,
  ]);

  // Animation loop
  useEffect(() => {
    let isDisposed = false;

    // Cancel any existing animation
    if (animationIdRef.current !== null) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    if (args.autoPlay && solverRef.current) {
      const animate = () => {
        if (isDisposed) return;

        if (solverRef.current) {
          solverRef.current.step();

          // Update state (batched - single render instead of 3)
          setSolverState({
            bestVariant: solverRef.current.getBest(),
            allVariants: solverRef.current.getAllVariants(),
            generation: solverRef.current.getGeneration(),
          });

          animationIdRef.current = requestAnimationFrame(animate);
        }
      };
      animate();
    }

    return () => {
      isDisposed = true;
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, [args.autoPlay, solverVersion]);

  // Memoize boundary metrics to avoid recalculating on every render
  const boundaryMetrics = useMemo(() => {
    if (boundary.length === 0) {
      return { width: 100, height: 100, centroid: { x: 0, y: 0 } };
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let sumX = 0, sumY = 0;

    for (const p of boundary) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      sumX += p.x;
      sumY += p.y;
    }

    return {
      width: maxX - minX,
      height: maxY - minY,
      centroid: { x: sumX / boundary.length, y: sumY / boundary.length }
    };
  }, [boundary]);

  // Memoize grid layout calculations
  const gridLayout = useMemo(() => ({
    cols: 5,
    spacing: boundaryMetrics.width * (args.gridScale + 0.2),
    rowSpacing: boundaryMetrics.height * (args.gridScale + 0.2)
  }), [boundaryMetrics.width, boundaryMetrics.height, args.gridScale]);

  // Memoize grid positions to avoid recalculating every frame
  const gridPositions = useMemo(() => {
    return allVariants.map((variant, index) => {
      const row = Math.floor(index / gridLayout.cols);
      const col = index % gridLayout.cols;
      return {
        id: variant.id,
        x: (col - 2) * gridLayout.spacing,
        y: -boundaryMetrics.height * 1.8 - row * gridLayout.rowSpacing
      };
    });
  }, [allVariants, gridLayout, boundaryMetrics.height]);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <Canvas>
        <SceneContainer zoom={1} target={[boundaryMetrics.centroid.x, boundaryMetrics.centroid.y, 0]}>
          {/* Main View (Best Variant) - Uses imperative updates for performance */}
          {solverRef.current && (
            <group position={[0, 0, 0]}>
              <BestVariantView
                solverRef={solverRef}
                boundary={boundary}
                adjacencies={adjacencies}
                showBoundary={true}
                showAdjacencies={true}
                showLabels={true}
              />

              {/* Main view label */}
              {bestVariant && (
                <>
                  <Text
                    position={[boundaryMetrics.centroid.x, boundaryMetrics.centroid.y + boundaryMetrics.height / 2 + 20, 0]}
                    fontSize={15}
                    color="#ffffff"
                    anchorX="center"
                    anchorY="bottom"
                  >
                    BEST VARIANT
                  </Text>
                  <Text
                    position={[boundaryMetrics.centroid.x, boundaryMetrics.centroid.y + boundaryMetrics.height / 2 + 35, 0]}
                    fontSize={12}
                    color="#ffff00"
                    anchorX="center"
                    anchorY="bottom"
                  >
                    {`Fitness: ${bestVariant.fitness.toFixed(2)}`}
                  </Text>
                </>
              )}
            </group>
          )}

          {/* Grid View (All Variants) */}
          {args.showGridView &&
            gridPositions.map((pos, index) => {
              const variant = allVariants[index];
              if (!variant) return null;

              return (
                <group key={pos.id} position={[pos.x, pos.y, 0]}>
                  <VariantView
                    variant={variant}
                    boundary={boundary}
                    adjacencies={adjacencies}
                    showBoundary={true}
                    showAdjacencies={false}
                    showLabels={false}
                    scale={args.gridScale}
                  />

                  {/* Fitness score above each grid item */}
                  <Text
                    position={[0, (boundaryMetrics.height * args.gridScale) / 2 + 8, 0]}
                    fontSize={8}
                    color={index === 0 ? '#00ff00' : '#ffffff'}
                    anchorX="center"
                    anchorY="bottom"
                  >
                    {variant.fitness.toFixed(1)}
                  </Text>
                </group>
              );
            })}
        </SceneContainer>
      </Canvas>

      {/* Info Display */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '15px',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#ffffff',
          lineHeight: '1.6',
        }}
      >
        <strong style={{ fontSize: '16px', color: '#00ff00' }}>Evolutionary Solver</strong>
        <br />
        <br />
        Generation: {generation}
        <br />
        Population: {allVariants.length}
        <br />
        <br />
        {bestVariant && (
          <>
            <strong>Best Fitness: {bestVariant.fitness.toFixed(2)}</strong>
            <br />
            <span style={{ color: '#ffaaaa' }}>
              • Wall: {bestVariant.fitnessComponents.wallCompliance.toFixed(2)}
            </span>
            <br />
            <span style={{ color: '#aaaaff' }}>
              • Overlap: {bestVariant.fitnessComponents.overlaps.toFixed(2)}
            </span>
            <br />
            <span style={{ color: '#ffaa00' }}>
              • Out: {bestVariant.fitnessComponents.outOfBounds.toFixed(2)}
            </span>
            <br />
            <span style={{ color: '#aaffaa' }}>
              • Area: {bestVariant.fitnessComponents.areaDeviation.toFixed(2)}
            </span>
          </>
        )}
        <br />
        <br />
        Auto-Play: {args.autoPlay ? 'On' : 'Off'}
      </div>
    </div>
  );
};

// Storybook Meta
const meta: Meta<EvolutionaryStoryArgs> = {
  title: 'Evolutionary Solver',
  component: EvolutionarySolverVisualization,
  argTypes: {
    template: {
      control: { type: 'select' },
      options: AVAILABLE_TEMPLATES,
      description: 'Room configuration template (palace & hotel excluded)',
    },
    autoPlay: {
      control: { type: 'boolean' },
      description: 'Auto-run the evolutionary algorithm',
    },
    populationSize: {
      control: { type: 'range', min: 10, max: 50, step: 5 },
      description: 'Number of variants in population',
    },
    physicsIterations: {
      control: { type: 'range', min: 5, max: 30, step: 5 },
      description: 'Physics iterations per generation',
    },
    wallConstraintMeters: {
      control: { type: 'range', min: 0.5, max: 3.0, step: 0.1 },
      description: 'Target shared wall length (meters)',
    },
    weightWallCompliance: {
      control: { type: 'range', min: 0, max: 50, step: 1 },
      description: 'Fitness weight for wall compliance',
    },
    weightOverlap: {
      control: { type: 'range', min: 0, max: 50, step: 1 },
      description: 'Fitness weight for overlaps',
    },
    weightOutOfBounds: {
      control: { type: 'range', min: 0, max: 200, step: 10 },
      description: 'Fitness weight for out-of-bounds penalty',
    },
    weightArea: {
      control: { type: 'range', min: 0, max: 10, step: 0.5 },
      description: 'Fitness weight for area deviation',
    },
    mutationTeleport: {
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: 'Teleport mutation rate',
    },
    mutationSwap: {
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: 'Swap mutation rate',
    },
    mutationRotate: {
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: 'Rotation mutation rate',
    },
    showGridView: {
      control: { type: 'boolean' },
      description: 'Show grid of all variants',
    },
    gridScale: {
      control: { type: 'range', min: 0.1, max: 1.0, step: 0.05 },
      description: 'Scale of grid items',
    },
  },
};

export default meta;

type Story = StoryObj<EvolutionaryStoryArgs>;

// Default Story
export const Default: Story = {
  args: {
    template: 'small-apartment',
    autoPlay: true,
    populationSize: 25,
    physicsIterations: 10,
    wallConstraintMeters: 1.5,
    weightWallCompliance: 10.0,
    weightOverlap: 5.0,
    weightOutOfBounds: 100.0,
    weightArea: 1.0,
    mutationTeleport: 0.3,
    mutationSwap: 0.3,
    mutationRotate: 0.3,
    showGridView: true,
    gridScale: 0.3,
  },
};

// Story with Grid View Disabled
export const MainViewOnly: Story = {
  args: {
    ...Default.args,
    showGridView: false,
  },
};

// Story with High Mutation
export const HighMutation: Story = {
  args: {
    ...Default.args,
    mutationTeleport: 0.6,
    mutationSwap: 0.5,
    mutationRotate: 0.5,
  },
};

// Story with Larger Template
export const LargeHouse: Story = {
  args: {
    ...Default.args,
    template: 'large-house',
    populationSize: 30,
    gridScale: 0.2,
  },
};
