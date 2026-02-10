import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Bird, Vector2, LevelConfig } from './types';
import { getLevelConfig, MAX_LEVELS, ROUNDS_PER_LEVEL, GAME_WIDTH, GAME_HEIGHT, CROSSHAIR_SPEED, HITBOX_RADIUS, HORIZON_Y } from './constants';
import { Button } from './components/Button';
import { HUD } from './components/HUD';
import { Crosshair, Trophy, Frown, Play, Home, RotateCcw, Clapperboard, MonitorPlay, Star, Target, Skull } from 'lucide-react';

const App = () => {
  // --- State ---
  const [gameState, setGameState] = useState<GameState>(GameState.SPLASH);
  const [toast, setToast] = useState<string | null>(null);
  
  // Progression
  const [level, setLevel] = useState(1);
  const [round, setRound] = useState(1);
  const [winCountdown, setWinCountdown] = useState(3);
  
  // Stats
  const [levelAccumulatedStats, setLevelAccumulatedStats] = useState({ killed: 0, shots: 0, totalBirds: 0 });
  const [sessionBounty, setSessionBounty] = useState(0);

  // Round State
  const [birdsKilled, setBirdsKilled] = useState(0);
  const [birdsEscaped, setBirdsEscaped] = useState(0);
  const [birdsSpawned, setBirdsSpawned] = useState(0);
  const [shotsFired, setShotsFired] = useState(0);
  
  const [crosshairPos, setCrosshairPos] = useState<Vector2>({ x: 50, y: 30 });
  const [joystickVector, setJoystickVector] = useState<Vector2>({ x: 0, y: 0 });
  const [birds, setBirds] = useState<Bird[]>([]);
  const [pauseConfirmQuit, setPauseConfirmQuit] = useState(false);
  const [showHitMarker, setShowHitMarker] = useState(false);

  // Refs
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();
  const levelConfigRef = useRef<LevelConfig>(getLevelConfig(1, 1));
  const keysPressed = useRef<Set<string>>(new Set());
  
  // Ref to hold the latest handleShoot function to avoid stale closures in event listeners
  const handleShootRef = useRef<() => void>(() => {});

  // --- Helpers ---
  const startRound = (lvl: number, rnd: number) => {
    const config = getLevelConfig(lvl, rnd);
    levelConfigRef.current = config;
    setLevel(lvl);
    setRound(rnd);
    
    // If starting a new level (Round 1), reset level stats
    if (rnd === 1) {
       setLevelAccumulatedStats({ killed: 0, shots: 0, totalBirds: 0 });
    }

    // Reset Round Counters
    setBirdsKilled(0);
    setBirdsEscaped(0);
    setBirdsSpawned(0);
    setShotsFired(0);
    setBirds([]);
    
    setCrosshairPos({ x: 50, y: 30 });
    setGameState(GameState.PLAYING);
    setPauseConfirmQuit(false);
  };

  const spawnBird = () => {
    const id = Date.now() + Math.random();
    const startY = Math.random() * 45 + 5; 
    const startX = Math.random() > 0.5 ? -10 : 110; 
    const direction = startX < 0 ? 1 : -1;
    
    const speed = (Math.random() * 0.2 + 0.15) * levelConfigRef.current.speedMultiplier;

    const newBird: Bird = {
      id,
      position: { x: startX, y: startY },
      velocity: { 
        x: speed * direction, 
        y: (Math.random() * 0.2 - 0.1) * levelConfigRef.current.speedMultiplier
      },
      isDead: false,
      type: Math.random() > 0.8 ? 'fast' : 'normal',
      scale: 1
    };
    
    setBirds(prev => [...prev, newBird]);
    setBirdsSpawned(prev => prev + 1);
  };

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // --- Controls ---
  const handleShoot = () => {
    const config = levelConfigRef.current;

    // Checks
    if (gameState !== GameState.PLAYING) return;
    if (shotsFired >= config.totalAmmo) return;

    // Increment shots
    setShotsFired(s => s + 1);

    // Collision Detection
    // Use the current state values from the render scope
    let hit = false;
    const updatedBirds = birds.map(bird => {
      if (bird.isDead) return bird;
      
      const dx = (bird.position.x - crosshairPos.x);
      const dy = (bird.position.y - crosshairPos.y) * (GAME_WIDTH / GAME_HEIGHT);
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist < HITBOX_RADIUS) {
        hit = true;
        return { ...bird, isDead: true };
      }
      return bird;
    });

    if (hit) {
      setBirds(updatedBirds);
      setBirdsKilled(k => k + 1);
      setShowHitMarker(true);
      setTimeout(() => setShowHitMarker(false), 200);
    }
  };

  // Keep ref updated with the latest version of handleShoot that has fresh state closures
  handleShootRef.current = handleShoot;

  // --- Keyboard & Input Logic ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.code);
      if (e.code === 'Space') {
        // Use the ref to call the latest handleShoot with fresh state
        if (!e.repeat) {
            handleShootRef.current(); 
        }
      }
      
      // Cheat Code: Shift
      if (e.key === 'Shift') {
        if (gameState === GameState.PLAYING) {
           const config = levelConfigRef.current;
           setBirdsKilled(config.totalBirds);
           setBirds([]);
           setBirdsEscaped(0);
           
           // Determine Win State
           if (round === ROUNDS_PER_LEVEL) {
             setGameState(GameState.LEVEL_WIN);
           } else {
             setGameState(GameState.ROUND_WIN);
           }
           triggerToast("CHEAT: ROUND CLEARED");
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, round]);

  // --- Game Loop ---
  const update = useCallback((time: number) => {
    if (gameState !== GameState.PLAYING) return;
    
    const deltaTime = lastTimeRef.current ? time - lastTimeRef.current : 0;
    lastTimeRef.current = time;

    // 1. Input Processing
    let moveX = joystickVector.x;
    let moveY = joystickVector.y;

    if (keysPressed.current.has('KeyW') || keysPressed.current.has('ArrowUp')) moveY = -1;
    if (keysPressed.current.has('KeyS') || keysPressed.current.has('ArrowDown')) moveY = 1;
    if (keysPressed.current.has('KeyA') || keysPressed.current.has('ArrowLeft')) moveX = -1;
    if (keysPressed.current.has('KeyD') || keysPressed.current.has('ArrowRight')) moveX = 1;

    if (moveX !== 0 || moveY !== 0) {
      if (Math.abs(moveX) === 1 && Math.abs(moveY) === 1) {
        moveX *= 0.7071;
        moveY *= 0.7071;
      }
    }

    // 2. Move Crosshair
    setCrosshairPos(prev => {
      let newX = prev.x + moveX * CROSSHAIR_SPEED;
      let newY = prev.y + moveY * CROSSHAIR_SPEED;
      newX = Math.max(0, Math.min(100, newX));
      newY = Math.max(0, Math.min(100, newY));
      return { x: newX, y: newY };
    });

    // 3. Move Birds & Check Escapes
    setBirds(prevBirds => {
      const nextBirds: Bird[] = [];
      
      prevBirds.forEach(b => {
        if (b.isDead) return; 

        let nextX = b.position.x + b.velocity.x;
        let nextY = b.position.y + b.velocity.y;
        let nextVelY = b.velocity.y;

        // HORIZON CONSTRAINT
        if (nextY > HORIZON_Y) {
          nextY = HORIZON_Y;
          if (nextVelY > 0) nextVelY = -nextVelY;
        }
        if (nextY < 0) {
          nextY = 0;
          if (nextVelY < 0) nextVelY = -nextVelY;
        }

        // Check Bounds (Escape)
        const isOutOfBounds = (nextX < -15 || nextX > 115);
        
        if (isOutOfBounds) {
          // Bird Escaped!
          setBirdsEscaped(c => c + 1);
        } else {
          nextBirds.push({
            ...b,
            position: { x: nextX, y: nextY },
            velocity: { ...b.velocity, y: nextVelY }
          });
        }
      });

      return nextBirds;
    });

    // 4. Spawner Logic
    const config = levelConfigRef.current;
    
    if (birdsSpawned < config.totalBirds) {
        const currentOnScreen = birds.length;
        const maxOnScreen = 3; 
        if (Math.random() < 0.05 && currentOnScreen < maxOnScreen) {
            spawnBird();
        }
    }
    
    // 5. Game Over Logic
    // WIN: All birds for the level killed
    if (birdsKilled >= config.totalBirds) {
        if (round === ROUNDS_PER_LEVEL) {
          setGameState(GameState.LEVEL_WIN);
        } else {
          setGameState(GameState.ROUND_WIN);
        }
        return;
    }
    
    // LOSE: Any bird escaped
    if (birdsEscaped > 0) {
        setGameState(GameState.ROUND_LOSE);
        return;
    }

    // LOSE: Out of ammo and didn't kill enough
    if (shotsFired >= config.totalAmmo && birdsKilled < config.totalBirds) {
        setGameState(GameState.ROUND_LOSE);
        return;
    }

    requestRef.current = requestAnimationFrame(update);
  }, [gameState, joystickVector, birds.length, birdsSpawned, birdsKilled, birdsEscaped, shotsFired, round]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [update]);

  useEffect(() => {
    if (gameState === GameState.SPLASH) {
      const timer = setTimeout(() => setGameState(GameState.HOME), 3000);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  // --- Handlers ---
  const handleNextRound = () => {
    // Accumulate Stats
    setLevelAccumulatedStats(prev => ({
       killed: prev.killed + birdsKilled,
       shots: prev.shots + shotsFired,
       totalBirds: prev.totalBirds + levelConfigRef.current.totalBirds
    }));
    
    // Add Score to Session Bounty (Simple formula)
    const roundBounty = (birdsKilled * 100) + ((levelConfigRef.current.totalAmmo - shotsFired) * 50);
    setSessionBounty(prev => prev + roundBounty);

    if (round < ROUNDS_PER_LEVEL) {
      startRound(level, round + 1);
    } else if (level < MAX_LEVELS) {
      startRound(level + 1, 1);
    } else {
      // Game Finish loop
      startRound(1, 1);
    }
  };
  
  const handleGiveUp = () => {
     // Go to session summary
     // Add partial stats? No, only successful rounds count towards "completed" stats typically.
     setGameState(GameState.SESSION_SUMMARY);
  };

  const handleRetryRound = () => {
     // Just restart current round
     startRound(level, round);
  };

  const handleReturnHome = () => {
     setSessionBounty(0);
     setLevelAccumulatedStats({ killed: 0, shots: 0, totalBirds: 0 });
     setGameState(GameState.HOME);
  }

  // --- Effects for Round Win Countdown ---
  useEffect(() => {
    let interval: number;
    if (gameState === GameState.ROUND_WIN) {
      setWinCountdown(3);
      interval = window.setInterval(() => {
        setWinCountdown((prev) => {
          if (prev <= 0) return 0; // Stop at 0
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
    if (gameState === GameState.ROUND_WIN && winCountdown === 0) {
        // Wait 1 second on "GET READY" then start
        const t = setTimeout(() => {
            handleNextRound();
        }, 1000);
        return () => clearTimeout(t);
    }
  }, [gameState, winCountdown]); // eslint-disable-line react-hooks/exhaustive-deps


  // --- Render Functions ---

  const renderToast = () => (
    toast && (
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50 animate-bounce pointer-events-none">
        <div className="bg-western-gold border-2 border-dust-brown text-dust-brown px-6 py-2 rounded-full font-western text-xl shadow-lg whitespace-nowrap">
          {toast}
        </div>
      </div>
    )
  );

  const renderSplash = () => (
    <div className="flex flex-col items-center justify-center h-full bg-parchment">
       <div className="border-8 border-double border-dust-brown p-12 bg-western-gold shadow-2xl rotate-2">
         <h1 className="text-7xl font-western text-dust-brown drop-shadow-[4px_4px_0_rgba(0,0,0,0.5)] text-center leading-none">
           DUCK<br/>HUNT
         </h1>
         <div className="w-full h-2 bg-dust-brown my-4"></div>
         <p className="font-display text-sunset-red text-2xl tracking-[0.5em] text-center">WESTERN</p>
       </div>
    </div>
  );

  const renderHome = () => (
    <div className="flex flex-col items-center justify-center h-full bg-[#2c3e50] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#2c3e50] via-[#c0392b] to-[#f39c12] z-0"></div>
      <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-64 h-64 bg-western-gold rounded-full blur-sm"></div>
      
      <div className="relative z-10 text-center">
         <div className="bg-dust-brown/90 border-4 border-parchment p-8 shadow-retro-gold max-w-lg mx-auto">
            <h1 className="text-5xl font-western text-parchment mb-2 drop-shadow-md">WANTED</h1>
            <p className="font-mono text-western-gold mb-8 text-lg">DEAD OR ALIVE</p>
            
            <Button variant="primary" size="lg" onClick={() => startRound(1, 1)}>
              START HUNT
            </Button>
            
            <div className="mt-6 text-parchment/70 font-mono text-sm border-t border-parchment/30 pt-4 flex flex-col gap-1">
               <span>TURN DEVICE SIDEWAYS</span>
               <span className="text-[10px] opacity-75">WASD + SPACE SUPPORTED • SHIFT TO CHEAT</span>
            </div>
         </div>
      </div>
      
      <div className="absolute bottom-0 w-full h-1/3 bg-black z-0 clip-path-polygon" style={{ clipPath: 'polygon(0% 100%, 0% 20%, 20% 25%, 35% 10%, 50% 25%, 70% 15%, 100% 30%, 100% 100%)'}}></div>
    </div>
  );

  const renderGame = () => (
    <div className="relative w-full h-full overflow-hidden cursor-none bg-sky-blue">
       {/* Sky Gradient */}
       <div className="absolute inset-0 bg-gradient-to-b from-[#1a237e] via-[#8e24aa] to-[#ff6f00] h-[70%]"></div>
       
       <div className="absolute top-[10%] right-[15%] w-24 h-24 bg-western-gold rounded-full opacity-80 blur-[2px]"></div>
       <div className="absolute top-[20%] left-[10%] w-32 h-12 bg-white/10 rounded-full blur-xl"></div>
       <div className="absolute top-[15%] right-[30%] w-48 h-16 bg-white/10 rounded-full blur-xl"></div>

       {/* Far Mountains */}
       <div className="absolute bottom-[35%] w-full h-[25%]">
          <div className="absolute bottom-0 left-0 w-full h-full bg-[#5d4037] opacity-60" style={{ clipPath: 'polygon(0% 100%, 15% 40%, 30% 80%, 50% 20%, 70% 70%, 85% 30%, 100% 100%)' }}></div>
       </div>

       {/* Raised Ground (Horizon High) */}
       <div className="absolute bottom-0 w-full h-[40%] bg-[#3e2723] border-t-4 border-[#251613]">
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>
          
          <div className="absolute -top-16 left-[10%] w-12 h-32 bg-[#1b5e20] rounded-t-full border-r-4 border-[#0d3311]">
             <div className="absolute top-10 -left-6 w-8 h-4 bg-[#1b5e20] rounded-t-full rotate-[-45deg]"></div>
             <div className="absolute top-6 -right-6 w-8 h-4 bg-[#1b5e20] rounded-t-full rotate-[45deg]"></div>
          </div>
          
          <div className="absolute -top-8 right-[20%] w-20 h-12 bg-[#4e342e] rounded-t-lg"></div>
          <div className="absolute -top-24 right-[5%] w-8 h-40 bg-[#2e7d32] rounded-t-full opacity-80 scale-75"></div>
       </div>

       {birds.map(bird => (
         !bird.isDead && (
           <div 
            key={bird.id}
            className="absolute transition-transform duration-75"
            style={{ 
              left: `${bird.position.x}%`, 
              top: `${bird.position.y}%`,
              transform: `translate(-50%, -50%) scale(${bird.velocity.x > 0 ? -1 : 1}, 1)` 
            }}
           >
             <div className="w-16 h-12 relative animate-pulse">
                <div className="w-full h-4 bg-black rounded-full absolute top-4"></div>
                <div className="w-4 h-4 bg-black rounded-full absolute top-3 left-6"></div>
                <div className="w-6 h-12 bg-black absolute left-0 top-0 skew-x-[30deg] rounded-full opacity-90 animate-[spin_1s_ease-in-out_infinite] origin-bottom" style={{animation: 'wingFlap 0.5s infinite alternate'}}></div>
                <div className="w-6 h-12 bg-black absolute right-0 top-0 skew-x-[-30deg] rounded-full opacity-90 animate-[spin_1s_ease-in-out_infinite] origin-bottom" style={{animation: 'wingFlap 0.5s infinite alternate-reverse'}}></div>
             </div>
           </div>
         )
       ))}

       <div 
         className="absolute pointer-events-none transition-transform duration-75 z-20"
         style={{ left: `${crosshairPos.x}%`, top: `${crosshairPos.y}%`, transform: 'translate(-50%, -50%)' }}
       >
         <div className="relative">
            {/* Improved Crosshair Shape */}
            <div className="w-12 h-12 border-2 border-red-500 rounded-full shadow-[0_0_5px_rgba(255,0,0,0.5)] relative">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-0.5 bg-red-500/80"></div>
               <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-0.5 bg-red-500/80"></div>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_2px_#fff] z-10"></div>
            </div>
            
            {showHitMarker && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-2 border-western-gold rotate-45 transform"></div>
            )}
         </div>
       </div>

       <HUD 
         level={level}
         round={round}
         birdsKilled={birdsKilled}
         totalBirds={levelConfigRef.current.totalBirds}
         shotsFired={shotsFired}
         totalAmmo={levelConfigRef.current.totalAmmo}
         onPause={() => setGameState(GameState.PAUSED)}
         onJoystickMove={setJoystickVector}
         onShoot={handleShoot}
       />
       
       <style>{`
         @keyframes wingFlap {
           from { transform: scaleY(1); }
           to { transform: scaleY(0.2); }
         }
       `}</style>
    </div>
  );

  const renderPause = () => (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-parchment p-8 border-4 border-dust-brown shadow-retro-gold max-w-sm w-full text-center relative">
        <h2 className="text-3xl font-western text-dust-brown mb-4">PAUSED</h2>
        <div className="flex flex-col gap-3">
          <Button onClick={() => setGameState(GameState.PLAYING)} variant="primary" size="md">RESUME</Button>
          <Button onClick={() => setGameState(GameState.HOME)} variant="secondary" size="md">QUIT</Button>
        </div>
      </div>
    </div>
  );

  // --- End Screens ---

  // 1. Round Win (Countdown Modal)
  const renderRoundWin = () => {
    const accuracy = shotsFired > 0 ? Math.round((birdsKilled / shotsFired) * 100) : 0;
    const bonus = (birdsKilled * 100) + ((levelConfigRef.current.totalAmmo - shotsFired) * 50);

    return (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in fade-in zoom-in duration-300">
         <div className="bg-parchment/95 backdrop-blur border-4 border-western-gold p-8 shadow-2xl rounded-lg text-center min-w-[320px] transform -rotate-2">
            <h2 className="text-3xl font-western text-dust-brown mb-2">ROUND {round} CLEAR!</h2>
            
            <div className="flex justify-around my-6 border-y border-dust-brown/20 py-4">
              <div className="flex flex-col">
                <span className="text-xs font-mono text-dust-brown/70">ACCURACY</span>
                <span className="text-xl font-bold text-sunset-red">{accuracy}%</span>
              </div>
              <div className="flex flex-col">
                 <span className="text-xs font-mono text-dust-brown/70">BONUS</span>
                 <span className="text-xl font-bold text-sunset-red">${bonus}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-col items-center justify-center min-h-[60px]">
                {winCountdown > 0 ? (
                    <div className="text-dust-brown font-mono text-lg animate-pulse">
                        NEXT ROUND IN <span className="text-3xl font-bold text-sunset-red block">{winCountdown}</span>
                    </div>
                ) : (
                    <div className="text-3xl font-western text-sunset-red animate-bounce tracking-widest">
                        GET READY!
                    </div>
                )}
            </div>
         </div>
      </div>
    );
  };

  // 2. Level Win (Full Screen)
  const renderLevelWin = () => {
    const totalKilled = levelAccumulatedStats.killed + birdsKilled;
    const totalShots = levelAccumulatedStats.shots + shotsFired;
    const totalBirdsInLevel = levelAccumulatedStats.totalBirds + levelConfigRef.current.totalBirds;
    const accuracy = totalShots > 0 ? Math.round((totalKilled / totalShots) * 100) : 0;

    return (
      <div className="absolute inset-0 bg-gradient-to-br from-western-gold to-yellow-600 flex flex-col items-center justify-center z-50">
          <div className="bg-parchment p-10 border-8 border-double border-dust-brown shadow-2xl max-w-lg w-full text-center relative">
              <Star className="absolute -top-8 -left-8 text-white fill-western-gold drop-shadow-md" size={64} />
              <Star className="absolute -bottom-8 -right-8 text-white fill-western-gold drop-shadow-md" size={64} />
              
              <h1 className="text-6xl font-western text-dust-brown mb-2 drop-shadow-sm">LEVEL {level} DONE</h1>
              <div className="w-full h-1 bg-dust-brown mb-6 opacity-30"></div>

              <div className="grid grid-cols-2 gap-6 mb-8 text-left px-8">
                  <div>
                    <p className="text-sm font-mono text-dust-brown/60">TOTAL KILLS</p>
                    <p className="text-3xl font-bold text-dust-brown">{totalKilled}/{totalBirdsInLevel}</p>
                  </div>
                  <div>
                     <p className="text-sm font-mono text-dust-brown/60">ACCURACY</p>
                     <p className="text-3xl font-bold text-dust-brown">{accuracy}%</p>
                  </div>
                  <div>
                     <p className="text-sm font-mono text-dust-brown/60">BOUNTY</p>
                     <p className="text-3xl font-bold text-sunset-red">${sessionBounty}</p>
                  </div>
                  <div>
                     <p className="text-sm font-mono text-dust-brown/60">RANK</p>
                     <p className="text-3xl font-bold text-dust-brown">{accuracy > 80 ? 'SHERIFF' : accuracy > 50 ? 'DEPUTY' : 'ROOKIE'}</p>
                  </div>
              </div>

              <Button onClick={handleNextRound} variant="primary" size="lg" className="w-full shadow-retro-gold">
                 RIDE TO LEVEL {level + 1}
              </Button>
          </div>
      </div>
    );
  };

  // 3. Round Lose (Card)
  const renderRoundLose = () => {
    return (
      <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gunmetal border-4 border-sunset-red p-8 rounded shadow-2xl text-center max-w-md w-full">
             <Skull size={48} className="text-sunset-red mx-auto mb-4 animate-pulse" />
             <h2 className="text-4xl font-western text-white mb-2 tracking-widest">ROUND FAILED</h2>
             <p className="font-mono text-gray-400 mb-2 uppercase">
                {birdsEscaped > 0 ? "Prey Escaped" : "Out of Ammo"}
             </p>

             <p className="text-xl font-western text-western-gold mb-6 border-b border-white/10 pb-4">
                You bagged {birdsKilled} of {levelConfigRef.current.totalBirds} required
             </p>

             {/* Stats Summary */}
             <div className="bg-black/40 rounded p-4 mb-6 flex justify-around">
                <div className="text-center">
                   <div className="text-xs text-gray-500">TARGETS</div>
                   <div className="text-xl text-white font-bold">{birdsKilled}/{levelConfigRef.current.totalBirds}</div>
                </div>
                <div className="text-center">
                   <div className="text-xs text-gray-500">SHOTS</div>
                   <div className="text-xl text-white font-bold">{shotsFired}</div>
                </div>
             </div>

             <div className="flex flex-col gap-3">
               <Button onClick={handleRetryRound} variant="primary" className="flex items-center justify-center gap-2">
                  <MonitorPlay size={20} /> RETRY
               </Button>
               <Button onClick={handleGiveUp} variant="secondary">
                  GIVE UP
               </Button>
             </div>
          </div>
      </div>
    );
  };

  // 4. Session Summary (After Give Up)
  const renderSessionSummary = () => {
     return (
       <div className="absolute inset-0 bg-[#2c3e50] flex flex-col items-center justify-center z-50">
          <div className="bg-parchment p-8 border-4 border-dust-brown shadow-2xl max-w-md w-full text-center relative rotate-1">
             <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-dust-brown text-parchment px-4 py-1 font-western tracking-widest border-2 border-parchment">
                HUNT REPORT
             </div>

             <div className="mt-4 mb-6 space-y-4">
                <div className="flex justify-between items-end border-b border-dust-brown/20 pb-1">
                   <span className="font-mono text-dust-brown">LEVEL REACHED</span>
                   <span className="font-bold text-2xl text-sunset-red">{level}</span>
                </div>
                <div className="flex justify-between items-end border-b border-dust-brown/20 pb-1">
                   <span className="font-mono text-dust-brown">ROUNDS CLEARED</span>
                   <span className="font-bold text-2xl text-sunset-red">{(level - 1) * 7 + (round - 1)}</span>
                </div>
                <div className="flex justify-between items-end border-b border-dust-brown/20 pb-1">
                   <span className="font-mono text-dust-brown">TOTAL BOUNTY</span>
                   <span className="font-bold text-2xl text-western-gold bg-dust-brown px-2 rounded">${sessionBounty}</span>
                </div>
             </div>

             <Button onClick={handleReturnHome} variant="primary" className="w-full">
                RETURN TO CAMP <Home className="inline ml-2" size={18}/>
             </Button>
          </div>
       </div>
     );
  };

  return (
    <div className="w-full h-screen bg-black flex items-center justify-center overflow-hidden font-sans">
      <div className="grain"></div>
      <div className="vignette"></div>
      
      {/* 21:9 Container */}
      <div className="relative w-full max-w-[90rem] aspect-[21/9] bg-gray-900 shadow-2xl overflow-hidden border-y-8 border-dust-brown">
        
        {renderToast()}
        
        {gameState === GameState.SPLASH && renderSplash()}
        {gameState === GameState.HOME && renderHome()}
        {(gameState === GameState.PLAYING || gameState === GameState.PAUSED || gameState === GameState.ROUND_WIN || gameState === GameState.LEVEL_WIN || gameState === GameState.ROUND_LOSE || gameState === GameState.SESSION_SUMMARY) && renderGame()}
        
        {/* Overlays */}
        {gameState === GameState.PAUSED && renderPause()}
        {gameState === GameState.ROUND_WIN && renderRoundWin()}
        {gameState === GameState.LEVEL_WIN && renderLevelWin()}
        {gameState === GameState.ROUND_LOSE && renderRoundLose()}
        {gameState === GameState.SESSION_SUMMARY && renderSessionSummary()}

      </div>
    </div>
  );
};

export default App;