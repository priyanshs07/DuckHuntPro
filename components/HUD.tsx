import React from 'react';
import { Pause, Crosshair, Skull, Shell } from 'lucide-react';
import { Joystick } from './Joystick';
import { Vector2 } from '../types';
import { ROUNDS_PER_LEVEL } from '../constants';

interface HUDProps {
  level: number;
  round: number;
  birdsKilled: number;
  totalBirds: number;
  shotsFired: number;
  totalAmmo: number;
  onPause: () => void;
  onJoystickMove: (vec: Vector2) => void;
  onShoot: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  level,
  round,
  birdsKilled,
  totalBirds,
  shotsFired,
  totalAmmo,
  onPause,
  onJoystickMove,
  onShoot
}) => {
  const ammoLeft = totalAmmo - shotsFired;

  // Generate round indicators (1 to 7)
  const roundIndicators = Array.from({ length: ROUNDS_PER_LEVEL }, (_, i) => i + 1);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-40">
      
      {/* Top Right - Minimal Transparent Pause */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <button 
          onClick={onPause}
          className="text-white/40 hover:text-white transition-all active:scale-95 p-2"
        >
          <Pause size={32} strokeWidth={1.5} />
        </button>
      </div>

      {/* Bottom Area - Ground Dashboard
          Reduced padding to be more compact
      */}
      <div className="flex items-end justify-between w-full px-6 pb-2 md:px-12 md:pb-4 pointer-events-auto mt-auto">
        
        {/* Left: Joystick */}
        <div className="relative mb-2">
           {/* Visual anchor for the joystick */}
           <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-32 h-8 bg-black/30 rounded-[100%] blur-md"></div>
           <Joystick onMove={onJoystickMove} />
        </div>

        {/* Center: Wood Dashboard Panel 
            Reduced size by reducing padding and text sizes
        */}
        <div className="flex flex-col items-center justify-end mx-2 mb-2">
            
            {/* The Wooden Board Container */}
            <div className="relative bg-[#3e2723] border-4 border-[#5d4037] shadow-[0_10px_20px_rgba(0,0,0,0.5)] rounded-lg px-4 py-2 flex flex-col items-center gap-2 transform -skew-x-1">
                
                {/* Screws/Nails for decoration */}
                <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-[#8d6e63] rounded-full shadow-inner opacity-80"></div>
                <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#8d6e63] rounded-full shadow-inner opacity-80"></div>
                <div className="absolute bottom-1 left-1 w-1.5 h-1.5 bg-[#8d6e63] rounded-full shadow-inner opacity-80"></div>
                <div className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-[#8d6e63] rounded-full shadow-inner opacity-80"></div>

                {/* Level Title */}
                <div className="text-western-gold font-western text-lg md:text-xl tracking-[0.2em] leading-none drop-shadow-md">
                    LEVEL {level}
                </div>

                {/* Round Progression Ladder */}
                <div className="flex gap-1 bg-black/30 p-1 rounded border border-[#5d4037]/50 shadow-inner">
                    {roundIndicators.map(r => {
                        const isCurrent = r === round;
                        const isPast = r < round;
                        
                        // Smaller box dimensions
                        let baseClasses = "w-5 h-7 md:w-6 md:h-8 flex items-center justify-center font-mono text-xs md:text-sm font-bold rounded-sm border transition-all";
                        let stateClasses = "";
                        
                        if (isCurrent) {
                            stateClasses = "bg-sunset-red border-parchment text-white scale-110 shadow-[0_0_10px_rgba(192,57,43,0.8)] z-10 animate-pulse";
                        } else if (isPast) {
                            stateClasses = "bg-western-gold border-[#8d6e63] text-[#3e2723]";
                        } else {
                            stateClasses = "bg-[#2d1b15] border-[#5d4037] text-[#5d4037]";
                        }

                        return (
                            <div key={r} className={`${baseClasses} ${stateClasses}`}>
                                {r}
                            </div>
                        );
                    })}
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-4 w-full justify-center pt-1 border-t border-[#5d4037]/50">
                    
                    {/* Targets */}
                    <div className="flex items-center gap-1">
                        <Skull size={14} className="text-parchment" />
                        <span className="text-[#8d6e63] font-mono text-[10px] tracking-wider">KILLED</span>
                        <span className="text-western-gold font-mono text-sm font-bold min-w-[20px] text-center bg-black/20 rounded px-1">
                            {birdsKilled}/{totalBirds}
                        </span>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-4 bg-[#5d4037]"></div>

                    {/* Ammo */}
                    <div className="flex items-center gap-1">
                         <Shell size={14} className="text-parchment" />
                         <span className="text-[#8d6e63] font-mono text-[10px] tracking-wider">AMMOS LEFT</span>
                         <span className={`font-mono text-sm font-bold min-w-[20px] text-center bg-black/20 rounded px-1 ${ammoLeft === 0 ? 'text-sunset-red' : 'text-western-gold'}`}>
                            {ammoLeft}
                         </span>
                    </div>

                </div>
            </div>
        </div>

        {/* Right: Shoot Button */}
        <div className="flex flex-col items-center gap-1 relative mb-2">
             <button
               className={`
                 w-24 h-24 md:w-28 md:h-28 rounded-full border-4 flex items-center justify-center
                 active:scale-95 transition-all duration-75 shadow-[0_8px_0_rgba(0,0,0,0.5)] active:shadow-none active:translate-y-2
                 ${ammoLeft > 0 ? 'bg-sunset-red border-parchment' : 'bg-[#263238] border-gray-600 opacity-80'}
               `}
               onClick={onShoot}
               disabled={ammoLeft <= 0}
             >
               <div className="relative w-16 h-16 rounded-full border-[3px] border-black/20 flex items-center justify-center">
                   {/* Cylinder decoration */}
                   <div className="absolute w-2 h-2 bg-black/20 rounded-full top-1.5 shadow-inner"></div>
                   <div className="absolute w-2 h-2 bg-black/20 rounded-full bottom-1.5 shadow-inner"></div>
                   <div className="absolute w-2 h-2 bg-black/20 rounded-full left-1.5 shadow-inner"></div>
                   <div className="absolute w-2 h-2 bg-black/20 rounded-full right-1.5 shadow-inner"></div>
                   
                   <Crosshair size={36} className="text-parchment drop-shadow-md" />
               </div>
             </button>
             <div className="text-parchment/50 font-western text-xs tracking-widest mt-0.5">FIRE</div>
        </div>

      </div>
    </div>
  );
};