import React, { useRef, useState, useCallback } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Canvas } from "@react-three/fiber";
import { SceneContainer } from "../visualization/SceneContainer.js";
import { SpringSystem3D } from "../visualization/SpringSystem3D.js";
import { BoundaryEditor } from "../visualization/BoundaryEditor.js";
import { SpringSolver } from "../core/solvers/SpringSolver.js";
import { Vec2 } from "../core/geometry/Vector2.js";
import { springTemplates, m2, type SpringTemplate, type SpringTemplateType } from './templates/springTemplates.js';
import { springSolverDefaults, type SpringVisualizationArgs } from './configs/springSolverDefaults.js';

// Spring Solver Story Component
const SpringSolverVisualization: React.FC<SpringVisualizationArgs> = (args) => {
  const solverRef = useRef<SpringSolver | null>(null);
  const scaledBoundaryRef = useRef<Vec2[]>([]);
  const animationIdRef = useRef<number | null>(null);
  const templateRef = useRef<SpringTemplate | null>(null);
  const [editableBoundary, setEditableBoundary] = useState<Vec2[]>([]);
  const initialCameraTargetRef = useRef<[number, number, number]>([0, 0, 0]);
  // Trigger re-renders for info display (statsUpdate not read directly, just used as dependency)
  const [, setStatsUpdate] = useState(0);
  // Track solver version to restart animation loop when solver is recreated
  const [solverVersion, setSolverVersion] = useState(0);

  // Helper: Calculate centroid of a polygon
  const calculateCentroid = useCallback((points: Vec2[]) => {
    let x = 0,
      y = 0;
    for (const p of points) {
      x += p.x;
      y += p.y;
    }
    return { x: x / points.length, y: y / points.length };
  }, []);

  // Helper: Calculate area of a polygon using shoelace formula
  const calculatePolygonArea = useCallback((points: Vec2[]) => {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area / 2);
  }, []);

  // Helper: Calculate total area of all rooms
  const calculateTotalRoomArea = useCallback((rooms: RoomState[]) => {
    return rooms.reduce((sum, room) => sum + room.width * room.height, 0);
  }, []);

  // Initialize boundary when template or boundary scale changes
  React.useEffect(() => {
    const template = springTemplates[args.template];
    templateRef.current = template;
    const { boundary: templateBoundary, rooms } = template;

    // Calculate the scale factor to match boundary area with total room area
    const totalRoomArea = calculateTotalRoomArea(rooms);
    const templateBoundaryArea = calculatePolygonArea(templateBoundary);
    const areaScale = Math.sqrt(totalRoomArea / templateBoundaryArea);

    // Apply boundary scaling towards centroid (area-based scale + manual scale)
    const centroid = calculateCentroid(templateBoundary);

    const combinedScale = areaScale * args.boundaryScale;
    const boundary = templateBoundary.map((p) => ({
      x: centroid.x + (p.x - centroid.x) * combinedScale,
      y: centroid.y + (p.y - centroid.y) * combinedScale,
    }));

    scaledBoundaryRef.current = boundary;
    setEditableBoundary(boundary);

    // Set initial camera target (only when template/scale changes)
    const centerX = boundary.reduce((sum, p) => sum + p.x, 0) / boundary.length;
    const centerY = boundary.reduce((sum, p) => sum + p.y, 0) / boundary.length;
    initialCameraTargetRef.current = [centerX, centerY, 0];
  }, [
    args.template,
    args.boundaryScale,
    calculateCentroid,
    calculatePolygonArea,
    calculateTotalRoomArea,
  ]);

  // Recreate solver when solver parameters or template change
  React.useEffect(() => {
    const template = templateRef.current;
    if (!template) return;

    const { rooms, adjacencies } = template;
    const currentBoundary = scaledBoundaryRef.current;

    // Cancel any running animation before creating new solver
    if (animationIdRef.current !== null) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    // Clear old solver reference
    solverRef.current = null;

    // Create new solver
    solverRef.current = new SpringSolver(
      rooms,
      currentBoundary,
      adjacencies,
      {
        populationSize: args.populationSize,
        maxGenerations: 1000,
        mutationRate: args.mutationRate,
        mutationStrength: args.mutationStrength,
        crossoverRate: 0.5,
        selectionPressure: args.selectionPressure,
        fitnessBalance: args.fitnessBalance,
        aspectRatioMutationRate: args.aspectRatioMutationRate,
        useQuadraticPenalty: true,
        usePartnerBias: true,
        partnerBiasRate: 0.8,
        useSwapMutation: args.useSwapMutation,
        swapMutationRate: args.swapMutationRate,
        useAggressiveInflation: args.useAggressiveInflation,
        inflationRate: args.inflationRate,
        inflationThreshold: args.inflationThreshold,
        warmUpIterations: args.warmUpIterations,
        useFreshBlood: args.useFreshBlood,
        freshBloodInterval: args.freshBloodInterval,
        freshBloodWarmUp: args.freshBloodWarmUp,
        useNonLinearOverlapPenalty: args.useNonLinearOverlapPenalty,
        overlapPenaltyExponent: args.overlapPenaltyExponent,
      },
      args.globalTargetRatio
    );

    // Increment version to signal solver reset and restart animation loop
    setSolverVersion((v) => v + 1);
  }, [
    args.template,
    args.populationSize,
    args.mutationRate,
    args.mutationStrength,
    args.selectionPressure,
    args.fitnessBalance,
    args.aspectRatioMutationRate,
    args.globalTargetRatio,
    args.useSwapMutation,
    args.swapMutationRate,
    args.useAggressiveInflation,
    args.inflationRate,
    args.inflationThreshold,
    args.warmUpIterations,
    args.useFreshBlood,
    args.freshBloodInterval,
    args.freshBloodWarmUp,
    args.useNonLinearOverlapPenalty,
    args.overlapPenaltyExponent,
  ]);

  // Handle boundary changes from editor
  const handleBoundaryChange = useCallback(
    (newPoints: Vec2[]) => {
      setEditableBoundary(newPoints);
      scaledBoundaryRef.current = newPoints;

      const template = templateRef.current;
      if (!template) return;

      const { rooms, adjacencies } = template;

      // Cancel any running animation before creating new solver
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }

      // Clear old solver reference
      solverRef.current = null;

      // Recreate solver with new boundary
      solverRef.current = new SpringSolver(
        rooms,
        newPoints,
        adjacencies,
        {
          populationSize: args.populationSize,
          maxGenerations: 1000,
          mutationRate: args.mutationRate,
          mutationStrength: args.mutationStrength,
          crossoverRate: 0.5,
          selectionPressure: args.selectionPressure,
          fitnessBalance: args.fitnessBalance,
          aspectRatioMutationRate: args.aspectRatioMutationRate,
          useQuadraticPenalty: true,
          usePartnerBias: true,
          partnerBiasRate: 0.4,
          useSwapMutation: args.useSwapMutation,
          swapMutationRate: args.swapMutationRate,
          useAggressiveInflation: args.useAggressiveInflation,
          inflationRate: args.inflationRate,
          inflationThreshold: args.inflationThreshold,
          warmUpIterations: args.warmUpIterations,
          useFreshBlood: args.useFreshBlood,
          freshBloodInterval: args.freshBloodInterval,
          freshBloodWarmUp: args.freshBloodWarmUp,
          useNonLinearOverlapPenalty: args.useNonLinearOverlapPenalty,
          overlapPenaltyExponent: args.overlapPenaltyExponent,
        },
        args.globalTargetRatio
      );

      // Increment version to signal solver reset and restart animation loop
      setSolverVersion((v) => v + 1);
    },
    [
      args.template,
      args.populationSize,
      args.mutationRate,
      args.mutationStrength,
      args.selectionPressure,
      args.fitnessBalance,
      args.aspectRatioMutationRate,
      args.globalTargetRatio,
      args.useSwapMutation,
      args.swapMutationRate,
      args.useAggressiveInflation,
      args.inflationRate,
      args.inflationThreshold,
      args.warmUpIterations,
      args.useFreshBlood,
      args.freshBloodInterval,
      args.freshBloodWarmUp,
      args.useNonLinearOverlapPenalty,
      args.overlapPenaltyExponent,
    ]
  );

  // Handle reset generation
  const handleReset = useCallback(() => {
    const template = templateRef.current;
    if (!template) return;

    const { rooms, adjacencies } = template;
    const currentBoundary = scaledBoundaryRef.current;

    // Cancel any running animation before creating new solver
    if (animationIdRef.current !== null) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    // Clear old solver reference
    solverRef.current = null;

    // Recreate solver with current parameters and boundary
    solverRef.current = new SpringSolver(
      rooms,
      currentBoundary,
      adjacencies,
      {
        populationSize: args.populationSize,
        maxGenerations: 1000,
        mutationRate: args.mutationRate,
        mutationStrength: args.mutationStrength,
        crossoverRate: 0.5,
        selectionPressure: args.selectionPressure,
        fitnessBalance: args.fitnessBalance,
        aspectRatioMutationRate: args.aspectRatioMutationRate,
        useQuadraticPenalty: true,
        usePartnerBias: true,
        partnerBiasRate: 0.4,
        useSwapMutation: args.useSwapMutation,
        swapMutationRate: args.swapMutationRate,
        useAggressiveInflation: args.useAggressiveInflation,
        inflationRate: args.inflationRate,
        inflationThreshold: args.inflationThreshold,
        warmUpIterations: args.warmUpIterations,
        useFreshBlood: args.useFreshBlood,
        freshBloodInterval: args.freshBloodInterval,
        freshBloodWarmUp: args.freshBloodWarmUp,
        useNonLinearOverlapPenalty: args.useNonLinearOverlapPenalty,
        overlapPenaltyExponent: args.overlapPenaltyExponent,
      },
      args.globalTargetRatio
    );

    // Increment version to signal solver reset and restart animation loop
    setSolverVersion((v) => v + 1);
  }, [
    args.template,
    args.populationSize,
    args.mutationRate,
    args.mutationStrength,
    args.selectionPressure,
    args.fitnessBalance,
    args.aspectRatioMutationRate,
    args.globalTargetRatio,
    args.useSwapMutation,
    args.swapMutationRate,
    args.useAggressiveInflation,
    args.inflationRate,
    args.inflationThreshold,
    args.warmUpIterations,
    args.useFreshBlood,
    args.freshBloodInterval,
    args.freshBloodWarmUp,
    args.useNonLinearOverlapPenalty,
    args.overlapPenaltyExponent,
  ]);

  // Animation loop controlled by autoPlay prop
  React.useEffect(() => {
    // Create disposal flag for this effect instance
    let isDisposed = false;

    // Cancel any existing animation
    if (animationIdRef.current !== null) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    if (args.autoPlay && solverRef.current) {
      let frameCount = 0;
      const animate = () => {
        // Check disposal flag to prevent zombie execution
        if (isDisposed) {
          return;
        }

        if (solverRef.current && !solverRef.current.hasConverged(0.01)) {
          solverRef.current.step();

          // Update stats display every 10 frames (reduces React overhead)
          frameCount++;
          setStatsUpdate((s) => s + 1);

          animationIdRef.current = requestAnimationFrame(animate);
        } else {
          // Animation finished, clear the ref
          animationIdRef.current = null;
        }
      };
      animate();
    }

    return () => {
      // Set disposal flag immediately
      isDisposed = true;

      // Cancel any pending animation frames
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, [args.autoPlay, solverVersion]);

  const adjacencies = springTemplates[args.template].adjacencies;

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <Canvas>
        <SceneContainer zoom={1} target={initialCameraTargetRef.current}>
          <SpringSystem3D
            solverRef={solverRef}
            adjacencies={adjacencies}
            boundary={scaledBoundaryRef.current}
            showAdjacencies={true}
            showBoundary={true}
          />
          <BoundaryEditor
            points={editableBoundary}
            onChange={handleBoundaryChange}
            editable={true}
          />
        </SceneContainer>
      </Canvas>

      {/* Info Display */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          background: "rgba(255, 255, 255, 0)",
          padding: "10px",
          borderRadius: "4px",
          fontFamily: "monospace",
          fontSize: "12px",
        }}
      >
        <strong>Spring Solver (R3F)</strong>
        <br />
        Generation: {solverRef.current?.getStats().generation || 0}
        <br />
        Best Fitness:{" "}
        {solverRef.current?.getStats().bestFitness.toFixed(4) || "0.0000"}
        <br />- FitnessG:{" "}
        {solverRef.current?.getStats().bestFitnessG.toFixed(2) || "0.00"}
        <br />- FitnessT:{" "}
        {solverRef.current?.getStats().bestFitnessT.toFixed(2) || "0.00"}
        <br />
        Population: {args.populationSize}
        <br />
        Converged: {solverRef.current?.hasConverged(0.01) ? "Yes" : "No"}
        <br />
        Auto-Play: {args.autoPlay ? "On" : "Off"}
      </div>
    </div>
  );
};

