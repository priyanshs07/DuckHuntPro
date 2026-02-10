import { LevelConfig } from './types';

export const GAME_WIDTH = 100;
export const GAME_HEIGHT = 42.8; // 21:9

export const MAX_LEVELS = 10;
export const ROUNDS_PER_LEVEL = 7;

export const getLevelConfig = (level: number, round: number): LevelConfig => {
  const safeLevel = Math.max(1, Math.min(level, MAX_LEVELS));
  
  // Capacity:
  // Early levels (1-3): 1 duck per round
  // Mid levels (4-6): 2 ducks per round
  // High levels (7-10): 3 ducks per round
  let totalBirds = 1;
  if (safeLevel >= 4) totalBirds = 2;
  if (safeLevel >= 7) totalBirds = 3;

  // Ammo: 
  // Allow a margin of error. 
  // 1 bird -> 3 ammo (+2)
  // 2 birds -> 5 ammo (+3)
  // 3 birds -> 7 ammo (+4)
  const totalAmmo = totalBirds + 2 + Math.floor(safeLevel / 4);
  
  // Speed scales with Level
  const speedMultiplier = 0.8 + (safeLevel * 0.12);
  
  // Spawn Rate: 
  // We want them to appear relatively quickly once the round starts
  const spawnRate = 800; 

  return {
    id: (safeLevel - 1) * ROUNDS_PER_LEVEL + round,
    totalBirds,
    totalAmmo,
    spawnRate,
    speedMultiplier
  };
};

export const CROSSHAIR_SPEED = 1.5;
export const HITBOX_RADIUS = 6;
export const HORIZON_Y = 60; // Birds cannot go below 60% of screen height