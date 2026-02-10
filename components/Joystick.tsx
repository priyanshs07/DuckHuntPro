import React, { useRef, useState, useEffect } from 'react';
import { Vector2 } from '../types';

interface JoystickProps {
  onMove: (vector: Vector2) => void;
}

export const Joystick: React.FC<JoystickProps> = ({ onMove }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Vector2>({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const maxRadius = 40; // Pixels

  const handleStart = (clientX: number, clientY: number) => {
    setActive(true);
    handleMove(clientX, clientY);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let x = dx;
    let y = dy;

    if (distance > maxRadius) {
      const ratio = maxRadius / distance;
      x = dx * ratio;
      y = dy * ratio;
    }

    setPosition({ x, y });
    
    // Normalize output to -1 to 1
    onMove({ 
      x: x / maxRadius, 
      y: y / maxRadius 
    });
  };

  const handleEnd = () => {
    setActive(false);
    setPosition({ x: 0, y: 0 });
    onMove({ x: 0, y: 0 });
  };

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
  
  // Mouse handlers for testing on desktop
  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY);
  
  useEffect(() => {
    const handleWindowMove = (e: MouseEvent) => {
      if (active) handleMove(e.clientX, e.clientY);
    };
    const handleWindowUp = () => {
      if (active) handleEnd();
    };

    if (active) {
      window.addEventListener('mousemove', handleWindowMove);
      window.addEventListener('mouseup', handleWindowUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleWindowMove);
      window.removeEventListener('mouseup', handleWindowUp);
    };
  }, [active]);

  return (
    <div 
      className="relative w-32 h-32 rounded-full border-4 border-parchment/50 bg-dust-brown/60 backdrop-blur-sm flex items-center justify-center touch-none select-none shadow-retro"
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={handleEnd}
      onMouseDown={onMouseDown}
    >
      {/* Decorative inner ring */}
      <div className="absolute inset-2 rounded-full border border-white/20"></div>

      {/* Inner Stick */}
      <div 
        className={`w-14 h-14 rounded-full bg-western-gold border-2 border-parchment shadow-[0_4px_10px_rgba(0,0,0,0.5)] absolute transition-transform duration-75 ease-out flex items-center justify-center ${active ? 'scale-90' : 'scale-100'}`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`
        }}
      >
        <div className="w-8 h-8 rounded-full bg-yellow-600/50"></div>
      </div>
    </div>
  );
};