export type Vector2 = {
  x: number;
  y: number;
};

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export enum EnemyType {
  BASIC = 'BASIC',
  TANK = 'TANK',
  SPEEDSTER = 'SPEEDSTER',
}

export interface Entity {
  id: string;
  position: Vector2;
  radius: number;
  velocity: Vector2;
  color: string;
}

export interface Player extends Entity {
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  isLimitlessActive: boolean;
  angle: number; // Facing direction
}

export interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  type: EnemyType;
  isStunned: boolean;
  stunTimer: number;
}

export interface Projectile extends Entity {
  type: 'BLUE' | 'RED' | 'PURPLE';
  damage: number;
  duration: number; // How long it lasts (frames or ms)
  maxDuration: number;
  scale: number; // Current scale for animations
  isWave?: boolean; // New flag for the expansion wave
}

export interface Particle {
  id: string;
  position: Vector2;
  velocity: Vector2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Cooldowns {
  blue: number;
  red: number;
  purple: number;
  domain: number;
}

export interface GameStats {
  score: number;
  wave: number;
}