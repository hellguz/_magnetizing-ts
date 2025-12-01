import React from 'react';
import { Line, Text } from '@react-three/drei';
import { Point } from '../core/grid/GridBuffer.js';
import { Adjacency } from '../types.js';

interface PlacedRoom {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DiscreteGridOverlayProps {
  boundary?: Point[];
  adjacencies?: Adjacency[];
  placedRooms?: Map<string, PlacedRoom>;
  startPoint?: { x: number; y: number };
  cellSize: number;
  showBoundary?: boolean;
  showAdjacencies?: boolean;
  showStartPoint?: boolean;
}

/**
 * Renders overlay elements for the discrete grid: boundary, adjacencies, start point, and room labels.
 */
export const DiscreteGridOverlay: React.FC<DiscreteGridOverlayProps> = ({
  boundary,
  adjacencies = [],
  placedRooms,
  startPoint,
  cellSize,
  showBoundary = true,
  showAdjacencies = true,
  showStartPoint = true,
}) => {
  return (
    <>
      {/* Render boundary */}
      {showBoundary && boundary && boundary.length > 0 && (
        <Line
          points={[
            ...boundary.map(p => [p.x * cellSize, p.y * cellSize, 0.1]),
            [boundary[0].x * cellSize, boundary[0].y * cellSize, 0.1]
          ]}
          color="red"
          lineWidth={3}
          dashed={true}
          dashSize={10}
          gapSize={5}
        />
      )}

      {/* Render adjacency lines */}
      {showAdjacencies && placedRooms && adjacencies.map((adj, index) => {
        const roomA = placedRooms.get(adj.a);
        const roomB = placedRooms.get(adj.b);

        if (!roomA || !roomB) return null;

        const centerA = {
          x: (roomA.x + roomA.width / 2) * cellSize,
          y: (roomA.y + roomA.height / 2) * cellSize,
        };
        const centerB = {
          x: (roomB.x + roomB.width / 2) * cellSize,
          y: (roomB.y + roomB.height / 2) * cellSize,
        };

        return (
          <Line
            key={`adj-${index}`}
            points={[
              [centerA.x, centerA.y, 0.2],
              [centerB.x, centerB.y, 0.2],
            ]}
            color="rgba(92, 92, 92, 0.6)"
            lineWidth={2}
            dashed={true}
            dashSize={5}
            gapSize={5}
          />
        );
      })}

      {/* Render start point marker */}
      {showStartPoint && startPoint && (
        <mesh position={[(startPoint.x + 0.5) * cellSize, (startPoint.y + 0.5) * cellSize, 0.2]}>
          <circleGeometry args={[cellSize * 0.4, 32]} />
          <meshBasicMaterial color="red" />
        </mesh>
      )}

      {/* Render room labels */}
      {placedRooms && Array.from(placedRooms.values()).map((room) => {
        const centerX = (room.x + room.width / 2) * cellSize;
        const centerY = (room.y + room.height / 2) * cellSize;

        return (
          <Text
            key={`label-${room.id}`}
            position={[centerX, centerY, 0.3]}
            fontSize={12}
            color="black"
            anchorX="center"
            anchorY="middle"
            renderOrder={1}
          >
            {room.id}
          </Text>
        );
      })}
    </>
  );
};
