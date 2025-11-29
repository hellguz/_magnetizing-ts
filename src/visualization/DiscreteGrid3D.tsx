import React, { useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { GridBuffer } from '../core/grid/GridBuffer.js';
import { CELL_EMPTY, CELL_OUT_OF_BOUNDS, CELL_CORRIDOR } from '../constants.js';

interface DiscreteGrid3DProps {
  grid: GridBuffer;
  cellSize: number;
}

/**
 * Efficiently renders a discrete grid using InstancedMesh.
 * Each cell is rendered as a small plane with a gap to simulate grid lines.
 */
export const DiscreteGrid3D: React.FC<DiscreteGrid3DProps> = ({ grid, cellSize }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = new THREE.Object3D();
  const tempColor = new THREE.Color();

  // Color map matching the original canvas renderer
  const roomColors = new Map<number, string>([
    [CELL_EMPTY, '#ffffff'],
    [CELL_OUT_OF_BOUNDS, '#000000'],
    [CELL_CORRIDOR, '#e8e8e8'],
    [1, '#ff6b6b'],
    [2, '#4ecdc4'],
    [3, '#45b7d1'],
    [4, '#f7b731'],
    [5, '#5f27cd'],
    [6, '#a29bfe'],
    [7, '#fd79a8'],
    [8, '#fdcb6e'],
  ]);

  useLayoutEffect(() => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    const count = grid.width * grid.height;

    // Update each instance's position and color
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const i = y * grid.width + x;
        const cellValue = grid.get(x, y);

        // Calculate position (center each cell)
        const posX = x * cellSize;
        const posY = y * cellSize;

        tempObject.position.set(posX, posY, 0);
        tempObject.updateMatrix();

        // Set instance matrix
        mesh.setMatrixAt(i, tempObject.matrix);

        // Set instance color
        const colorHex = roomColors.get(cellValue) || '#cccccc';
        tempColor.set(colorHex);
        mesh.setColorAt(i, tempColor);
      }
    }

    // Mark for update
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [grid, cellSize]);

  const count = grid.width * grid.height;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      {/* Plane geometry with 0.9 scale creates gaps simulating grid lines */}
      <planeGeometry args={[cellSize * 0.9, cellSize * 0.9]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
};
