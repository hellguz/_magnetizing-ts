import React, { ReactNode } from 'react';
import { OrthographicCamera, MapControls } from '@react-three/drei';

interface SceneContainerProps {
  children: ReactNode;
  zoom?: number;
  target?: [number, number, number];
}

/**
 * Shared scene infrastructure for both discrete and spring solvers.
 * Provides orthographic camera, map controls, lighting, and background.
 */
export const SceneContainer: React.FC<SceneContainerProps> = ({
  children,
  zoom = 200,
  target = [0, 0, 0]
}) => {
  return (
    <>
      {/* Orthographic camera looking down Z-axis */}
      <OrthographicCamera
        makeDefault
        position={[target[0], target[1], 100]}
        zoom={zoom}
        near={0.1}
        far={1000}
      />

      {/* Map controls - optimized for 2D top-down view */}
      <MapControls
        enableRotate={false}
        screenSpacePanning={true}
        dampingFactor={0.1}
        enableDamping={true}
        target={target}
      />

      {/* Flat, even lighting for floor plans */}
      <ambientLight intensity={1.0} />

      {/* White background */}
      <color attach="background" args={['#ffffff']} />

      {/* Render children (grid or rooms) */}
      {children}
    </>
  );
};
