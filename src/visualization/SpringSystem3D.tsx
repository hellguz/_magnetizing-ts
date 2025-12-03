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

  // Hotel - Corridors (gray tones)
  'corridor-1': '#808080',
  'corridor-2': '#808080',
  'corridor-3': '#808080',
  'corridor-4': '#808080',
  'corridor-5': '#808080',
  'corridor-6': '#808080',

  // Hotel - Floor 1 apartments (light blue)
  'apt-1-1': '#87ceeb', 'apt-1-2': '#87ceeb', 'apt-1-3': '#87ceeb', 'apt-1-4': '#87ceeb', 'apt-1-5': '#87ceeb',
  'apt-1-6': '#87ceeb', 'apt-1-7': '#87ceeb', 'apt-1-8': '#87ceeb', 'apt-1-9': '#87ceeb', 'apt-1-10': '#87ceeb',

  // Hotel - Floor 2 apartments (light coral)
  'apt-2-1': '#f08080', 'apt-2-2': '#f08080', 'apt-2-3': '#f08080', 'apt-2-4': '#f08080', 'apt-2-5': '#f08080',
  'apt-2-6': '#f08080', 'apt-2-7': '#f08080', 'apt-2-8': '#f08080', 'apt-2-9': '#f08080', 'apt-2-10': '#f08080',

  // Hotel - Floor 3 apartments (light green)
  'apt-3-1': '#90ee90', 'apt-3-2': '#90ee90', 'apt-3-3': '#90ee90', 'apt-3-4': '#90ee90', 'apt-3-5': '#90ee90',
  'apt-3-6': '#90ee90', 'apt-3-7': '#90ee90', 'apt-3-8': '#90ee90', 'apt-3-9': '#90ee90', 'apt-3-10': '#90ee90',

  // Hotel - Floor 4 apartments (light yellow)
  'apt-4-1': '#ffffe0', 'apt-4-2': '#ffffe0', 'apt-4-3': '#ffffe0', 'apt-4-4': '#ffffe0', 'apt-4-5': '#ffffe0',
  'apt-4-6': '#ffffe0', 'apt-4-7': '#ffffe0', 'apt-4-8': '#ffffe0', 'apt-4-9': '#ffffe0', 'apt-4-10': '#ffffe0',

  // Hotel - Floor 5 apartments (light pink)
  'apt-5-1': '#ffb6c1', 'apt-5-2': '#ffb6c1', 'apt-5-3': '#ffb6c1', 'apt-5-4': '#ffb6c1', 'apt-5-5': '#ffb6c1',
  'apt-5-6': '#ffb6c1', 'apt-5-7': '#ffb6c1', 'apt-5-8': '#ffb6c1', 'apt-5-9': '#ffb6c1', 'apt-5-10': '#ffb6c1',

  // Hotel - Floor 6 apartments (lavender)
  'apt-6-1': '#e6e6fa', 'apt-6-2': '#e6e6fa', 'apt-6-3': '#e6e6fa', 'apt-6-4': '#e6e6fa', 'apt-6-5': '#e6e6fa',
  'apt-6-6': '#e6e6fa', 'apt-6-7': '#e6e6fa', 'apt-6-8': '#e6e6fa', 'apt-6-9': '#e6e6fa', 'apt-6-10': '#e6e6fa',
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
