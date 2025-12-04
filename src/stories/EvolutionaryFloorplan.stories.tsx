import React, { useRef, useState, useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Canvas } from "@react-three/fiber";
import { SceneContainer } from "../visualization/SceneContainer.js";
import { SpringSystem3D } from "../visualization/SpringSystem3D.js";
import { PopulationGrid3D } from "../visualization/PopulationGrid3D.js";
import { BoundaryEditor } from "../visualization/BoundaryEditor.js";
import { EvolutionaryFloorplanSolver } from "../core/solvers/EvolutionaryFloorplanSolver.js";
import { EvolutionaryGene } from "../core/solvers/EvolutionaryGene.js";
import { Vec2 } from "../core/geometry/Vector2.js";
import {
  evolutionaryTemplates,
  scaleBoundaryToRoomArea,
  scaleBoundary,
  calculateCentroid,
} from "./templates/evolutionaryTemplates.js";
import {
  evolutionaryDefaults,
  type EvolutionaryVisualizationArgs,
} from "./configs/evolutionaryDefaults.js";

// Evolutionary Floorplan Solver Story Component
const EvolutionaryFloorplanVisualization: React.FC<
  EvolutionaryVisualizationArgs
> = (args) => {
  const solverRef = useRef<EvolutionaryFloorplanSolver | null>(null);
  const scaledBoundaryRef = useRef<Vec2[]>([]);
  const initialCameraTargetRef = useRef<[number, number, number]>([0, 0, 0]);
  const [editableBoundary, setEditableBoundary] = useState<Vec2[]>([]);

  // State for tracking population snapshots (for grid view)
  const [populationSnapshot, setPopulationSnapshot] = useState<
    EvolutionaryGene[]
  >([]);

  // Trigger re-renders for info display
  const [, setStatsUpdate] = useState(0);

  // Track solver version to restart animation loop when solver is recreated
  const [solverVersion, setSolverVersion] = useState(0);

  // LOOP CONTROL STATE
  const [loopPhase, setLoopPhase] = useState<"evolution" | "physics">(
    "evolution"
  );
  const [physicsCounter, setPhysicsCounter] = useState(0);

  // Initialize boundary and camera when template or boundary scale changes
  useEffect(() => {
    const template = evolutionaryTemplates[args.template];
    const { boundary: templateBoundary, rooms } = template;

    // Scale boundary based on auto-scaling toggle
    const boundary = args.autoScaleBoundary
      ? scaleBoundaryToRoomArea(templateBoundary, rooms, args.boundaryScale)
      : scaleBoundary(templateBoundary, args.boundaryScale);

    scaledBoundaryRef.current = boundary;
    setEditableBoundary(boundary);

    // Set initial camera target
    const centroid = calculateCentroid(boundary);
    initialCameraTargetRef.current = [centroid.x, centroid.y, 0];
  }, [args.template, args.boundaryScale, args.autoScaleBoundary]);

  // Recreate solver when parameters change
  useEffect(() => {
    const template = evolutionaryTemplates[args.template];
    const { rooms, adjacencies } = template;
    const currentBoundary = args.editBoundary
      ? editableBoundary
      : scaledBoundaryRef.current;

    // Convert RoomState to RoomStateES (add targetArea and pressure fields)
    const roomsES = rooms.map((room) => ({
      ...room,
      targetArea: room.width * room.height,
      pressureX: 0,
      pressureY: 0,
      accumulatedPressureX: 0,
      accumulatedPressureY: 0,
    }));

    // Create new solver
    solverRef.current = new EvolutionaryFloorplanSolver(
      roomsES,
      currentBoundary,
      adjacencies,
      {
        populationSize: 25,
        maxGenerations: 100,
        physicsIterations: 10,
        sharedWallTarget: args.sharedWallTarget,
        sharedWallWeight: args.sharedWallWeight,
        geometricWeight: args.geometricWeight,
        areaDeviationWeight: args.areaDeviationWeight,
        teleportProbability: args.teleportProbability,
        swapProbability: args.swapProbability,
        rotationProbability: args.rotationProbability,
        maxAspectRatio: args.maxAspectRatio,
        useNonLinearOverlapPenalty: args.useNonLinearOverlapPenalty,
        overlapPenaltyExponent: args.overlapPenaltyExponent,
      },
      args.globalTargetRatio
    );
    // Increment version to signal solver reset
    setSolverVersion((v) => v + 1);
    setLoopPhase("evolution");
    setPhysicsCounter(0);
  }, [
    args.template,
    args.sharedWallTarget,
    args.sharedWallWeight,
    args.geometricWeight,
    args.areaDeviationWeight,
    args.teleportProbability,
    args.swapProbability,
    args.rotationProbability,
    args.maxAspectRatio,
    args.autoScaleBoundary,
    args.boundaryScale,
    args.globalTargetRatio,
    args.useNonLinearOverlapPenalty,
    args.overlapPenaltyExponent,
    args.editBoundary,
    editableBoundary,
  ]);

  // NEW: Granular Animation Loop (Dynamics Visualization)
  useEffect(() => {
    if (!args.autoPlay || !solverRef.current) return;

    // Calculate speed (frames per second approx)
    // Higher animationSpeed = faster intervals
    const intervalMs = Math.max(16, 100 / args.animationSpeed);

    const interval = setInterval(() => {
      if (!solverRef.current || solverRef.current.hasReachedMaxGenerations())
        return;

      if (loopPhase === "evolution") {
        // Run genetic operators: Selection, Duplication, Mutation
        solverRef.current.stepEvolution();

        // Reset physics counter and switch phase
        setPhysicsCounter(0);
        setLoopPhase("physics");
        setStatsUpdate((s) => s + 1);
      } else {
        // Run ONE physics step (squish, attract, translate)
        solverRef.current.stepPhysics();

        // Increment counter
        const nextCount = physicsCounter + 1;
        setPhysicsCounter(nextCount);
        setStatsUpdate((s) => s + 1);

        // If we've done enough physics steps, go back to evolution
        // Default was 10, but we can make this smoother or strictly follow config
        if (nextCount >= 10) {
          setLoopPhase("evolution");
        }
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [
    args.autoPlay,
    args.animationSpeed,
    solverVersion,
    loopPhase,
    physicsCounter,
  ]);

  // Update population snapshot for grid (throttled)
  useEffect(() => {
    const interval = setInterval(() => {
      if (solverRef.current) {
        setPopulationSnapshot([...solverRef.current.getPopulation()]);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [solverVersion]);

  // Handle boundary changes from editor
  const handleBoundaryChange = (newBoundary: Vec2[]) => {
    setEditableBoundary(newBoundary);
    scaledBoundaryRef.current = newBoundary;
  };

  const stats = solverRef.current?.getStats();
  const template = evolutionaryTemplates[args.template];
  const currentBoundary = args.editBoundary
    ? editableBoundary
    : scaledBoundaryRef.current;

  return (
    <div style={{ display: "flex", width: "100%", height: "100vh" }}>
      {/* Main View - 60% */}
      <div
        style={{
          width: args.showPopulationGrid ? "60%" : "100%",
          position: "relative",
        }}
      >
        <Canvas>
          <SceneContainer zoom={1} target={initialCameraTargetRef.current}>
            {solverRef.current && (
              <SpringSystem3D
                solverRef={solverRef as any}
                adjacencies={template.adjacencies}
                boundary={currentBoundary}
                showAdjacencies={args.showAdjacencies}
                showBoundary={!args.editBoundary && args.showBoundary}
              />
            )}
            {args.editBoundary && (
              <BoundaryEditor
                points={editableBoundary}
                onChange={handleBoundaryChange}
                editable={true}
              />
            )}
          </SceneContainer>
        </Canvas>

        {/* Info Overlay */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            background: "rgba(255,255,255,0.95)",
            padding: "12px",
            borderRadius: "6px",
            fontFamily: "monospace",
            fontSize: "13px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            lineHeight: "1.6",
          }}
        >
          <strong style={{ fontSize: "14px", color: "#2196F3" }}>
            Evolutionary Floorplan Solver
          </strong>
          <br />
          Generation: <strong>{stats?.generation || 0}</strong> / 100
          <br />
          Phase:{" "}
          <strong
            style={{ color: loopPhase === "physics" ? "#FF5722" : "#4CAF50" }}
          >
            {loopPhase.toUpperCase()}
          </strong>{" "}
          ({physicsCounter}/10)
          <br />
          Best Fitness:{" "}
          <strong>{stats?.bestFitness.toFixed(2) || "0.00"}</strong>
          <br />
          Avg Fitness: <strong>{stats?.avgFitness.toFixed(2) || "0.00"}</strong>
          <br />
          <br />
          <span style={{ fontSize: "11px", color: "#666" }}>
            Fitness Components (Best):
          </span>
          <br />
          <span style={{ fontSize: "11px" }}>
            &nbsp;&nbsp;Shared Wall:{" "}
            {stats?.bestFitnessSharedWall.toFixed(2) || "0.00"}
          </span>
          <br />
          <span style={{ fontSize: "11px" }}>
            &nbsp;&nbsp;Geometric: {stats?.bestFitnessG.toFixed(2) || "0.00"}
          </span>
          <br />
          <span style={{ fontSize: "11px" }}>
            &nbsp;&nbsp;Area: {stats?.bestFitnessArea.toFixed(2) || "0.00"}
          </span>
          <br />
          <br />
          <span style={{ fontSize: "11px", color: "#666" }}>
            Population: 25 variants
          </span>
        </div>

        {/* Status indicator */}
        {solverRef.current?.hasReachedMaxGenerations() && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              background: "rgba(76,175,80,0.95)",
              color: "#fff",
              padding: "8px 12px",
              borderRadius: "4px",
              fontFamily: "sans-serif",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            ✓ Evolution Complete
          </div>
        )}
      </div>

      {/* Grid View - 40% */}
      {args.showPopulationGrid && (
        <div
          style={{ width: "40%", background: "#f0f0f0", overflow: "hidden" }}
        >
          <div style={{ height: "100%", overflow: "auto" }}>
            <PopulationGrid3D
              population={populationSnapshot}
              boundary={currentBoundary}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Storybook Meta
const meta: Meta<EvolutionaryVisualizationArgs> = {
  title: "Evolutionary Floorplan",
  component: EvolutionaryFloorplanVisualization,
  argTypes: {
    // Template
    template: {
      control: { type: "select" },
      options: [
        "small-apartment",
        "office-suite",
        "house",
        "large-house",
        "gallery",
        "clinic",
        "restaurant",
        "howoge-1-room",
        "howoge-2-room",
        "howoge-3-room",
        "howoge-4-room",
        "howoge-5-room",
      ],
      description: "Floorplan template (excludes palace and hotel)",
    },

    // Mutation operators
    teleportProbability: {
      control: { type: "range", min: 0.0, max: 1.0, step: 0.1 },
      description: "Weight for teleport mutation (random repositioning)",
    },
    swapProbability: {
      control: { type: "range", min: 0.0, max: 1.0, step: 0.1 },
      description: "Weight for swap mutation (2-4 rooms exchange positions)",
    },
    rotationProbability: {
      control: { type: "range", min: 0.0, max: 1.0, step: 0.1 },
      description:
        "Weight for rotation mutation (rotate entire floorplan 25°-335°)",
    },

    // Physics
    maxAspectRatio: {
      control: { type: "range", min: 1.0, max: 5.0, step: 0.1 },
      description: "Maximum room aspect ratio (width/height)",
    },

    // Fitness weights
    sharedWallTarget: {
      control: { type: "range", min: 0.0, max: 10.0, step: 0.1 },
      description: "Target minimum shared wall length (meters in scene units)",
    },
    sharedWallWeight: {
      control: { type: "range", min: 1, max: 2000, step: 50 },
      description: "Priority multiplier for shared wall constraint",
    },
    geometricWeight: {
      control: { type: "range", min: 1, max: 100, step: 5 },
      description: "Weight for geometric penalties (overlap + out-of-bounds)",
    },
    areaDeviationWeight: {
      control: { type: "range", min: 1, max: 100, step: 5 },
      description: "Weight for room area deviation from target",
    },

    // Visualization
    showPopulationGrid: {
      control: { type: "boolean" },
      description: "Show 5×5 grid of all 25 variants",
    },
    autoPlay: {
      control: { type: "boolean" },
      description: "Automatically evolve through generations",
    },
    animationSpeed: {
      control: { type: "range", min: 0.1, max: 5.0, step: 0.1 },
      description: "Generations per second",
    },
    showAdjacencies: {
      control: { type: "boolean" },
      description: "Show adjacency connections between rooms",
    },
    showBoundary: {
      control: { type: "boolean" },
      description: "Show boundary polygon",
    },

    // Boundary
    editBoundary: {
      control: { type: "boolean" },
      description:
        "Enable interactive boundary editing (drag vertices, click midpoints to add)",
    },
    autoScaleBoundary: {
      control: { type: "boolean" },
      description: "Auto-scale boundary area to match sum of room areas",
    },
    boundaryScale: {
      control: { type: "range", min: 0.5, max: 2.0, step: 0.05 },
      description: "Manual boundary scale factor",
    },
    globalTargetRatio: {
      control: { type: "range", min: 1.0, max: 5.0, step: 0.1 },
      description: "Global aspect ratio constraint for all rooms",
    },

    // Advanced
    useNonLinearOverlapPenalty: {
      control: { type: "boolean" },
      description: "Apply non-linear penalty to overlaps",
    },
    overlapPenaltyExponent: {
      control: { type: "range", min: 1.0, max: 3.0, step: 0.1 },
      description:
        "Exponent for overlap penalty (1.0 = linear, 2.0 = quadratic)",
    },
  },
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

type Story = StoryObj<EvolutionaryVisualizationArgs>;

// Default Story
export const Default: Story = {
  args: evolutionaryDefaults,
};
// Story with Grid View Hidden
export const MainViewOnly: Story = {
  args: {
    ...evolutionaryDefaults,
    showPopulationGrid: false,
  },
};
// Story with Faster Animation
export const FastEvolution: Story = {
  args: {
    ...evolutionaryDefaults,
    animationSpeed: 5.0,
  },
};
// Story with Emphasis on Shared Walls
export const SharedWallFocus: Story = {
  args: {
    ...evolutionaryDefaults,
    sharedWallWeight: 2000,
    geometricWeight: 5,
    areaDeviationWeight: 10,
  },
};
// Story with More Geometric Constraints
export const GeometricFocus: Story = {
  args: {
    ...evolutionaryDefaults,
    sharedWallWeight: 500,
    geometricWeight: 50,
    areaDeviationWeight: 30,
  },
};
