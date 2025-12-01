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

  // Palace - Grand Public Spaces (gold/royal tones)
  'grand-entrance': '#ffd700',
  'main-throne': '#ff8c00',
  'lesser-throne': '#ffb347',
  'grand-ballroom': '#ffa07a',
  'small-ballroom': '#ffcccb',

  // Palace - Royal Private Quarters (purple/magenta tones)
  'king-chamber': '#9370db',
  'queen-chamber': '#da70d6',
  'prince-chamber-1': '#ba55d3',
  'prince-chamber-2': '#9932cc',
  'princess-chamber': '#ee82ee',

  // Palace - Royal Studies & Libraries (brown/tan tones)
  'royal-study': '#d2691e',
  'royal-library': '#cd853f',
  'royal-archives': '#deb887',

  // Palace - Dining & Kitchen Areas (warm red/orange tones)
  'grand-dining': '#dc143c',
  'formal-dining': '#ff6347',
  'breakfast-room': '#ff7f50',
  'main-kitchen': '#e9967a',
  'secondary-kitchen': '#f08080',
  'pantry': '#fa8072',
  'wine-cellar': '#8b0000',

  // Palace - Galleries & Art Spaces (light blue/gray tones)
  'great-gallery': '#b0c4de',
  'portrait-gallery': '#add8e6',

  // Palace - Religious Spaces (white/cream tones)
  'chapel': '#fffacd',
  'prayer-room': '#fff8dc',

  // Palace - Administrative & Strategic (dark blue tones)
  'treasury': '#4682b4',
  'war-room': '#191970',
  'council-chamber': '#4169e1',

  // Palace - Guard Rooms & Security (green/military tones)
  'guard-north': '#556b2f',
  'guard-south': '#6b8e23',
  'guard-east': '#808000',
  'guard-west': '#9acd32',
  'armory': '#2f4f4f',

  // Palace - Guest & Servant Areas (teal/cyan tones)
  'guest-chamber-1': '#48d1cc',
  'guest-chamber-2': '#40e0d0',
  'guest-chamber-3': '#00ced1',
  'servant-hall': '#5f9ea0',
  'servant-quarters': '#20b2aa',

  // Palace - Courtyards & Gardens (vibrant green tones)
  'garden-court': '#32cd32',
  'fountain-court': '#7fffd4',
  'grand-terrace': '#98fb98',
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
          color="#2c2c2cff"
          lineWidth={3}
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
            color="rgba(117, 117, 117, 1)"
            lineWidth={1}
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
