export const GAME_WIDTH = window.innerWidth;
export const GAME_HEIGHT = window.innerHeight;

export const PLAYER_STATS = {
  RADIUS: 15,
  SPEED: 4,
  MAX_HP: 100,
  MAX_ENERGY: 1000, 
  ENERGY_REGEN: 10, // 10 mana per tick
  LIMITLESS_DRAIN: 0.5,
};

export const ABILITY_COSTS = {
  BLUE: 30,
  RED: 40,
  PURPLE: 80,
  DOMAIN: 150,
};

export const COOLDOWNS = {
  BLUE: 120,    // Frames (approx 2s at 60fps)
  RED: 180,     // 3s
  PURPLE: 600,  // 10s
  DOMAIN: 1800, // 30s
};

export const ABILITY_STATS = {
  BLUE: { radius: 100, pullForce: 0.8, duration: 180 },
  RED: { radius: 20, speed: 8, damage: 50, pushForce: 15 },
  PURPLE: { radius: 60, speed: 12, damage: 9999 }, // Instakill mostly
  DOMAIN: { duration: 420 }, // 7 seconds
};

export const ENEMY_SPAWN_RATE = 120; // Frames between spawns initially

export const COLORS = {
  PLAYER: '#FFFFFF',
  PLAYER_OUTLINE: '#000000',
  BLUE: '#00BFFF',
  RED: '#FF4500',
  PURPLE: '#8A2BE2',
  DOMAIN_BG: '#0a0a2a', // Dark cosmic blue
  LIMITLESS_SHIELD: 'rgba(255, 255, 255, 0.2)',
};