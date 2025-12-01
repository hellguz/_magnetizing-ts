import React, { useMemo, useRef, useState } from 'react';
import { Line } from '@react-three/drei';
import { useDrag } from '@use-gesture/react';
import { ThreeEvent } from '@react-three/fiber';
import { Vec2 } from '../core/geometry/Vector2';

interface BoundaryEditorProps {
  points: Vec2[];
  onChange: (newPoints: Vec2[]) => void;
  editable?: boolean;
  color?: string;
  vertexSize?: number;
  edgeSplitterSize?: number;
}

/**
 * Interactive polygon editor for boundary modification
 *
 * Features:
 * - Vertex handles (black dots) at each point - drag to move vertices
 * - Edge splitters (small dots) at midpoints - drag to create new vertices
 * - Visual feedback with larger dots on hover
 */
export function BoundaryEditor({
  points,
  onChange,
  editable = true,
  color = '#ff0000',
  vertexSize = 8,
  edgeSplitterSize = 4,
}: BoundaryEditorProps) {
  // Convert points to 3D coordinates for Three.js (add z=0)
  const linePoints = useMemo(() => {
    if (points.length < 2) return [];
    // Close the loop by adding first point at the end
    return [...points, points[0]].map(p => [p.x, p.y, 0] as [number, number, number]);
  }, [points]);

  // Calculate midpoints for edge splitters
  const midpoints = useMemo(() => {
    if (points.length < 2) return [];
    const mids: Array<{ pos: Vec2; index: number }> = [];
    for (let i = 0; i < points.length; i++) {
      const next = (i + 1) % points.length;
      mids.push({
        pos: {
          x: (points[i].x + points[next].x) / 2,
          y: (points[i].y + points[next].y) / 2,
        },
        index: i, // Insert after this index
      });
    }
    return mids;
  }, [points]);

  if (points.length < 2) {
    return null;
  }

  return (
    <group>
      {/* Boundary line */}
      <Line
        points={linePoints}
        color={color}
        lineWidth={2}
        dashed
        dashSize={0.3}
        gapSize={0.15}
      />

      {/* Vertex handles (editable points) */}
      {editable && points.map((point, index) => (
        <VertexHandle
          key={`vertex-${index}`}
          position={point}
          index={index}
          points={points}
          onChange={onChange}
          size={vertexSize}
        />
      ))}

      {/* Edge splitters (midpoint dots that create new vertices) */}
      {editable && midpoints.map((mid, i) => (
        <EdgeSplitter
          key={`splitter-${i}`}
          position={mid.pos}
          insertIndex={mid.index}
          points={points}
          onChange={onChange}
          size={edgeSplitterSize}
        />
      ))}
    </group>
  );
}

interface VertexHandleProps {
  position: Vec2;
  index: number;
  points: Vec2[];
  onChange: (newPoints: Vec2[]) => void;
  size: number;
}

function VertexHandle({ position, index, points, onChange, size }: VertexHandleProps) {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const initialPositionRef = useRef({ x: position.x, y: position.y });

  const bind = useDrag(
    ({ down, offset: [ox, oy], first, event }) => {
      // Prevent camera controls from interfering
      if (event) {
        const e = event as any;
        e.stopPropagation();
        if (e.nativeEvent) {
          e.nativeEvent.stopImmediatePropagation();
          e.nativeEvent.stopPropagation();
        }
      }

      if (first) {
        // Store the initial position when drag starts
        initialPositionRef.current = { x: position.x, y: position.y };
      }

      setDragging(down);

      if (down) {
        // Update vertex position using offset from initial position
        const newPoints = [...points];
        newPoints[index] = {
          x: initialPositionRef.current.x + ox,
          y: initialPositionRef.current.y - oy, // Invert Y because screen Y is down, world Y is up
        };
        onChange(newPoints);
      }
    },
    {
      // Use pointer events for better cross-platform support
      pointer: { keys: false },
      // Prevent event bubbling to camera controls
      eventOptions: { passive: false },
      // Transform for coordinate conversion
      from: () => [0, 0],
    }
  );

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'grab';
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
    if (!dragging) {
      document.body.style.cursor = 'auto';
    }
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    // Capture pointer to prevent camera controls from taking over
    if (e.target) {
      (e.target as any).setPointerCapture?.(e.pointerId);
    }
    document.body.style.cursor = 'grabbing';
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    // Release pointer capture
    if (e.target) {
      (e.target as any).releasePointerCapture?.(e.pointerId);
    }
    document.body.style.cursor = hovered ? 'grab' : 'auto';
  };

  const displaySize = hovered || dragging ? size * 1.3 : size;

  return (
    <mesh
      ref={meshRef}
      position={[position.x, position.y, 0.1]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      {...(bind() as any)}
    >
      <circleGeometry args={[displaySize, 16]} />
      <meshBasicMaterial color={dragging ? '#4ecdc4' : '#000000'} depthTest={false} />
    </mesh>
  );
}

interface EdgeSplitterProps {
  position: Vec2;
  insertIndex: number;
  points: Vec2[];
  onChange: (newPoints: Vec2[]) => void;
  size: number;
}

function EdgeSplitter({ position, insertIndex, points, onChange, size }: EdgeSplitterProps) {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const initialPositionRef = useRef({ x: position.x, y: position.y });

  const bind = useDrag(
    ({ down, offset: [ox, oy], first, event }) => {
      // Prevent camera controls from interfering
      if (event) {
        const e = event as any;
        e.stopPropagation();
        if (e.nativeEvent) {
          e.nativeEvent.stopImmediatePropagation();
          e.nativeEvent.stopPropagation();
        }
      }

      if (first) {
        // On first drag, insert new vertex at midpoint and store initial position
        initialPositionRef.current = { x: position.x, y: position.y };
        const newPoints = [...points];
        newPoints.splice(insertIndex + 1, 0, { ...position });
        onChange(newPoints);
        setActive(true);
      }

      if (down && active) {
        // Continue dragging the newly created vertex
        const newPoints = [...points];
        // The new vertex is at insertIndex + 1
        if (newPoints[insertIndex + 1]) {
          newPoints[insertIndex + 1] = {
            x: initialPositionRef.current.x + ox,
            y: initialPositionRef.current.y - oy, // Invert Y because screen Y is down, world Y is up
          };
          onChange(newPoints);
        }
      }

      if (!down) {
        setActive(false);
      }
    },
    {
      pointer: { keys: false },
      // Prevent event bubbling to camera controls
      eventOptions: { passive: false },
      // Transform for coordinate conversion
      from: () => [0, 0],
    }
  );

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'copy';
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
    if (!active) {
      document.body.style.cursor = 'auto';
    }
  };

  const displaySize = hovered || active ? size * 1.5 : size;

  return (
    <mesh
      ref={meshRef}
      position={[position.x, position.y, 0.1]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      {...(bind() as any)}
    >
      <circleGeometry args={[displaySize, 12]} />
      <meshBasicMaterial color={active ? '#4ecdc4' : '#666666'} />
    </mesh>
  );
}
