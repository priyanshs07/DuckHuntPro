export enum GameState {
  SPLASH = 'SPLASH',
  HOME = 'HOME',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  ROUND_WIN = 'ROUND_WIN',
  LEVEL_WIN = 'LEVEL_WIN',
  ROUND_LOSE = 'ROUND_LOSE',
  SESSION_SUMMARY = 'SESSION_SUMMARY',
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Bird {
  id: number;
  position: Vector2;
  velocity: Vector2;
  isDead: boolean;
  type: 'normal' | 'fast' | 'zigzag';
  scale: number;
}

export interface LevelConfig {
  id: number;
  totalBirds: number;
  totalAmmo: number;
  spawnRate: number; // ms
  speedMultiplier: number;
}

export interface GameStats {
  score: number;
  birdsKilled: number;
  shotsFired: number;
}