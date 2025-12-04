import { Point } from '../../core/grid/GridBuffer.js';
import { RoomRequest, Adjacency, CorridorRule } from '../../types.js';

export type DiscreteTemplateType = 'small-apartment' | 'office-suite' | 'house' | 'gallery' | 'clinic' | 'restaurant' | 'palace' | 'hotel';

export interface DiscreteTemplate {
  boundary: Point[];
  rooms: RoomRequest[];
  adjacencies: Adjacency[];
  startPoint: { x: number; y: number };
}

export const discreteTemplates: Record<DiscreteTemplateType, DiscreteTemplate> = {
  'small-apartment': {
    boundary: [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 40 },
      { x: 0, y: 40 },
    ],
    rooms: [
      { id: 'living', targetArea: 200, targetRatio: 1.5, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'kitchen', targetArea: 120, targetRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'bedroom', targetArea: 150, targetRatio: 1.3, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'bathroom', targetArea: 60, targetRatio: 1.0, corridorRule: CorridorRule.ONE_SIDE },
    ],
    adjacencies: [
      { a: 'living', b: 'kitchen', weight: 2.0 },
      { a: 'kitchen', b: 'bathroom', weight: 1.5 },
      { a: 'bedroom', b: 'bathroom', weight: 1.0 },
    ],
    startPoint: { x: 25, y: 20 },
  },
  'office-suite': {
    boundary: [
      { x: 0, y: 0 },
      { x: 60, y: 0 },
      { x: 60, y: 50 },
      { x: 0, y: 50 },
    ],
    rooms: [
      { id: 'reception', targetArea: 180, targetRatio: 1.8, corridorRule: CorridorRule.ALL_SIDES },
      { id: 'office-1', targetArea: 140, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'office-2', targetArea: 140, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'office-3', targetArea: 140, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'meeting', targetArea: 200, targetRatio: 1.5, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'restroom', targetArea: 80, targetRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
    ],
    adjacencies: [
      { a: 'reception', b: 'office-1', weight: 1.5 },
      { a: 'reception', b: 'office-2', weight: 1.5 },
      { a: 'reception', b: 'office-3', weight: 1.5 },
      { a: 'reception', b: 'meeting', weight: 2.0 },
      { a: 'meeting', b: 'restroom', weight: 1.0 },
    ],
    startPoint: { x: 30, y: 5 },
  },
  'house': {
    boundary: [
      { x: 0, y: 0 },
      { x: 70, y: 0 },
      { x: 70, y: 60 },
      { x: 0, y: 60 },
    ],
    rooms: [
      { id: 'entry', targetArea: 100, targetRatio: 1.2, corridorRule: CorridorRule.ALL_SIDES },
      { id: 'living', targetArea: 300, targetRatio: 1.6, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'dining', targetArea: 180, targetRatio: 1.4, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'kitchen', targetArea: 200, targetRatio: 1.3, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'bedroom-1', targetArea: 200, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'bedroom-2', targetArea: 180, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'bath-1', targetArea: 80, targetRatio: 1.0, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'bath-2', targetArea: 60, targetRatio: 1.0, corridorRule: CorridorRule.ONE_SIDE },
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
    startPoint: { x: 35, y: 5 },
  },
  'gallery': {
    boundary: [
      { x: 0, y: 0 },
      { x: 80, y: 0 },
      { x: 80, y: 40 },
      { x: 0, y: 40 },
    ],
    rooms: [
      { id: 'lobby', targetArea: 250, targetRatio: 2.0, corridorRule: CorridorRule.ALL_SIDES },
      { id: 'gallery-a', targetArea: 300, targetRatio: 1.8, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'gallery-b', targetArea: 300, targetRatio: 1.8, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'gallery-c', targetArea: 250, targetRatio: 1.5, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'storage', targetArea: 120, targetRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
    ],
    adjacencies: [
      { a: 'lobby', b: 'gallery-a', weight: 2.0 },
      { a: 'lobby', b: 'gallery-b', weight: 2.0 },
      { a: 'lobby', b: 'gallery-c', weight: 2.0 },
      { a: 'gallery-a', b: 'gallery-b', weight: 1.5 },
      { a: 'gallery-b', b: 'gallery-c', weight: 1.5 },
      { a: 'lobby', b: 'storage', weight: 1.0 },
    ],
    startPoint: { x: 40, y: 5 },
  },
  'clinic': {
    boundary: [
      { x: 0, y: 0 },
      { x: 55, y: 0 },
      { x: 55, y: 45 },
      { x: 0, y: 45 },
    ],
    rooms: [
      { id: 'waiting', targetArea: 200, targetRatio: 1.7, corridorRule: CorridorRule.ALL_SIDES },
      { id: 'reception', targetArea: 100, targetRatio: 1.4, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'exam-1', targetArea: 120, targetRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'exam-2', targetArea: 120, targetRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'exam-3', targetArea: 120, targetRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'lab', targetArea: 150, targetRatio: 1.3, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'staff', targetArea: 90, targetRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
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
    startPoint: { x: 27, y: 5 },
  },
  'restaurant': {
    boundary: [
      { x: 0, y: 0 },
      { x: 65, y: 0 },
      { x: 65, y: 55 },
      { x: 0, y: 55 },
    ],
    rooms: [
      { id: 'entrance', targetArea: 80, targetRatio: 1.2, corridorRule: CorridorRule.ALL_SIDES },
      { id: 'dining-main', targetArea: 400, targetRatio: 1.7, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'dining-private', targetArea: 150, targetRatio: 1.4, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'bar', targetArea: 180, targetRatio: 2.0, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'kitchen', targetArea: 250, targetRatio: 1.4, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'storage', targetArea: 100, targetRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'restrooms', targetArea: 120, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
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
    startPoint: { x: 32, y: 5 },
  },
  'palace': {
    boundary: [
      { x: 0, y: 0 },
      { x: 140, y: 0 },
      { x: 140, y: 100 },
      { x: 0, y: 100 },
    ],
    rooms: [
      // Grand Public Spaces
      { id: 'grand-entrance', targetArea: 350, targetRatio: 1.6, corridorRule: CorridorRule.ALL_SIDES },
      { id: 'main-throne', targetArea: 500, targetRatio: 1.8, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'lesser-throne', targetArea: 280, targetRatio: 1.5, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'grand-ballroom', targetArea: 700, targetRatio: 2.0, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'small-ballroom', targetArea: 320, targetRatio: 1.6, corridorRule: CorridorRule.TWO_SIDES },

      // Royal Private Quarters
      { id: 'king-chamber', targetArea: 300, targetRatio: 1.4, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'queen-chamber', targetArea: 300, targetRatio: 1.4, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'prince-chamber-1', targetArea: 200, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'prince-chamber-2', targetArea: 200, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'princess-chamber', targetArea: 200, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },

      // Royal Studies & Libraries
      { id: 'royal-study', targetArea: 220, targetRatio: 1.4, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'royal-library', targetArea: 420, targetRatio: 1.6, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'royal-archives', targetArea: 200, targetRatio: 1.4, corridorRule: CorridorRule.ONE_SIDE },

      // Dining & Kitchen Areas
      { id: 'grand-dining', targetArea: 450, targetRatio: 1.7, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'formal-dining', targetArea: 260, targetRatio: 1.5, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'breakfast-room', targetArea: 160, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'main-kitchen', targetArea: 320, targetRatio: 1.4, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'secondary-kitchen', targetArea: 190, targetRatio: 1.3, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'pantry', targetArea: 130, targetRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'wine-cellar', targetArea: 170, targetRatio: 1.4, corridorRule: CorridorRule.ONE_SIDE },

      // Galleries & Art Spaces
      { id: 'great-gallery', targetArea: 500, targetRatio: 2.0, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'portrait-gallery', targetArea: 380, targetRatio: 1.7, corridorRule: CorridorRule.TWO_SIDES },

      // Religious Spaces
      { id: 'chapel', targetArea: 300, targetRatio: 1.5, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'prayer-room', targetArea: 140, targetRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },

      // Administrative & Strategic
      { id: 'treasury', targetArea: 190, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'war-room', targetArea: 260, targetRatio: 1.4, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'council-chamber', targetArea: 280, targetRatio: 1.5, corridorRule: CorridorRule.TWO_SIDES },

      // Guard Rooms & Security
      { id: 'guard-north', targetArea: 130, targetRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'guard-south', targetArea: 130, targetRatio: 1.2, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'guard-east', targetArea: 120, targetRatio: 1.0, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'guard-west', targetArea: 120, targetRatio: 1.0, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'armory', targetArea: 200, targetRatio: 1.4, corridorRule: CorridorRule.TWO_SIDES },

      // Guest & Servant Areas
      { id: 'guest-chamber-1', targetArea: 160, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'guest-chamber-2', targetArea: 160, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'guest-chamber-3', targetArea: 160, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'servant-hall', targetArea: 220, targetRatio: 1.5, corridorRule: CorridorRule.TWO_SIDES },
      { id: 'servant-quarters', targetArea: 190, targetRatio: 1.4, corridorRule: CorridorRule.ONE_SIDE },

      // Courtyards & Gardens
      { id: 'garden-court', targetArea: 300, targetRatio: 1.0, corridorRule: CorridorRule.ALL_SIDES },
      { id: 'fountain-court', targetArea: 220, targetRatio: 1.0, corridorRule: CorridorRule.ALL_SIDES },
      { id: 'grand-terrace', targetArea: 280, targetRatio: 1.5, corridorRule: CorridorRule.TWO_SIDES },
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
    startPoint: { x: 70, y: 5 },
  },
  'hotel': {
    boundary: [
      { x: 0, y: 0 },
      { x: 120, y: 0 },
      { x: 120, y: 90 },
      { x: 0, y: 90 },
    ],
    rooms: [
      // Corridors
      { id: 'corridor-1', targetArea: 150, targetRatio: 0.01, corridorRule: CorridorRule.ALL_SIDES },
      { id: 'corridor-2', targetArea: 150, targetRatio: 0.01, corridorRule: CorridorRule.ALL_SIDES },
      { id: 'corridor-3', targetArea: 150, targetRatio: 0.01, corridorRule: CorridorRule.ALL_SIDES },
      { id: 'corridor-4', targetArea: 150, targetRatio: 0.01, corridorRule: CorridorRule.ALL_SIDES },
      { id: 'corridor-5', targetArea: 150, targetRatio: 0.01, corridorRule: CorridorRule.ALL_SIDES },
      { id: 'corridor-6', targetArea: 150, targetRatio: 0.01, corridorRule: CorridorRule.ALL_SIDES },

      // Floor 1 apartments
      { id: 'apt-1-1', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-1-2', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-1-3', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-1-4', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-1-5', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-1-6', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-1-7', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-1-8', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-1-9', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-1-10', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },

      // Floor 2 apartments
      { id: 'apt-2-1', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-2-2', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-2-3', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-2-4', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-2-5', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-2-6', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-2-7', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-2-8', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-2-9', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-2-10', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },

      // Floor 3 apartments
      { id: 'apt-3-1', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-3-2', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-3-3', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-3-4', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-3-5', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-3-6', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-3-7', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-3-8', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-3-9', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-3-10', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },

      // Floor 4 apartments
      { id: 'apt-4-1', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-4-2', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-4-3', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-4-4', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-4-5', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-4-6', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-4-7', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-4-8', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-4-9', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-4-10', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },

      // Floor 5 apartments
      { id: 'apt-5-1', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-5-2', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-5-3', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-5-4', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-5-5', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-5-6', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-5-7', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-5-8', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-5-9', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-5-10', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },

      // Floor 6 apartments
      { id: 'apt-6-1', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-6-2', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-6-3', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-6-4', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-6-5', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-6-6', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-6-7', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-6-8', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-6-9', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
      { id: 'apt-6-10', targetArea: 80, targetRatio: 1.3, corridorRule: CorridorRule.ONE_SIDE },
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
    startPoint: { x: 60, y: 5 },
  },
};
