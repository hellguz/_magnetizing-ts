import React from "react";
import { EvolutionaryGene } from "../core/solvers/EvolutionaryGene.js";
import { Vec2 } from "../core/geometry/Vector2.js";

interface PopulationGrid3DProps {
  population: EvolutionaryGene[];
  boundary: Vec2[];
  onSelectVariant?: (index: number) => void;
}

/**
 * Renders a 5×5 grid showing all 25 population variants with fitness scores.
 * Each grid cell displays a simplified floorplan with fitness overlay.
 */
export const PopulationGrid3D: React.FC<PopulationGrid3DProps> = ({
  population,
  boundary,
  onSelectVariant,
}) => {
  // Room colors for visualization
  const getRoomColor = (index: number): string => {
    const colors = [
      "#ff6b6b",
      "#4ecdc4",
      "#45b7d1",
      "#f9ca24",
      "#6c5ce7",
      "#fd79a8",
      "#fdcb6e",
      "#e17055",
      "#74b9ff",
      "#a29bfe",
      "#55efc4",
      "#ffeaa7",
      "#fab1a0",
      "#ff7675",
      "#dfe6e9",
    ];
    return colors[index % colors.length];
  };

  // Calculate boundary bounds for camera positioning
  const getBoundaryBounds = () => {
    if (boundary.length === 0)
      return { minX: 0, maxX: 100, minY: 0, maxY: 100 };

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const p of boundary) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    return { minX, maxX, minY, maxY };
  };

  const bounds = getBoundaryBounds();
  const range = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gridAutoRows: "auto",
        gap: "12px",
        padding: "16px",
        background: "#f5f5f5",
        boxSizing: "border-box",
      }}
    >
      {population.map((gene, index) => (
        <div
          key={index}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "1",
            border: index === 0 ? "2px solid #4CAF50" : "1px solid #ccc",
            borderRadius: "4px",
            background: "#fff",
            cursor: "pointer",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
          onClick={() => onSelectVariant?.(index)}
          title={`Variant #${index + 1}\nFitness: ${gene.fitness.toFixed(
            2
          )}\nShared Wall: ${gene.fitnessSharedWall.toFixed(
            2
          )}\nGeometric: ${gene.fitnessG.toFixed(2)}`}
        >
          {/* Fitness score overlay */}
          {/* <div
            style={{
              position: "absolute",
              top: "4px",
              left: "4px",
              fontSize: "10px",
              fontWeight: "bold",
              background:
                index === 0 ? "rgba(76,175,80,0.9)" : "rgba(255,255,255,0.9)",
              color: index === 0 ? "#fff" : "#000",
              padding: "2px 4px",
              borderRadius: "2px",
              zIndex: 10,
              fontFamily: "monospace",
              lineHeight: "1.2",
            }}
          >
            #{index + 1}
            <br />
            {gene.fitness.toFixed(1)}
          </div> */}

          {/* Simple SVG-based rendering (no Three.js needed for grid cells) */}
          <svg
            width="100%"
            height="100%"
            viewBox={`${bounds.minX - range * 0.1} ${
              bounds.minY - range * 0.1
            } ${range * 1.2} ${range * 1.2}`}
            style={{ display: "block" }}
          >
            <g transform={`scale(1, -1) translate(0, ${-(bounds.minY + bounds.maxY)})`}>
              {/* Boundary */}
              <polygon
                points={boundary.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="#ff0000"
                strokeWidth={range * 0.01}
                strokeDasharray={`${range * 0.02},${range * 0.01}`}
              />

              {/* Rooms */}
              {gene.rooms.map((room, roomIndex) => (
                <g key={roomIndex}>
                  <rect
                    x={room.x}
                    y={room.y}
                    width={room.width}
                    height={room.height}
                    fill={getRoomColor(roomIndex)}
                    stroke="#333"
                    strokeWidth={range * 0.005}
                    opacity={0.8}
                  />
                </g>
              ))}
            </g>
          </svg>
        </div>
      ))}
    </div>
  );
};
