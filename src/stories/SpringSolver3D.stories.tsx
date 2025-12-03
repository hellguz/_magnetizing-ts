import React, { useRef, useState, useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Canvas } from '@react-three/fiber';
import { SceneContainer } from '../visualization/SceneContainer.js';
import { SpringSystem3D } from '../visualization/SpringSystem3D.js';
import { BoundaryEditor } from '../visualization/BoundaryEditor.js';
import { SpringSolver } from '../core/solvers/SpringSolver.js';
import { RoomState, Adjacency } from '../types.js';
import { Vec2 } from '../core/geometry/Vector2.js';

type TemplateType = 'small-apartment' | 'office-suite' | 'house' | 'large-house' | 'gallery' | 'clinic' | 'restaurant' | 'palace' | 'hotel';

interface SpringTemplate {
  boundary: Vec2[];
  rooms: RoomState[];
  adjacencies: Adjacency[];
}

interface SpringVisualizationArgs {
  template: TemplateType;
  populationSize: number;
  mutationRate: number;
  mutationStrength: number;
  selectionPressure: number;
  fitnessBalance: number;
  aspectRatioMutationRate: number;
  boundaryScale: number;
  globalTargetRatio: number | undefined;
  autoPlay: boolean;

  // Advanced optimization features
  useSwapMutation: boolean;
  swapMutationRate: number;
  useAggressiveInflation: boolean;
  inflationRate: number;
  inflationThreshold: number;
  warmUpIterations: number;
  useFreshBlood: boolean;
  freshBloodInterval: number;
  freshBloodWarmUp: number;
  useNonLinearOverlapPenalty: boolean;
  overlapPenaltyExponent: number;
}

