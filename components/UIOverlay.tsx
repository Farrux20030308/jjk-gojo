import React from 'react';
import { Cooldowns, GameStats, Player } from '../types';
import { ABILITY_COSTS, COOLDOWNS, PLAYER_STATS } from '../constants';

interface UIOverlayProps {
  player: Player;
  cooldowns: Cooldowns;
  stats: GameStats;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ player, cooldowns, stats }) => {
  // Helper to calculate percentage for CSS width
  const getPct = (current: number, max: number) => Math.max(0, Math.min(100, (current / max) * 100));
  
  // Helper for cooldown overlay height (0% height means ready)
  const getCdPct = (current: number, max: number) => Math.max(0, Math.min(100, (current / max) * 100));

  const AbilityIcon = ({ 
    label, 
    keyName, 
    color, 
    cost, 
    cd, 
    maxCd 
  }: { label: string, keyName: string, color: string, cost: number, cd: number, maxCd: number }) => {
    const canAfford = player.energy >= cost;
    const isReady = cd <= 0;
    
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="relative w-16 h-16 bg-gray-900 border-2 border-gray-700 rounded-lg overflow-hidden shadow-lg">
          {/* Background Indicator of Ability Type */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundColor: color }}></div>
          
          {/* Cooldown Mask */}
          <div 
            className="absolute bottom-0 left-0 w-full bg-black/80 transition-all duration-75"
            style={{ height: `${getCdPct(cd, maxCd)}%` }}
          />

          {/* Not enough energy overlay */}
          {!canAfford && isReady && (
            <div className="absolute inset-0 bg-blue-900/50 flex items-center justify-center">
              <span className="text-xs text-blue-200 font-bold">LOW MP</span>
            </div>
          )}

          {/* Keybind */}
          <div className="absolute top-1 left-1 bg-black/50 px-1.5 rounded text-xs font-mono text-white">
            {keyName}
          </div>
          
          {/* Label */}
          <div className="absolute bottom-1 w-full text-center text-[10px] font-bold tracking-wider text-white drop-shadow-md">
            {label}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
      {/* Top Bar: Stats */}
      <div className="flex justify-between items-start">
        <div className="bg-black/60 backdrop-blur-sm p-4 rounded-lg border border-gray-800 text-white">
          <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            GOJO SATORU
          </div>
          <div className="text-sm text-gray-400">Score: {stats.score.toLocaleString()}</div>
          <div className="text-sm text-gray-400">Wave: {stats.wave}</div>
        </div>
        
        <div className="flex flex-col gap-2 w-64">
          {/* HP Bar */}
          <div className="relative h-6 bg-gray-900 rounded-full border border-gray-700 overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-200"
              style={{ width: `${getPct(player.hp, PLAYER_STATS.MAX_HP)}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md">
              HP {Math.ceil(player.hp)} / {PLAYER_STATS.MAX_HP}
            </div>
          </div>

          {/* Energy Bar */}
          <div className="relative h-6 bg-gray-900 rounded-full border border-gray-700 overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-200"
              style={{ width: `${getPct(player.energy, PLAYER_STATS.MAX_ENERGY)}%` }}
            />
             <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md">
              CURSED ENERGY {Math.floor(player.energy)}
            </div>
          </div>
          
          <div className="text-right text-xs text-gray-300 mt-1">
            Limitless: <span className={player.isLimitlessActive ? "text-green-400 font-bold" : "text-gray-500"}>
              {player.isLimitlessActive ? "ACTIVE (SPACE)" : "OFF (SPACE)"}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Abilities */}
      <div className="flex justify-center gap-4 mb-4">
        <AbilityIcon 
          label="BLUE" 
          keyName="1" 
          color="#00BFFF" 
          cost={ABILITY_COSTS.BLUE} 
          cd={cooldowns.blue}
          maxCd={COOLDOWNS.BLUE}
        />
        <AbilityIcon 
          label="RED" 
          keyName="2" 
          color="#FF4500" 
          cost={ABILITY_COSTS.RED} 
          cd={cooldowns.red}
          maxCd={COOLDOWNS.RED}
        />
        <AbilityIcon 
          label="PURPLE" 
          keyName="3" 
          color="#8A2BE2" 
          cost={ABILITY_COSTS.PURPLE} 
          cd={cooldowns.purple}
          maxCd={COOLDOWNS.PURPLE}
        />
        <AbilityIcon 
          label="DOMAIN" 
          keyName="4" 
          color="#FFFFFF" 
          cost={ABILITY_COSTS.DOMAIN} 
          cd={cooldowns.domain}
          maxCd={COOLDOWNS.DOMAIN}
        />
      </div>
    </div>
  );
};

export default UIOverlay;