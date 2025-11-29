import React from 'react';
import { Text, Edges, Line } from '@react-three/drei';
import { RoomState, Adjacency } from '../types.js';
import { Vec2 } from '../core/geometry/Vector2.js';

interface SpringSystem3DProps {
  rooms: RoomState[];
  adjacencies: Adjacency[];
  boundary?: Vec2[];
  showAdjacencies?: boolean;
  showBoundary?: boolean;
}

// Color map matching the original canvas renderer
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

/**
 * Renders rooms as 3D boxes with labels and adjacency connections.
 */
export const SpringSystem3D: React.FC<SpringSystem3DProps> = ({
  rooms,
  adjacencies,
  boundary,
  showAdjacencies = true,
  showBoundary = true
}) => {
  return (
    <>
      {/* Render boundary */}
      {showBoundary && boundary && boundary.length > 0 && (
        <Line
          points={[...boundary.map(p => [p.x, p.y, 0]), [boundary[0].x, boundary[0].y, 0]]}
          color="red"
          lineWidth={3}
          dashed={true}
          dashSize={10}
          gapSize={5}
        />
      )}

      {/* Render adjacency lines */}
      {showAdjacencies && adjacencies.map((adj, index) => {
        const roomA = rooms.find((r) => r.id === adj.a);
        const roomB = rooms.find((r) => r.id === adj.b);

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
          <Line
            key={`adj-${index}`}
            points={[
              [centerA.x, centerA.y, 0],
              [centerB.x, centerB.y, 0],
            ]}
            color="red"
            lineWidth={2}
            dashed={true}
            dashSize={5}
            gapSize={5}
          />
        );
      })}

      {/* Render rooms */}
      {rooms.map((room) => {
        const color = roomColors[room.id] || '#cccccc';
        const centerX = room.x + room.width / 2;
        const centerY = room.y + room.height / 2;

        return (
          <group key={room.id}>
            {/* Room box */}
            <mesh position={[centerX, centerY, 0]}>
              <boxGeometry args={[room.width, room.height, 1]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.8}
              />
              {/* Black border edges */}
              <Edges color="black" />
            </mesh>

            {/* Room label */}
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
          </group>
        );
      })}
    </>
  );
};
