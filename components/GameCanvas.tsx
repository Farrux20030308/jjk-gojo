import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Player, Enemy, Projectile, Particle, GameState, Vector2, Cooldowns, GameStats, EnemyType 
} from '../types';
import { 
  PLAYER_STATS, ABILITY_COSTS, COOLDOWNS, ABILITY_STATS, 
  COLORS, ENEMY_SPAWN_RATE, GAME_WIDTH, GAME_HEIGHT 
} from '../constants';
import UIOverlay from './UIOverlay';

// Utility: Generate ID
const uid = () => Math.random().toString(36).substr(2, 9);

// Utility: Distance
const dist = (a: Vector2, b: Vector2) => Math.hypot(a.x - b.x, a.y - b.y);

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>(0);
  
  // Game State Refs (Mutable for performance)
  const gameState = useRef<GameState>(GameState.MENU);
  const keys = useRef<{ [key: string]: boolean }>({});
  const mouse = useRef<Vector2>({ x: 0, y: 0 });
  
  // Assets
  const domainBgImage = useRef<HTMLImageElement | null>(null);

  // Entities
  const player = useRef<Player>({
    id: 'player',
    position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    velocity: { x: 0, y: 0 },
    radius: PLAYER_STATS.RADIUS,
    color: COLORS.PLAYER,
    hp: PLAYER_STATS.MAX_HP,
    maxHp: PLAYER_STATS.MAX_HP,
    energy: PLAYER_STATS.MAX_ENERGY,
    maxEnergy: PLAYER_STATS.MAX_ENERGY,
    isLimitlessActive: false,
    angle: 0,
  });
  
  const enemies = useRef<Enemy[]>([]);
  const projectiles = useRef<Projectile[]>([]);
  const particles = useRef<Particle[]>([]);
  
  // Timers & Stats
  const frameCount = useRef<number>(0);
  const cooldowns = useRef<Cooldowns>({ blue: 0, red: 0, purple: 0, domain: 0 });
  const stats = useRef<GameStats>({ score: 0, wave: 1 });
  const domainActiveTimer = useRef<number>(0); // > 0 means domain is active

  // React State for UI updates (throttled)
  const [uiState, setUiState] = useState<{
    player: Player;
    cooldowns: Cooldowns;
    stats: GameStats;
    gameState: GameState;
  } | null>(null);

  // --- Input Handling & Init ---
  useEffect(() => {
    // Load Domain Background Image
    const img = new Image();
    img.src = "https://assets.userstyles.org/assets_packs/type=style/user_id=3655453/screenshot_8a3508e6-5ec2-4030-bc62-83e8fedbf0a2.webp";
    domainBgImage.current = img;

    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === 'Space') {
        // Toggle Limitless
        player.current.isLimitlessActive = !player.current.isLimitlessActive;
      }
      
      // Ability Triggers
      if (gameState.current === GameState.PLAYING) {
        if (e.key === '1') tryUseAbility('BLUE');
        if (e.key === '2') tryUseAbility('RED');
        if (e.key === '3') tryUseAbility('PURPLE');
        if (e.key === '4') tryUseAbility('DOMAIN');
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tryUseAbility = (type: 'BLUE' | 'RED' | 'PURPLE' | 'DOMAIN') => {
    const p = player.current;
    const cds = cooldowns.current;
    const cost = ABILITY_COSTS[type];
    
    // Checks
    if (p.energy < cost) return;
    if (type === 'BLUE' && cds.blue > 0) return;
    if (type === 'RED' && cds.red > 0) return;
    if (type === 'PURPLE' && cds.purple > 0) return;
    if (type === 'DOMAIN' && cds.domain > 0) return;

    // Execute
    p.energy -= cost;
    
    if (type === 'BLUE') {
      cds.blue = COOLDOWNS.BLUE;
      projectiles.current.push({
        id: uid(),
        type: 'BLUE',
        position: { ...mouse.current }, // Spawns at mouse cursor
        velocity: { x: 0, y: 0 },
        radius: 10, // Starts small, expands
        color: COLORS.BLUE,
        duration: ABILITY_STATS.BLUE.duration,
        maxDuration: ABILITY_STATS.BLUE.duration,
        scale: 0,
        damage: 0,
      });
    }
    
    if (type === 'RED') {
      cds.red = COOLDOWNS.RED;
      const angle = Math.atan2(mouse.current.y - p.position.y, mouse.current.x - p.position.x);
      projectiles.current.push({
        id: uid(),
        type: 'RED',
        position: { ...p.position },
        velocity: { 
          x: Math.cos(angle) * ABILITY_STATS.RED.speed, 
          y: Math.sin(angle) * ABILITY_STATS.RED.speed 
        },
        radius: ABILITY_STATS.RED.radius,
        color: COLORS.RED,
        duration: 60, // Travel time before explode or hits
        maxDuration: 60,
        scale: 1,
        damage: ABILITY_STATS.RED.damage,
      });
    }

    if (type === 'PURPLE') {
      cds.purple = COOLDOWNS.PURPLE;
      const angle = Math.atan2(mouse.current.y - p.position.y, mouse.current.x - p.position.x);
      projectiles.current.push({
        id: uid(),
        type: 'PURPLE',
        position: { ...p.position },
        velocity: { 
          x: Math.cos(angle) * ABILITY_STATS.PURPLE.speed, 
          y: Math.sin(angle) * ABILITY_STATS.PURPLE.speed 
        },
        radius: ABILITY_STATS.PURPLE.radius,
        color: COLORS.PURPLE,
        duration: 120, 
        maxDuration: 120,
        scale: 1,
        damage: ABILITY_STATS.PURPLE.damage,
      });
      // Recoil
      p.velocity.x -= Math.cos(angle) * 10;
      p.velocity.y -= Math.sin(angle) * 10;
    }

    if (type === 'DOMAIN') {
      cds.domain = COOLDOWNS.DOMAIN;
      domainActiveTimer.current = ABILITY_STATS.DOMAIN.duration;
      // Visual effect
      createParticles(p.position.x, p.position.y, 50, '#FFFFFF', 5);
    }
  };

  // --- Game Loop ---
  const update = () => {
    if (gameState.current !== GameState.PLAYING) return;
    
    frameCount.current++;
    const p = player.current;

    // 1. Player Movement
    const moveSpeed = PLAYER_STATS.SPEED;
    let dx = 0;
    let dy = 0;
    if (keys.current['KeyW']) dy -= 1;
    if (keys.current['KeyS']) dy += 1;
    if (keys.current['KeyA']) dx -= 1;
    if (keys.current['KeyD']) dx += 1;

    // Normalize diagonal
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
    }

    p.velocity.x = dx * moveSpeed;
    p.velocity.y = dy * moveSpeed;
    
    p.position.x = Math.max(p.radius, Math.min(window.innerWidth - p.radius, p.position.x + p.velocity.x));
    p.position.y = Math.max(p.radius, Math.min(window.innerHeight - p.radius, p.position.y + p.velocity.y));

    // 2. Limitless Logic (Passive Energy Drain)
    if (p.isLimitlessActive) {
      if (p.energy > 0) {
        p.energy -= PLAYER_STATS.LIMITLESS_DRAIN;
      } else {
        p.isLimitlessActive = false; // Force disable if no energy
      }
    }

    // 3. Energy Regen
    // Always regenerate if not at max, regardless of limitless state
    if (p.energy < p.maxEnergy) {
      p.energy += PLAYER_STATS.ENERGY_REGEN;
      if (p.energy > p.maxEnergy) p.energy = p.maxEnergy;
    }

    // 4. Cooldowns Tick
    const cds = cooldowns.current;
    if (cds.blue > 0) cds.blue--;
    if (cds.red > 0) cds.red--;
    if (cds.purple > 0) cds.purple--;
    if (cds.domain > 0) cds.domain--;
    if (domainActiveTimer.current > 0) domainActiveTimer.current--;

    // 5. Enemy Spawning
    const isDomainActive = domainActiveTimer.current > 0;
    if (frameCount.current % Math.max(20, ENEMY_SPAWN_RATE - stats.current.wave * 2) === 0 && !isDomainActive) {
      spawnEnemy();
    }
    // Increase wave difficulty
    if (frameCount.current % 1200 === 0) stats.current.wave++;

    // 5.5 NEW: Interaction Logic (Red + Blue = Hollow Purple)
    const activeProjs = projectiles.current;
    const consumedIndices = new Set<number>();
    
    for (let i = 0; i < activeProjs.length; i++) {
      if (consumedIndices.has(i)) continue;
      const p1 = activeProjs[i];
      
      // Only check Red hitting Blue
      if (p1.type === 'RED') {
        for (let j = 0; j < activeProjs.length; j++) {
           if (i === j || consumedIndices.has(j)) continue;
           const p2 = activeProjs[j];
           
           if (p2.type === 'BLUE') {
             const blueR = ABILITY_STATS.BLUE.radius * p2.scale;
             // Check collision (adding some buffer to make it easier to hit)
             if (dist(p1.position, p2.position) < p1.radius + blueR + 20) {
               // Merge into Hollow Purple Explosion
               createHollowPurpleExplosion(p2.position);
               consumedIndices.add(i);
               consumedIndices.add(j);
               break; // p1 is consumed
             }
           }
        }
      }
    }

    // Remove merged projectiles
    if (consumedIndices.size > 0) {
       projectiles.current = activeProjs.filter((_, idx) => !consumedIndices.has(idx));
    }

    // 6. Projectiles Update
    for (let i = projectiles.current.length - 1; i >= 0; i--) {
      const proj = projectiles.current[i];
      
      // Handle the Expansion Wave Logic separately
      if (proj.isWave) {
         proj.duration--;
         // Grow scale linearly
         proj.scale += 0.025; 
         const maxRadius = Math.min(window.innerWidth, window.innerHeight) * 0.7; // Bigger explosion
         const currentRadius = maxRadius * proj.scale;
         
         // Wave Collision
         enemies.current.forEach(e => {
            const d = dist(proj.position, e.position);
            // Hit if inside the wave radius
            if (d < currentRadius) {
               e.hp -= 9999; // Instakill
               if (frameCount.current % 5 === 0) {
                 createParticles(e.position.x, e.position.y, 2, COLORS.PURPLE, 5);
               }
            }
         });

         if (proj.duration <= 0 || proj.scale >= 1.5) {
            projectiles.current.splice(i, 1);
         }
         continue; // Skip standard movement
      }

      proj.duration--;
      
      if (proj.type === 'BLUE') {
        // Stationary, Pulls enemies
        // Expand radius
        if (proj.scale < 1) proj.scale += 0.05;
        const currentRadius = ABILITY_STATS.BLUE.radius * proj.scale;
        
        // Pull Logic
        enemies.current.forEach(enemy => {
          const d = dist(proj.position, enemy.position);
          if (d < currentRadius * 3) {
            const angle = Math.atan2(proj.position.y - enemy.position.y, proj.position.x - enemy.position.x);
            enemy.position.x += Math.cos(angle) * ABILITY_STATS.BLUE.pullForce * 5;
            enemy.position.y += Math.sin(angle) * ABILITY_STATS.BLUE.pullForce * 5;
            enemy.hp -= 0.1; // Slight DoT
          }
        });
      } else {
        // Red and Purple Move
        proj.position.x += proj.velocity.x;
        proj.position.y += proj.velocity.y;
      }

      // Cleanup
      if (proj.duration <= 0 || 
          proj.position.x < -100 || proj.position.x > window.innerWidth + 100 || 
          proj.position.y < -100 || proj.position.y > window.innerHeight + 100) {
            
        if (proj.type === 'RED') {
          // Explode at end of duration
           explodeRed(proj.position);
        }
        projectiles.current.splice(i, 1);
      }
    }

    // 7. Enemy Logic
    for (let i = enemies.current.length - 1; i >= 0; i--) {
      const enemy = enemies.current[i];
      
      if (!isDomainActive) {
        // Move towards player
        const angle = Math.atan2(p.position.y - enemy.position.y, p.position.x - enemy.position.x);
        enemy.velocity.x = Math.cos(angle) * enemy.speed;
        enemy.velocity.y = Math.sin(angle) * enemy.speed;

        // Limitless Interaction
        const dToPlayer = dist(p.position, enemy.position);
        if (p.isLimitlessActive && dToPlayer < p.radius + enemy.radius + 30) {
          // Push back gently
          enemy.velocity.x = -Math.cos(angle) * 2;
          enemy.velocity.y = -Math.sin(angle) * 2;
        }

        enemy.position.x += enemy.velocity.x;
        enemy.position.y += enemy.velocity.y;

        // Collision with Player
        if (dToPlayer < p.radius + enemy.radius) {
          p.hp -= enemy.damage;
          // Bounce back
          enemy.position.x -= Math.cos(angle) * 10;
          enemy.position.y -= Math.sin(angle) * 10;
          if (p.hp <= 0) {
            gameState.current = GameState.GAME_OVER;
          }
        }
      } else {
        // Domain is active: Stunned
        enemy.velocity.x = 0;
        enemy.velocity.y = 0;
        enemy.hp -= 0.5; // Domain DoT
      }

      // Collision with Projectiles
      for (let j = projectiles.current.length - 1; j >= 0; j--) {
        const proj = projectiles.current[j];
        if (proj.isWave) continue; // Handled in projectile loop

        const d = dist(proj.position, enemy.position);
        
        if (proj.type === 'RED') {
          if (d < proj.radius + enemy.radius) {
            explodeRed(proj.position);
            projectiles.current.splice(j, 1); // Red destroys on impact
          }
        } else if (proj.type === 'PURPLE') {
          if (d < proj.radius + enemy.radius) {
            enemy.hp -= ABILITY_STATS.PURPLE.damage;
            createParticles(enemy.position.x, enemy.position.y, 5, COLORS.PURPLE, 2);
          }
        }
      }

      // Death
      if (enemy.hp <= 0) {
        enemies.current.splice(i, 1);
        stats.current.score += 10;
        createParticles(enemy.position.x, enemy.position.y, 10, enemy.color, 3);
      }
    }

    // 8. Particle Update
    for (let i = particles.current.length - 1; i >= 0; i--) {
      const part = particles.current[i];
      part.position.x += part.velocity.x;
      part.position.y += part.velocity.y;
      part.life--;
      part.size *= 0.95;
      if (part.life <= 0) particles.current.splice(i, 1);
    }
  };

  const explodeRed = (pos: Vector2) => {
    createParticles(pos.x, pos.y, 20, COLORS.RED, 4);
    enemies.current.forEach(e => {
      const d = dist(pos, e.position);
      if (d < 150) {
        e.hp -= ABILITY_STATS.RED.damage;
        // Knockback
        const ang = Math.atan2(e.position.y - pos.y, e.position.x - pos.x);
        e.position.x += Math.cos(ang) * ABILITY_STATS.RED.pushForce;
        e.position.y += Math.sin(ang) * ABILITY_STATS.RED.pushForce;
      }
    });
  };

  const createHollowPurpleExplosion = (pos: Vector2) => {
    // Spawns a special "Wave" projectile
    createParticles(pos.x, pos.y, 30, COLORS.PURPLE, 10);
    createParticles(pos.x, pos.y, 20, '#FFF', 5);
    
    projectiles.current.push({
      id: uid(),
      type: 'PURPLE',
      position: { ...pos },
      velocity: { x: 0, y: 0 },
      radius: 0, // Ignored by renderer for Wave
      scale: 0.1, // Start small
      color: COLORS.PURPLE,
      duration: 50, // Animation duration
      maxDuration: 50,
      damage: 9999,
      isWave: true // Special Flag
    });
  };

  const spawnEnemy = () => {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.max(window.innerWidth, window.innerHeight) / 1.5; // Spawn off screen
    const x = window.innerWidth / 2 + Math.cos(angle) * r;
    const y = window.innerHeight / 2 + Math.sin(angle) * r;
    
    // Random type based on wave
    const rand = Math.random();
    let type = EnemyType.BASIC;
    let hp = 30 + stats.current.wave * 5;
    let speed = 2 + stats.current.wave * 0.1;
    let radius = 15;
    let color = '#444'; // Basic Curse Color

    if (rand < 0.2 && stats.current.wave > 2) {
      type = EnemyType.TANK;
      hp *= 3;
      speed *= 0.5;
      radius = 25;
      color = '#2a1a1a'; // Dark Redish
    } else if (rand > 0.8 && stats.current.wave > 1) {
      type = EnemyType.SPEEDSTER;
      hp *= 0.6;
      speed *= 1.5;
      radius = 12;
      color = '#334433'; // Greenish
    }

    enemies.current.push({
      id: uid(),
      position: { x, y },
      velocity: { x: 0, y: 0 },
      radius,
      color,
      hp,
      maxHp: hp,
      damage: 10,
      speed,
      type,
      isStunned: false,
      stunTimer: 0,
    });
  };

  const createParticles = (x: number, y: number, count: number, color: string, speed: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const v = Math.random() * speed;
      particles.current.push({
        id: uid(),
        position: { x, y },
        velocity: { x: Math.cos(angle) * v, y: Math.sin(angle) * v },
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color,
        size: Math.random() * 4 + 2,
      });
    }
  };

  // --- Render Loop ---
  const draw = (ctx: CanvasRenderingContext2D) => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Clear Screen
    ctx.clearRect(0, 0, width, height);

    // Domain Expansion Background Effect
    if (domainActiveTimer.current > 0) {
      if (domainBgImage.current && domainBgImage.current.complete) {
        // Draw Image to Cover
        const img = domainBgImage.current;
        const scale = Math.max(width / img.width, height / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (width - w) / 2;
        const y = (height - h) / 2;
        
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.drawImage(img, x, y, w, h);
        ctx.restore();
      } else {
        // Fallback
        ctx.fillStyle = '#020005';
        ctx.fillRect(0, 0, width, height);
      }
    } else {
      // Normal grid background
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      const gridSize = 50;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }
    }

    // Draw Particles
    particles.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Draw Projectiles
    projectiles.current.forEach(proj => {
      ctx.save();
      ctx.translate(proj.position.x, proj.position.y);
      
      if (proj.isWave) {
         // Hollow Purple Explosion (Diffuse Wave)
         const maxRadius = Math.min(width, height) * 0.7;
         const currentRadius = maxRadius * proj.scale;
         
         // Radial Gradient for Diffuse Glow
         const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, currentRadius);
         grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');    // Core: White Bright
         grad.addColorStop(0.3, 'rgba(180, 80, 255, 0.7)');   // Middle: Bright Purple
         grad.addColorStop(0.7, 'rgba(120, 0, 220, 0.2)');   // Edge: Soft Purple
         grad.addColorStop(1, 'rgba(50, 0, 100, 0)');         // Fade out

         ctx.fillStyle = grad;
         ctx.beginPath();
         ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
         ctx.fill();

         // Subtle outer pulse (No hard stroke)
         ctx.shadowBlur = 60;
         ctx.shadowColor = '#8A2BE2';
         ctx.globalAlpha = 0.4;
         ctx.beginPath();
         ctx.arc(0, 0, currentRadius * 0.9, 0, Math.PI * 2);
         ctx.fillStyle = '#8A2BE2';
         ctx.fill();
         
         ctx.globalAlpha = 1;
         ctx.shadowBlur = 0;
         
      } else if (proj.type === 'BLUE') {
        const currentR = ABILITY_STATS.BLUE.radius * proj.scale;
        const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, currentR);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.4, '#00BFFF');
        grad.addColorStop(1, 'rgba(0, 0, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, currentR, 0, Math.PI * 2);
        ctx.fill();
        
        // Debris effect moving inward
        if (frameCount.current % 5 === 0) {
          ctx.strokeStyle = '#fff';
          ctx.beginPath();
          const a = Math.random() * Math.PI * 2;
          ctx.moveTo(Math.cos(a)*currentR, Math.sin(a)*currentR);
          ctx.lineTo(0,0);
          ctx.stroke();
        }

      } else if (proj.type === 'RED') {
        ctx.fillStyle = COLORS.RED;
        ctx.shadowColor = COLORS.RED;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (proj.type === 'PURPLE') {
        ctx.fillStyle = COLORS.PURPLE;
        ctx.shadowColor = COLORS.PURPLE;
        ctx.shadowBlur = 40;
        ctx.beginPath();
        ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
        ctx.fill();
        // Trail
        createParticles(proj.position.x, proj.position.y, 2, COLORS.PURPLE, 1);
      }
      ctx.restore();
    });

    // Draw Enemies
    enemies.current.forEach(e => {
      ctx.save();
      ctx.translate(e.position.x, e.position.y);
      
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(0, e.radius, e.radius, e.radius * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = e.color;
      if (domainActiveTimer.current > 0) ctx.fillStyle = '#888888'; // Greyed out in domain
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Eyes
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(-e.radius/3, -e.radius/4, 2, 0, Math.PI*2);
      ctx.arc(e.radius/3, -e.radius/4, 2, 0, Math.PI*2);
      ctx.fill();

      // HP Bar
      const hpPct = e.hp / e.maxHp;
      ctx.fillStyle = 'red';
      ctx.fillRect(-e.radius, -e.radius - 10, e.radius * 2, 4);
      ctx.fillStyle = 'green';
      ctx.fillRect(-e.radius, -e.radius - 10, e.radius * 2 * hpPct, 4);

      ctx.restore();
    });

    // Draw Player
    const p = player.current;
    ctx.save();
    ctx.translate(p.position.x, p.position.y);

    // Limitless Barrier
    if (p.isLimitlessActive) {
      ctx.strokeStyle = COLORS.LIMITLESS_SHIELD;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 20, 0, Math.PI * 2);
      ctx.stroke();
      // Animation
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 25 + Math.sin(frameCount.current * 0.1) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.stroke();
    }

    // Character
    ctx.fillStyle = COLORS.PLAYER; // White hair
    ctx.shadowColor = 'white';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Blindfold
    ctx.fillStyle = '#000';
    ctx.fillRect(-p.radius, -5, p.radius * 2, 6);

    // Outfit (simple collar)
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(0, p.radius, p.radius, Math.PI, 0); // half circle bottom
    ctx.fill();

    ctx.restore();
  };

  const loop = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        update();
        draw(ctx);
        
        // Update UI state every frame (or throttle if needed)
        // Since React 18 batches updates, this is usually fine for simple overlays
        if (gameState.current === GameState.PLAYING) {
           setUiState({
             player: { ...player.current },
             cooldowns: { ...cooldowns.current },
             stats: { ...stats.current },
             gameState: gameState.current
           });
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(loop);
  };

  const startGame = () => {
    // Reset Everything
    player.current.hp = PLAYER_STATS.MAX_HP;
    player.current.energy = PLAYER_STATS.MAX_ENERGY;
    player.current.position = { x: window.innerWidth/2, y: window.innerHeight/2 };
    enemies.current = [];
    projectiles.current = [];
    particles.current = [];
    cooldowns.current = { blue: 0, red: 0, purple: 0, domain: 0 };
    stats.current = { score: 0, wave: 1 };
    domainActiveTimer.current = 0;
    
    gameState.current = GameState.PLAYING;
    setUiState({
      player: player.current,
      cooldowns: cooldowns.current,
      stats: stats.current,
      gameState: GameState.PLAYING
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    // Start loop
    animationFrameId.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      
      {uiState && uiState.gameState === GameState.PLAYING && (
        <UIOverlay 
          player={uiState.player} 
          cooldowns={uiState.cooldowns}
          stats={uiState.stats}
        />
      )}

      {(gameState.current === GameState.MENU || gameState.current === GameState.GAME_OVER) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center p-8 border-2 border-blue-500 rounded-xl bg-gray-900 shadow-[0_0_50px_rgba(0,191,255,0.3)]">
            <h1 className="text-5xl font-black text-white mb-2 tracking-tighter">
              {gameState.current === GameState.GAME_OVER ? "YOU DIED" : "JUJUTSU SORCERER"}
            </h1>
            <h2 className="text-xl text-blue-400 mb-8 font-light tracking-widest">
              {gameState.current === GameState.GAME_OVER ? `SCORE: ${stats.current.score}` : "THE STRONGEST"}
            </h2>
            
            <button 
              onClick={startGame}
              className="px-8 py-3 bg-white text-black font-bold text-lg rounded hover:bg-blue-400 hover:scale-105 transition-all"
            >
              {gameState.current === GameState.GAME_OVER ? "TRY AGAIN" : "START BATTLE"}
            </button>
            
            <div className="mt-8 text-left text-gray-400 text-sm space-y-1">
              <p><span className="text-white font-bold">WASD</span> to Move</p>
              <p><span className="text-white font-bold">SPACE</span> Toggle Limitless (Drains Energy)</p>
              <p><span className="text-blue-400 font-bold">[1] BLUE</span> Attraction Orb (Mouse)</p>
              <p><span className="text-red-500 font-bold">[2] RED</span> Repulsion Blast (Mouse Direction)</p>
              <p><span className="text-purple-500 font-bold">[3] PURPLE</span> Erasure Beam</p>
              <p><span className="text-gray-100 font-bold">[4] DOMAIN</span> Infinite Void (Stuns All)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;