// Storybook Meta for Spring Solver
const meta: Meta<SpringVisualizationArgs> = {
  title: "Spring Solver",
  component: SpringSolverVisualization,
  argTypes: {
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
        "palace",
        "hotel",
        "howoge-1-room",
        "howoge-2-room",
        "howoge-3-room",
        "howoge-4-room",
        "howoge-5-room",
      ],
      description: "Room configuration template",
    },
    populationSize: {
      control: { type: "range", min: 5, max: 50, step: 5 },
      description: "Number of candidate solutions (genes)",
    },
    mutationRate: {
      control: { type: "range", min: 0.0, max: 1.0, step: 0.05 },
      description: "Probability of mutation per gene",
    },
    mutationStrength: {
      control: { type: "range", min: 1, max: 50, step: 1 },
      description: "Magnitude of position/dimension changes",
    },
    selectionPressure: {
      control: { type: "range", min: 0.1, max: 1, step: 0.05 },
      description: "Percentage of population to cull",
    },
    fitnessBalance: {
      control: { type: "range", min: 0.0, max: 1.0, step: 0.05 },
      description: "Balance: 0=Geometric only, 1=Topological only",
    },
    aspectRatioMutationRate: {
      control: { type: "range", min: 0.0, max: 1.0, step: 0.05 },
      description:
        "Probability of aspect ratio mutation (room shape exploration)",
    },
    boundaryScale: {
      control: { type: "range", min: 0.1, max: 3.0, step: 0.05 },
      description: "Scale boundary towards centroid",
    },
    globalTargetRatio: {
      control: { type: "range", min: 1.0, max: 5.0, step: 0.1 },
      description:
        "Global aspect ratio override for all rooms (undefined = use individual ratios)",
    },
    autoPlay: {
      control: { type: "boolean" },
      description: "Automatically run the solver animation",
    },

    // Advanced Optimization Features
    useSwapMutation: {
      control: { type: "boolean" },
      description:
        "[OPTIMIZATION] Swap Mutation: Randomly swap room positions to untangle topology",
    },
    swapMutationRate: {
      control: { type: "range", min: 0.0, max: 1.0, step: 0.05 },
      description:
        "Probability of swap mutation (only if useSwapMutation is enabled)",
    },
    useAggressiveInflation: {
      control: { type: "boolean" },
      description:
        "[OPTIMIZATION] Aggressive Inflation: Force rooms to grow beyond bounds before squish (fills voids)",
    },
    inflationRate: {
      control: { type: "range", min: 1.0, max: 1.1, step: 0.01 },
      description:
        "Growth rate per iteration (e.g., 1.02 = 2% growth, only if useAggressiveInflation is enabled)",
    },
    inflationThreshold: {
      control: { type: "range", min: 1.0, max: 1.2, step: 0.01 },
      description:
        "Max overgrowth (e.g., 1.05 = 5% larger than target, only if useAggressiveInflation is enabled)",
    },
    warmUpIterations: {
      control: { type: "range", min: 0, max: 5, step: 1 },
      description:
        '[OPTIMIZATION] Physics Warm-Up: Number of physics iterations to run immediately after mutation (prevents "death of potential geniuses"). Capped at 5 to prevent freezing.',
    },
    useFreshBlood: {
      control: { type: "boolean" },
      description:
        '[OPTIMIZATION] Fresh Blood: Periodically replace worst quarter with completely random positions (like "page refresh") to maintain diversity and escape local minima',
    },
    freshBloodInterval: {
      control: { type: "range", min: 5, max: 200, step: 5 },
      description:
        "Every N iterations, inject fresh blood (only if useFreshBlood is enabled)",
    },
    freshBloodWarmUp: {
      control: { type: "range", min: 0, max: 20, step: 1 },
      description:
        "Number of physics warm-up iterations for fresh genes (only if useFreshBlood is enabled). Capped at 20 to prevent freezing.",
    },
    useNonLinearOverlapPenalty: {
      control: { type: "boolean" },
      description:
        "[OPTIMIZATION] Non-Linear Overlap Penalty: Punish large/blocky overlaps exponentially more than thin slivers",
    },
    overlapPenaltyExponent: {
      control: { type: "range", min: 1.0, max: 5.0, step: 0.1 },
      description:
        "Exponent for overlap penalty (1.0 = linear, 1.5 = default, 2.0 = quadratic, 3.0 = cubic). Only if useNonLinearOverlapPenalty is enabled",
    },
  },
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

type Story = StoryObj<SpringVisualizationArgs>;

export const Default: Story = {
  args: springSolverDefaults,
};