const springTemplates: Record<TemplateType, SpringTemplate> = {
  'small-apartment': {
    boundary: [
      { x: 50, y: 50 },
      { x: 550, y: 50 },
      { x: 550, y: 450 },
      { x: 50, y: 450 },
    ],
    rooms: [
      { id: 'living', x: 100, y: 100, width: 150, height: 120, vx: 0, vy: 0, targetRatio: 1.5 },
      { id: 'kitchen', x: 300, y: 100, width: 110, height: 100, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'bedroom', x: 100, y: 280, width: 120, height: 110, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'bathroom', x: 350, y: 300, width: 80, height: 70, vx: 0, vy: 0, targetRatio: 1.0 },
    ],
    adjacencies: [
      { a: 'living', b: 'kitchen', weight: 2.0 },
      { a: 'kitchen', b: 'bathroom', weight: 1.5 },
      { a: 'bedroom', b: 'bathroom', weight: 1.0 },
    ],
  },
  'office-suite': {
    boundary: [
      { x: 50, y: 50 },
      { x: 650, y: 50 },
      { x: 650, y: 550 },
      { x: 50, y: 550 },
    ],
    rooms: [
      { id: 'reception', x: 100, y: 80, width: 180, height: 140, vx: 0, vy: 0, targetRatio: 1.8 },
      { id: 'office-1', x: 350, y: 100, width: 120, height: 100, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'office-2', x: 500, y: 100, width: 120, height: 100, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'office-3', x: 350, y: 250, width: 120, height: 100, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'meeting', x: 100, y: 300, width: 200, height: 140, vx: 0, vy: 0, targetRatio: 1.5 },
      { id: 'restroom', x: 500, y: 400, width: 100, height: 80, vx: 0, vy: 0, targetRatio: 1.2 },
    ],
    adjacencies: [
      { a: 'reception', b: 'office-1', weight: 1.5 },
      { a: 'reception', b: 'office-2', weight: 1.5 },
      { a: 'reception', b: 'office-3', weight: 1.5 },
      { a: 'reception', b: 'meeting', weight: 2.0 },
      { a: 'meeting', b: 'restroom', weight: 1.0 },
    ],
  },
  'house': {
    boundary: [
      { x: 30, y: 30 },
      { x: 730, y: 30 },
      { x: 730, y: 630 },
      { x: 30, y: 630 },
    ],
    rooms: [
      { id: 'entry', x: 80, y: 80, width: 100, height: 90, vx: 0, vy: 0, targetRatio: 5.0 },
      { id: 'living', x: 250, y: 100, width: 200, height: 150, vx: 0, vy: 0, targetRatio: 1.6 },
      { id: 'dining', x: 500, y: 100, width: 150, height: 120, vx: 0, vy: 0, targetRatio: 1.4 },
      { id: 'kitchen', x: 500, y: 300, width: 150, height: 130, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'bedroom-1', x: 100, y: 350, width: 140, height: 120, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'bedroom-2', x: 300, y: 350, width: 130, height: 110, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'bath-1', x: 150, y: 500, width: 90, height: 80, vx: 0, vy: 0, targetRatio: 5 },
      { id: 'bath-2', x: 350, y: 500, width: 80, height: 70, vx: 0, vy: 0, targetRatio: 5 },
    ],
    adjacencies: [
      { a: 'entry', b: 'living', weight: 2.5 },
      { a: 'living', b: 'dining', weight: 2.0 },
      { a: 'dining', b: 'kitchen', weight: 2.5 },
      { a: 'entry', b: 'bedroom-1', weight: 1.0 },
      { a: 'entry', b: 'bedroom-2', weight: 1.0 },
      { a: 'bedroom-1', b: 'bath-1', weight: 2.0 },
      { a: 'bedroom-2', b: 'bath-2', weight: 2.0 },
    ],
  },
  'large-house': {
    // L-shaped boundary for interesting layout
    boundary: [
      { x: 50, y: 50 },      // Top-left corner
      { x: 700, y: 50 },     // Top-right corner
      { x: 700, y: 300 },    // Right side, first turn
      { x: 400, y: 300 },    // Indent (creates L-shape)
      { x: 400, y: 650 },    // Bottom of vertical part
      { x: 50, y: 650 },     // Bottom-left corner
    ],
    rooms: [
      // Entrance area
      { id: 'entrance', x: 100, y: 80, width: 120, height: 100, vx: 0, vy: 0, targetRatio: 1.4 },

      // Long corridor connecting everything
      { id: 'corridor-1', x: 250, y: 200, width: 200, height: 80, vx: 0, vy: 0, targetRatio: 4 },

      // Living area
      { id: 'living', x: 350, y: 80, width: 220, height: 160, vx: 0, vy: 0, targetRatio: 1.7 },
      { id: 'balcony', x: 580, y: 120, width: 100, height: 80, vx: 0, vy: 0, targetRatio: 1.5 },

      // Kitchen and dining
      { id: 'kitchen', x: 500, y: 250, width: 170, height: 130, vx: 0, vy: 0, targetRatio: 1.4 },

      // 5 Bedrooms
      { id: 'bedroom-1', x: 100, y: 200, width: 140, height: 120, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'bedroom-2', x: 100, y: 350, width: 140, height: 120, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'bedroom-3', x: 100, y: 500, width: 130, height: 110, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'bedroom-4', x: 250, y: 350, width: 130, height: 110, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'bedroom-5', x: 250, y: 500, width: 130, height: 110, vx: 0, vy: 0, targetRatio: 1.3 },

      // 3 Bathrooms
      { id: 'bath-1', x: 260, y: 200, width: 90, height: 80, vx: 0, vy: 0, targetRatio: 5 },
      { id: 'bath-2', x: 100, y: 650, width: 80, height: 70, vx: 0, vy: 0, targetRatio: 5 },
      { id: 'bath-3', x: 260, y: 650, width: 80, height: 70, vx: 0, vy: 0, targetRatio: 5 },

      // Storage rooms
      { id: 'storage-1', x: 350, y: 300, width: 100, height: 80, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'storage-2', x: 450, y: 450, width: 90, height: 70, vx: 0, vy: 0, targetRatio: 1.3 },
    ],
    adjacencies: [
      // Entrance connections
      { a: 'entrance', b: 'corridor-1', weight: 3.0 },
      { a: 'entrance', b: 'living', weight: 2.5 },

      // Corridor as central hub (connecting all major areas)
      { a: 'corridor-1', b: 'living', weight: 2.0 },
      { a: 'corridor-1', b: 'kitchen', weight: 2.0 },
      { a: 'corridor-1', b: 'bedroom-1', weight: 2.0 },
      { a: 'corridor-1', b: 'bedroom-2', weight: 2.0 },
      { a: 'corridor-1', b: 'bedroom-3', weight: 2.0 },
      { a: 'corridor-1', b: 'bedroom-4', weight: 2.0 },
      { a: 'corridor-1', b: 'bedroom-5', weight: 2.0 },
      { a: 'corridor-1', b: 'bath-1', weight: 1.5 },
      { a: 'corridor-1', b: 'storage-1', weight: 1.0 },

      // Living area connections
      { a: 'living', b: 'balcony', weight: 2.5 },
      { a: 'living', b: 'kitchen', weight: 2.0 },

      // Bedroom-bathroom connections
      { a: 'bedroom-1', b: 'bath-1', weight: 2.5 },
      { a: 'bedroom-2', b: 'bath-1', weight: 1.5 },
      { a: 'bedroom-3', b: 'bath-2', weight: 2.5 },
      { a: 'bedroom-4', b: 'bath-3', weight: 2.5 },
      { a: 'bedroom-5', b: 'bath-2', weight: 2.0 },

      // Storage connections
      { a: 'kitchen', b: 'storage-1', weight: 2.0 },
      { a: 'storage-1', b: 'storage-2', weight: 1.5 },
    ],
  },
  'gallery': {
    boundary: [
      { x: 30, y: 50 },
      { x: 830, y: 50 },
      { x: 830, y: 450 },
      { x: 30, y: 450 },
    ],
    rooms: [
      { id: 'lobby', x: 100, y: 100, width: 200, height: 120, vx: 0, vy: 0, targetRatio: 2.0 },
      { id: 'gallery-a', x: 350, y: 80, width: 180, height: 140, vx: 0, vy: 0, targetRatio: 1.8 },
      { id: 'gallery-b', x: 550, y: 80, width: 180, height: 140, vx: 0, vy: 0, targetRatio: 1.8 },
      { id: 'gallery-c', x: 450, y: 280, width: 170, height: 130, vx: 0, vy: 0, targetRatio: 1.5 },
      { id: 'storage', x: 100, y: 300, width: 110, height: 90, vx: 0, vy: 0, targetRatio: 1.2 },
    ],
    adjacencies: [
      { a: 'lobby', b: 'gallery-a', weight: 2.0 },
      { a: 'lobby', b: 'gallery-b', weight: 2.0 },
      { a: 'lobby', b: 'gallery-c', weight: 2.0 },
      { a: 'gallery-a', b: 'gallery-b', weight: 1.5 },
      { a: 'gallery-b', b: 'gallery-c', weight: 1.5 },
      { a: 'lobby', b: 'storage', weight: 1.0 },
    ],
  },
  'clinic': {
    boundary: [
      { x: 50, y: 50 },
      { x: 600, y: 50 },
      { x: 600, y: 500 },
      { x: 50, y: 500 },
    ],
    rooms: [
      { id: 'waiting', x: 100, y: 80, width: 160, height: 120, vx: 0, vy: 0, targetRatio: 1.7 },
      { id: 'reception', x: 300, y: 80, width: 120, height: 90, vx: 0, vy: 0, targetRatio: 1.4 },
      { id: 'exam-1', x: 450, y: 80, width: 110, height: 100, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'exam-2', x: 450, y: 220, width: 110, height: 100, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'exam-3', x: 450, y: 350, width: 110, height: 100, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'lab', x: 100, y: 280, width: 130, height: 110, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'staff', x: 280, y: 350, width: 100, height: 80, vx: 0, vy: 0, targetRatio: 1.2 },
    ],
    adjacencies: [
      { a: 'waiting', b: 'reception', weight: 2.5 },
      { a: 'reception', b: 'exam-1', weight: 1.5 },
      { a: 'reception', b: 'exam-2', weight: 1.5 },
      { a: 'reception', b: 'exam-3', weight: 1.5 },
      { a: 'reception', b: 'lab', weight: 2.0 },
      { a: 'reception', b: 'staff', weight: 1.0 },
      { a: 'lab', b: 'exam-1', weight: 1.0 },
    ],
  },
  'restaurant': {
    boundary: [
      { x: 30, y: 30 },
      { x: 680, y: 30 },
      { x: 680, y: 580 },
      { x: 30, y: 580 },
    ],
    rooms: [
      { id: 'entrance', x: 80, y: 80, width: 90, height: 80, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'dining-main', x: 250, y: 100, width: 220, height: 160, vx: 0, vy: 0, targetRatio: 1.7 },
      { id: 'dining-private', x: 500, y: 120, width: 140, height: 110, vx: 0, vy: 0, targetRatio: 1.4 },
      { id: 'bar', x: 100, y: 300, width: 170, height: 100, vx: 0, vy: 0, targetRatio: 2.0 },
      { id: 'kitchen', x: 350, y: 320, width: 180, height: 130, vx: 0, vy: 0, targetRatio: 1.4 },
      { id: 'storage', x: 550, y: 350, width: 100, height: 90, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'restrooms', x: 100, y: 450, width: 120, height: 100, vx: 0, vy: 0, targetRatio: 1.3 },
    ],
    adjacencies: [
      { a: 'entrance', b: 'dining-main', weight: 2.5 },
      { a: 'entrance', b: 'bar', weight: 2.0 },
      { a: 'dining-main', b: 'dining-private', weight: 1.5 },
      { a: 'dining-main', b: 'kitchen', weight: 2.5 },
      { a: 'bar', b: 'kitchen', weight: 2.0 },
      { a: 'kitchen', b: 'storage', weight: 2.0 },
      { a: 'entrance', b: 'restrooms', weight: 1.5 },
    ],
  },
  'palace': {
    boundary: [
      { x: 50, y: 50 },
      { x: 1450, y: 50 },
      { x: 1450, y: 1050 },
      { x: 50, y: 1050 },
    ],
    rooms: [
      // Grand Public Spaces
      { id: 'grand-entrance', x: 700, y: 100, width: 180, height: 150, vx: 0, vy: 0, targetRatio: 1.6 },
      { id: 'main-throne', x: 700, y: 300, width: 220, height: 180, vx: 0, vy: 0, targetRatio: 1.8 },
      { id: 'lesser-throne', x: 950, y: 320, width: 160, height: 130, vx: 0, vy: 0, targetRatio: 1.5 },
      { id: 'grand-ballroom', x: 500, y: 550, width: 280, height: 200, vx: 0, vy: 0, targetRatio: 2.0 },
      { id: 'small-ballroom', x: 850, y: 600, width: 180, height: 130, vx: 0, vy: 0, targetRatio: 1.6 },

      // Royal Private Quarters
      { id: 'king-chamber', x: 200, y: 150, width: 160, height: 140, vx: 0, vy: 0, targetRatio: 1.4 },
      { id: 'queen-chamber', x: 400, y: 150, width: 160, height: 140, vx: 0, vy: 0, targetRatio: 1.4 },
      { id: 'prince-chamber-1', x: 200, y: 320, width: 130, height: 110, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'prince-chamber-2', x: 360, y: 320, width: 130, height: 110, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'princess-chamber', x: 280, y: 460, width: 130, height: 110, vx: 0, vy: 0, targetRatio: 1.3 },

      // Royal Studies & Libraries
      { id: 'royal-study', x: 100, y: 600, width: 140, height: 120, vx: 0, vy: 0, targetRatio: 1.4 },
      { id: 'royal-library', x: 100, y: 760, width: 200, height: 160, vx: 0, vy: 0, targetRatio: 1.6 },
      { id: 'royal-archives', x: 330, y: 800, width: 140, height: 110, vx: 0, vy: 0, targetRatio: 1.4 },

      // Dining & Kitchen Areas
      { id: 'grand-dining', x: 950, y: 150, width: 220, height: 150, vx: 0, vy: 0, targetRatio: 1.7 },
      { id: 'formal-dining', x: 1200, y: 150, width: 160, height: 120, vx: 0, vy: 0, targetRatio: 1.5 },
      { id: 'breakfast-room', x: 1100, y: 320, width: 120, height: 100, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'main-kitchen', x: 1250, y: 320, width: 170, height: 140, vx: 0, vy: 0, targetRatio: 1.4 },
      { id: 'secondary-kitchen', x: 1250, y: 490, width: 130, height: 110, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'pantry', x: 1100, y: 450, width: 110, height: 90, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'wine-cellar', x: 1240, y: 630, width: 130, height: 100, vx: 0, vy: 0, targetRatio: 1.4 },

      // Galleries & Art Spaces
      { id: 'great-gallery', x: 530, y: 800, width: 240, height: 160, vx: 0, vy: 0, targetRatio: 2.0 },
      { id: 'portrait-gallery', x: 810, y: 800, width: 200, height: 140, vx: 0, vy: 0, targetRatio: 1.7 },

      // Religious Spaces
      { id: 'chapel', x: 100, y: 150, width: 160, height: 140, vx: 0, vy: 0, targetRatio: 1.5 },
      { id: 'prayer-room', x: 100, y: 320, width: 110, height: 100, vx: 0, vy: 0, targetRatio: 1.2 },

      // Administrative & Strategic
      { id: 'treasury', x: 100, y: 450, width: 130, height: 110, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'war-room', x: 520, y: 320, width: 150, height: 130, vx: 0, vy: 0, targetRatio: 1.4 },
      { id: 'council-chamber', x: 520, y: 150, width: 160, height: 130, vx: 0, vy: 0, targetRatio: 1.5 },

      // Guard Rooms & Security
      { id: 'guard-north', x: 700, y: 900, width: 110, height: 90, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'guard-south', x: 700, y: 80, width: 110, height: 90, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'guard-east', x: 1360, y: 500, width: 90, height: 110, vx: 0, vy: 0, targetRatio: 1.0 },
      { id: 'guard-west', x: 80, y: 500, width: 90, height: 110, vx: 0, vy: 0, targetRatio: 1.0 },
      { id: 'armory', x: 950, y: 480, width: 140, height: 110, vx: 0, vy: 0, targetRatio: 1.4 },

      // Guest & Servant Areas
      { id: 'guest-chamber-1', x: 1100, y: 600, width: 120, height: 100, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'guest-chamber-2', x: 1100, y: 730, width: 120, height: 100, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'guest-chamber-3', x: 1100, y: 860, width: 120, height: 100, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'servant-hall', x: 1260, y: 760, width: 150, height: 110, vx: 0, vy: 0, targetRatio: 1.5 },
      { id: 'servant-quarters', x: 1260, y: 900, width: 140, height: 100, vx: 0, vy: 0, targetRatio: 1.4 },

      // Courtyards & Gardens
      { id: 'garden-court', x: 320, y: 600, width: 150, height: 150, vx: 0, vy: 0, targetRatio: 1.0 },
      { id: 'fountain-court', x: 1050, y: 100, width: 130, height: 130, vx: 0, vy: 0, targetRatio: 1.0 },
      { id: 'grand-terrace', x: 850, y: 100, width: 170, height: 130, vx: 0, vy: 0, targetRatio: 1.5 },
    ],
    adjacencies: [
      // Entrance connections
      { a: 'grand-entrance', b: 'main-throne', weight: 3.0 },
      { a: 'grand-entrance', b: 'council-chamber', weight: 2.0 },
      { a: 'grand-entrance', b: 'guard-south', weight: 2.5 },
      { a: 'grand-entrance', b: 'grand-terrace', weight: 2.0 },
      { a: 'grand-entrance', b: 'fountain-court', weight: 1.5 },

      // Throne room connections
      { a: 'main-throne', b: 'lesser-throne', weight: 2.5 },
      { a: 'main-throne', b: 'council-chamber', weight: 2.5 },
      { a: 'main-throne', b: 'war-room', weight: 2.0 },
      { a: 'main-throne', b: 'grand-ballroom', weight: 2.0 },

      // Ballroom connections
      { a: 'grand-ballroom', b: 'small-ballroom', weight: 2.0 },
      { a: 'grand-ballroom', b: 'great-gallery', weight: 2.5 },
      { a: 'small-ballroom', b: 'portrait-gallery', weight: 2.0 },

      // Royal quarters interconnections
      { a: 'king-chamber', b: 'queen-chamber', weight: 3.0 },
      { a: 'king-chamber', b: 'royal-study', weight: 2.5 },
      { a: 'king-chamber', b: 'chapel', weight: 2.0 },
      { a: 'queen-chamber', b: 'princess-chamber', weight: 2.0 },
      { a: 'prince-chamber-1', b: 'prince-chamber-2', weight: 2.0 },
      { a: 'prince-chamber-1', b: 'king-chamber', weight: 1.5 },

      // Study & library connections
      { a: 'royal-study', b: 'royal-library', weight: 2.5 },
      { a: 'royal-library', b: 'royal-archives', weight: 2.5 },
      { a: 'royal-study', b: 'war-room', weight: 1.5 },

      // Dining area connections
      { a: 'grand-dining', b: 'formal-dining', weight: 2.0 },
      { a: 'formal-dining', b: 'breakfast-room', weight: 2.0 },
      { a: 'breakfast-room', b: 'main-kitchen', weight: 2.5 },
      { a: 'main-kitchen', b: 'secondary-kitchen', weight: 2.5 },
      { a: 'main-kitchen', b: 'pantry', weight: 2.0 },
      { a: 'pantry', b: 'wine-cellar', weight: 2.0 },
      { a: 'grand-dining', b: 'main-throne', weight: 1.5 },

      // Gallery connections
      { a: 'great-gallery', b: 'portrait-gallery', weight: 2.5 },
      { a: 'portrait-gallery', b: 'guard-north', weight: 1.0 },

      // Religious connections
      { a: 'chapel', b: 'prayer-room', weight: 2.5 },
      { a: 'prayer-room', b: 'treasury', weight: 1.5 },

      // Administrative connections
      { a: 'council-chamber', b: 'war-room', weight: 2.5 },
      { a: 'war-room', b: 'armory', weight: 2.0 },
      { a: 'treasury', b: 'guard-west', weight: 2.0 },

      // Guard connections
      { a: 'guard-north', b: 'guard-south', weight: 1.0 },
      { a: 'guard-east', b: 'guard-west', weight: 1.0 },
      { a: 'armory', b: 'guard-east', weight: 2.0 },
      { a: 'armory', b: 'lesser-throne', weight: 1.5 },

      // Guest area connections
      { a: 'guest-chamber-1', b: 'guest-chamber-2', weight: 1.5 },
      { a: 'guest-chamber-2', b: 'guest-chamber-3', weight: 1.5 },
      { a: 'guest-chamber-1', b: 'small-ballroom', weight: 1.5 },

      // Servant area connections
      { a: 'servant-hall', b: 'servant-quarters', weight: 2.5 },
      { a: 'servant-hall', b: 'main-kitchen', weight: 2.0 },
      { a: 'servant-quarters', b: 'guest-chamber-3', weight: 1.5 },

      // Courtyard connections
      { a: 'garden-court', b: 'grand-ballroom', weight: 2.0 },
      { a: 'garden-court', b: 'princess-chamber', weight: 1.5 },
      { a: 'fountain-court', b: 'grand-dining', weight: 1.5 },
      { a: 'grand-terrace', b: 'lesser-throne', weight: 1.5 },
    ],
  },
  'hotel': {
    boundary: [
      { x: 50, y: 50 },
      { x: 1250, y: 50 },
      { x: 1250, y: 950 },
      { x: 50, y: 950 },
    ],
    rooms: [
      // Floor 1
      { id: 'corridor-1', x: 150, y: 100, width: 30, height: 30, vx: 0, vy: 0, targetRatio: 100 },
      { id: 'apt-1-1', x: 100, y: 80, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-1-2', x: 200, y: 80, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-1-3', x: 300, y: 80, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-1-4', x: 400, y: 80, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-1-5', x: 500, y: 80, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-1-6', x: 100, y: 130, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-1-7', x: 200, y: 130, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-1-8', x: 300, y: 130, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-1-9', x: 400, y: 130, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-1-10', x: 500, y: 130, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },

      // Floor 2
      { id: 'corridor-2', x: 150, y: 230, width: 30, height: 30, vx: 0, vy: 0, targetRatio: 100 },
      { id: 'apt-2-1', x: 100, y: 210, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-2-2', x: 200, y: 210, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-2-3', x: 300, y: 210, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-2-4', x: 400, y: 210, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-2-5', x: 500, y: 210, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-2-6', x: 100, y: 260, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-2-7', x: 200, y: 260, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-2-8', x: 300, y: 260, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-2-9', x: 400, y: 260, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-2-10', x: 500, y: 260, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },

      // Floor 3
      { id: 'corridor-3', x: 150, y: 360, width: 30, height: 30, vx: 0, vy: 0, targetRatio: 100 },
      { id: 'apt-3-1', x: 100, y: 340, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-3-2', x: 200, y: 340, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-3-3', x: 300, y: 340, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-3-4', x: 400, y: 340, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-3-5', x: 500, y: 340, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-3-6', x: 100, y: 390, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-3-7', x: 200, y: 390, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-3-8', x: 300, y: 390, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-3-9', x: 400, y: 390, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-3-10', x: 500, y: 390, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },

      // Floor 4
      { id: 'corridor-4', x: 150, y: 490, width: 30, height: 30, vx: 0, vy: 0, targetRatio: 100 },
      { id: 'apt-4-1', x: 100, y: 470, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-4-2', x: 200, y: 470, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-4-3', x: 300, y: 470, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-4-4', x: 400, y: 470, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-4-5', x: 500, y: 470, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-4-6', x: 100, y: 520, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-4-7', x: 200, y: 520, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-4-8', x: 300, y: 520, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-4-9', x: 400, y: 520, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-4-10', x: 500, y: 520, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },

      // Floor 5
      { id: 'corridor-5', x: 150, y: 620, width: 30, height: 30, vx: 0, vy: 0, targetRatio: 100 },
      { id: 'apt-5-1', x: 100, y: 600, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-5-2', x: 200, y: 600, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-5-3', x: 300, y: 600, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-5-4', x: 400, y: 600, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-5-5', x: 500, y: 600, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-5-6', x: 100, y: 650, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-5-7', x: 200, y: 650, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-5-8', x: 300, y: 650, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-5-9', x: 400, y: 650, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-5-10', x: 500, y: 650, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },

      // Floor 6
      { id: 'corridor-6', x: 150, y: 750, width: 30, height: 30, vx: 0, vy: 0, targetRatio: 100 },
      { id: 'apt-6-1', x: 100, y: 730, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-6-2', x: 200, y: 730, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-6-3', x: 300, y: 730, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-6-4', x: 400, y: 730, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-6-5', x: 500, y: 730, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-6-6', x: 100, y: 780, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-6-7', x: 200, y: 780, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-6-8', x: 300, y: 780, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-6-9', x: 400, y: 780, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'apt-6-10', x: 500, y: 780, width: 80, height: 60, vx: 0, vy: 0, targetRatio: 1.3 },
    ],
    adjacencies: [
      // Floor 1 - corridor connections
      { a: 'corridor-1', b: 'apt-1-1', weight: 2.0 },
      { a: 'corridor-1', b: 'apt-1-2', weight: 2.0 },
      { a: 'corridor-1', b: 'apt-1-3', weight: 2.0 },
      { a: 'corridor-1', b: 'apt-1-4', weight: 2.0 },
      { a: 'corridor-1', b: 'apt-1-5', weight: 2.0 },
      { a: 'corridor-1', b: 'apt-1-6', weight: 2.0 },
      { a: 'corridor-1', b: 'apt-1-7', weight: 2.0 },
      { a: 'corridor-1', b: 'apt-1-8', weight: 2.0 },
      { a: 'corridor-1', b: 'apt-1-9', weight: 2.0 },
      { a: 'corridor-1', b: 'apt-1-10', weight: 2.0 },

      // Floor 2 - corridor connections
      { a: 'corridor-2', b: 'apt-2-1', weight: 2.0 },
      { a: 'corridor-2', b: 'apt-2-2', weight: 2.0 },
      { a: 'corridor-2', b: 'apt-2-3', weight: 2.0 },
      { a: 'corridor-2', b: 'apt-2-4', weight: 2.0 },
      { a: 'corridor-2', b: 'apt-2-5', weight: 2.0 },
      { a: 'corridor-2', b: 'apt-2-6', weight: 2.0 },
      { a: 'corridor-2', b: 'apt-2-7', weight: 2.0 },
      { a: 'corridor-2', b: 'apt-2-8', weight: 2.0 },
      { a: 'corridor-2', b: 'apt-2-9', weight: 2.0 },
      { a: 'corridor-2', b: 'apt-2-10', weight: 2.0 },

      // Floor 3 - corridor connections
      { a: 'corridor-3', b: 'apt-3-1', weight: 2.0 },
      { a: 'corridor-3', b: 'apt-3-2', weight: 2.0 },
      { a: 'corridor-3', b: 'apt-3-3', weight: 2.0 },
      { a: 'corridor-3', b: 'apt-3-4', weight: 2.0 },
      { a: 'corridor-3', b: 'apt-3-5', weight: 2.0 },
      { a: 'corridor-3', b: 'apt-3-6', weight: 2.0 },
      { a: 'corridor-3', b: 'apt-3-7', weight: 2.0 },
      { a: 'corridor-3', b: 'apt-3-8', weight: 2.0 },
      { a: 'corridor-3', b: 'apt-3-9', weight: 2.0 },
      { a: 'corridor-3', b: 'apt-3-10', weight: 2.0 },

      // Floor 4 - corridor connections
      { a: 'corridor-4', b: 'apt-4-1', weight: 2.0 },
      { a: 'corridor-4', b: 'apt-4-2', weight: 2.0 },
      { a: 'corridor-4', b: 'apt-4-3', weight: 2.0 },
      { a: 'corridor-4', b: 'apt-4-4', weight: 2.0 },
      { a: 'corridor-4', b: 'apt-4-5', weight: 2.0 },
      { a: 'corridor-4', b: 'apt-4-6', weight: 2.0 },
      { a: 'corridor-4', b: 'apt-4-7', weight: 2.0 },
      { a: 'corridor-4', b: 'apt-4-8', weight: 2.0 },
      { a: 'corridor-4', b: 'apt-4-9', weight: 2.0 },
      { a: 'corridor-4', b: 'apt-4-10', weight: 2.0 },

      // Floor 5 - corridor connections
      { a: 'corridor-5', b: 'apt-5-1', weight: 2.0 },
      { a: 'corridor-5', b: 'apt-5-2', weight: 2.0 },
      { a: 'corridor-5', b: 'apt-5-3', weight: 2.0 },
      { a: 'corridor-5', b: 'apt-5-4', weight: 2.0 },
      { a: 'corridor-5', b: 'apt-5-5', weight: 2.0 },
      { a: 'corridor-5', b: 'apt-5-6', weight: 2.0 },
      { a: 'corridor-5', b: 'apt-5-7', weight: 2.0 },
      { a: 'corridor-5', b: 'apt-5-8', weight: 2.0 },
      { a: 'corridor-5', b: 'apt-5-9', weight: 2.0 },
      { a: 'corridor-5', b: 'apt-5-10', weight: 2.0 },

      // Floor 6 - corridor connections
      { a: 'corridor-6', b: 'apt-6-1', weight: 2.0 },
      { a: 'corridor-6', b: 'apt-6-2', weight: 2.0 },
      { a: 'corridor-6', b: 'apt-6-3', weight: 2.0 },
      { a: 'corridor-6', b: 'apt-6-4', weight: 2.0 },
      { a: 'corridor-6', b: 'apt-6-5', weight: 2.0 },
      { a: 'corridor-6', b: 'apt-6-6', weight: 2.0 },
      { a: 'corridor-6', b: 'apt-6-7', weight: 2.0 },
      { a: 'corridor-6', b: 'apt-6-8', weight: 2.0 },
      { a: 'corridor-6', b: 'apt-6-9', weight: 2.0 },
      { a: 'corridor-6', b: 'apt-6-10', weight: 2.0 },

      // Vertical connections between floors (corridors to corridors)
      { a: 'corridor-1', b: 'corridor-2', weight: 3.0 },
      { a: 'corridor-2', b: 'corridor-3', weight: 3.0 },
      { a: 'corridor-3', b: 'corridor-4', weight: 3.0 },
      { a: 'corridor-4', b: 'corridor-5', weight: 3.0 },
      { a: 'corridor-5', b: 'corridor-6', weight: 3.0 },
    ],
  },
};

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

  // Helper: Calculate centroid of a polygon
  const calculateCentroid = useCallback((points: Vec2[]) => {
    let x = 0, y = 0;
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
    const boundary = templateBoundary.map(p => ({
      x: centroid.x + (p.x - centroid.x) * combinedScale,
      y: centroid.y + (p.y - centroid.y) * combinedScale
    }));

    scaledBoundaryRef.current = boundary;
    setEditableBoundary(boundary);

    // Set initial camera target (only when template/scale changes)
    const centerX = boundary.reduce((sum, p) => sum + p.x, 0) / boundary.length;
    const centerY = boundary.reduce((sum, p) => sum + p.y, 0) / boundary.length;
    initialCameraTargetRef.current = [centerX, centerY, 0];
  }, [args.template, args.boundaryScale, calculateCentroid, calculatePolygonArea, calculateTotalRoomArea]);

  // Recreate solver when solver parameters or template change
  React.useEffect(() => {
    const template = templateRef.current;
    if (!template) return;

    const { rooms, adjacencies } = template;
    const currentBoundary = scaledBoundaryRef.current;

    solverRef.current = new SpringSolver(rooms, currentBoundary, adjacencies, {
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
    }, args.globalTargetRatio);
  }, [args.template, args.populationSize, args.mutationRate, args.mutationStrength, args.selectionPressure, args.fitnessBalance, args.aspectRatioMutationRate, args.globalTargetRatio, args.useSwapMutation, args.swapMutationRate, args.useAggressiveInflation, args.inflationRate, args.inflationThreshold, args.warmUpIterations, args.useFreshBlood, args.freshBloodInterval, args.freshBloodWarmUp, args.useNonLinearOverlapPenalty, args.overlapPenaltyExponent]);

  // Handle boundary changes from editor
  const handleBoundaryChange = useCallback((newPoints: Vec2[]) => {
    setEditableBoundary(newPoints);
    scaledBoundaryRef.current = newPoints;

    const template = templateRef.current;
    if (!template) return;

    const { rooms, adjacencies } = template;

    // Recreate solver with new boundary
    solverRef.current = new SpringSolver(rooms, newPoints, adjacencies, {
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
    }, args.globalTargetRatio);
  }, [args.template, args.populationSize, args.mutationRate, args.mutationStrength, args.selectionPressure, args.fitnessBalance, args.aspectRatioMutationRate, args.globalTargetRatio, args.useSwapMutation, args.swapMutationRate, args.useAggressiveInflation, args.inflationRate, args.inflationThreshold, args.warmUpIterations, args.useFreshBlood, args.freshBloodInterval, args.freshBloodWarmUp, args.useNonLinearOverlapPenalty, args.overlapPenaltyExponent]);

  // Handle reset generation
  const handleReset = useCallback(() => {
    const template = templateRef.current;
    if (!template) return;

    const { rooms, adjacencies } = template;
    const currentBoundary = scaledBoundaryRef.current;

    // Recreate solver with current parameters and boundary
    solverRef.current = new SpringSolver(rooms, currentBoundary, adjacencies, {
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
    }, args.globalTargetRatio);
  }, [args.template, args.populationSize, args.mutationRate, args.mutationStrength, args.selectionPressure, args.fitnessBalance, args.aspectRatioMutationRate, args.globalTargetRatio, args.useSwapMutation, args.swapMutationRate, args.useAggressiveInflation, args.inflationRate, args.inflationThreshold, args.warmUpIterations, args.useFreshBlood, args.freshBloodInterval, args.freshBloodWarmUp, args.useNonLinearOverlapPenalty, args.overlapPenaltyExponent]);

  // Animation loop controlled by autoPlay prop
  React.useEffect(() => {
    // Cancel any existing animation
    if (animationIdRef.current !== null) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    if (args.autoPlay && solverRef.current) {
      let frameCount = 0;
      const animate = () => {
        if (solverRef.current && !solverRef.current.hasConverged(0.01)) {
          solverRef.current.step();

          // Update stats display every 10 frames (reduces React overhead)
          frameCount++;
          if (frameCount % 10 === 0) {
            setStatsUpdate(s => s + 1);
          }

          animationIdRef.current = requestAnimationFrame(animate);
        }
      };
      animate();
    }

    return () => {
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, [args.autoPlay]);

  const adjacencies = springTemplates[args.template].adjacencies;

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
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
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(255, 255, 255, 0)',
          padding: '10px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '12px',
        }}
      >
        <strong>Spring Solver (R3F)</strong>
        <br />
        Generation: {solverRef.current?.getStats().generation || 0}
        <br />
        Best Fitness: {solverRef.current?.getStats().bestFitness.toFixed(4) || '0.0000'}
        <br />
        - FitnessG: {solverRef.current?.getStats().bestFitnessG.toFixed(2) || '0.00'}
        <br />
        - FitnessT: {solverRef.current?.getStats().bestFitnessT.toFixed(2) || '0.00'}
        <br />
        Population: {args.populationSize}
        <br />
        Converged: {solverRef.current?.hasConverged(0.01) ? 'Yes' : 'No'}
        <br />
        Auto-Play: {args.autoPlay ? 'On' : 'Off'}
      </div>
    </div>
  );
};

// Storybook Meta for Spring Solver
const meta: Meta<SpringVisualizationArgs> = {
  title: 'Spring Solver',
  component: SpringSolverVisualization,
  argTypes: {
    template: {
      control: { type: 'select' },
      options: ['small-apartment', 'office-suite', 'house', 'large-house', 'gallery', 'clinic', 'restaurant', 'palace', 'hotel'],
      description: 'Room configuration template',
    },
    populationSize: {
      control: { type: 'range', min: 5, max: 50, step: 5 },
      description: 'Number of candidate solutions (genes)',
    },
    mutationRate: {
      control: { type: 'range', min: 0.0, max: 1.0, step: 0.05 },
      description: 'Probability of mutation per gene',
    },
    mutationStrength: {
      control: { type: 'range', min: 1, max: 50, step: 1 },
      description: 'Magnitude of position/dimension changes',
    },
    selectionPressure: {
      control: { type: 'range', min: 0.1, max: 1, step: 0.05 },
      description: 'Percentage of population to cull',
    },
    fitnessBalance: {
      control: { type: 'range', min: 0.0, max: 1.0, step: 0.05 },
      description: 'Balance: 0=Geometric only, 1=Topological only',
    },
    aspectRatioMutationRate: {
      control: { type: 'range', min: 0.0, max: 1.0, step: 0.05 },
      description: 'Probability of aspect ratio mutation (room shape exploration)',
    },
    boundaryScale: {
      control: { type: 'range', min: 0.1, max: 3.0, step: 0.05 },
      description: 'Scale boundary towards centroid',
    },
    globalTargetRatio: {
      control: { type: 'range', min: 1.0, max: 5.0, step: 0.1 },
      description: 'Global aspect ratio override for all rooms (undefined = use individual ratios)',
    },
    autoPlay: {
      control: { type: 'boolean' },
      description: 'Automatically run the solver animation',
    },

    // Advanced Optimization Features
    useSwapMutation: {
      control: { type: 'boolean' },
      description: '[OPTIMIZATION] Swap Mutation: Randomly swap room positions to untangle topology',
    },
    swapMutationRate: {
      control: { type: 'range', min: 0.0, max: 1.0, step: 0.05 },
      description: 'Probability of swap mutation (only if useSwapMutation is enabled)',
    },
    useAggressiveInflation: {
      control: { type: 'boolean' },
      description: '[OPTIMIZATION] Aggressive Inflation: Force rooms to grow beyond bounds before squish (fills voids)',
    },
    inflationRate: {
      control: { type: 'range', min: 1.0, max: 1.1, step: 0.01 },
      description: 'Growth rate per iteration (e.g., 1.02 = 2% growth, only if useAggressiveInflation is enabled)',
    },
    inflationThreshold: {
      control: { type: 'range', min: 1.0, max: 1.2, step: 0.01 },
      description: 'Max overgrowth (e.g., 1.05 = 5% larger than target, only if useAggressiveInflation is enabled)',
    },
    warmUpIterations: {
      control: { type: 'range', min: 0, max: 50, step: 1 },
      description: '[OPTIMIZATION] Physics Warm-Up: Number of physics iterations to run immediately after mutation (prevents "death of potential geniuses")',
    },
    useFreshBlood: {
      control: { type: 'boolean' },
      description: '[OPTIMIZATION] Fresh Blood: Periodically replace worst quarter with completely random positions (like "page refresh") to maintain diversity and escape local minima',
    },
    freshBloodInterval: {
      control: { type: 'range', min: 5, max: 200, step: 5 },
      description: 'Every N iterations, inject fresh blood (only if useFreshBlood is enabled)',
    },
    freshBloodWarmUp: {
      control: { type: 'range', min: 0, max: 100, step: 5 },
      description: 'Number of physics warm-up iterations for fresh genes (only if useFreshBlood is enabled)',
    },
    useNonLinearOverlapPenalty: {
      control: { type: 'boolean' },
      description: '[OPTIMIZATION] Non-Linear Overlap Penalty: Punish large/blocky overlaps exponentially more than thin slivers',
    },
    overlapPenaltyExponent: {
      control: { type: 'range', min: 1.0, max: 5.0, step: 0.1 },
      description: 'Exponent for overlap penalty (1.0 = linear, 1.5 = default, 2.0 = quadratic, 3.0 = cubic). Only if useNonLinearOverlapPenalty is enabled',
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<SpringVisualizationArgs>;

export const Default: Story = {
  args: {
    template: 'house',
    populationSize: 25,
    mutationRate: 0.5,
    mutationStrength: 30,
    selectionPressure: 0.5,
    fitnessBalance: 0.3,
    aspectRatioMutationRate: 0.3,
    boundaryScale: 1.0,
    globalTargetRatio: 2,
    autoPlay: true,

    // Advanced Optimization Features
    useSwapMutation: true,
    swapMutationRate: 0.8,
    useAggressiveInflation: false,
    inflationRate: 1.02,
    inflationThreshold: 1.05,
    warmUpIterations: 5,
    useFreshBlood: true,
    freshBloodInterval: 50,
    freshBloodWarmUp: 100,
    useNonLinearOverlapPenalty: true,
    overlapPenaltyExponent: 1.5,
  },
};
