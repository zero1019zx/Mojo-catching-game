import React, { useState, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { NeonPanel, NeonButton, NeonInput } from './components/NeonUI';
import { GameState, LeaderboardEntry } from './types';

function App() {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    gameStatus: 'idle',
    timeLeft: 30,
    audioInitialized: false,
    isLoading: true,
    error: null,
    aiCommentary: "Initializing Neural Link..."
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Load Leaderboard on Mount
  useEffect(() => {
    const saved = localStorage.getItem('neon_pulse_leaderboard');
    if (saved) {
      try {
        setLeaderboard(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse leaderboard", e);
      }
    }
  }, []);

  // Timer Logic
  useEffect(() => {
    let interval: number;
    if (gameState.gameStatus === 'playing') {
      interval = window.setInterval(() => {
        setGameState(prev => {
          if (prev.timeLeft <= 1) {
            return { ...prev, timeLeft: 0, gameStatus: 'finished' };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState.gameStatus]);

  const handleStart = () => {
    setGameState(prev => ({ 
      ...prev, 
      gameStatus: 'playing', 
      score: 0, 
      timeLeft: 30,
      aiCommentary: "Objective: Collect Neon Fragments. Time Limit: 30s." 
    }));
    setHasSubmitted(false);
    setPlayerName('');
  };

  const handleStop = () => {
    setGameState(prev => ({ ...prev, gameStatus: 'idle' }));
  };

  const handleScoreUpdate = (newScore: number) => {
    setGameState(prev => ({ ...prev, score: newScore }));
  };

  const handleCommentaryUpdate = (text: string) => {
    setGameState(prev => ({ ...prev, aiCommentary: text }));
  };

  const handleLoadComplete = () => {
    setGameState(prev => ({ ...prev, isLoading: false }));
  };

  const handleError = (msg: string) => {
    setGameState(prev => ({ ...prev, error: msg, isLoading: false }));
  };

  const handleSubmitScore = () => {
    if (!playerName.trim()) return;

    const newEntry: LeaderboardEntry = {
      name: playerName.trim().substring(0, 10), // Limit name length
      score: gameState.score,
      date: new Date().toLocaleDateString()
    };

    const newLeaderboard = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Keep top 5

    setLeaderboard(newLeaderboard);
    localStorage.setItem('neon_pulse_leaderboard', JSON.stringify(newLeaderboard));
    setHasSubmitted(true);
  };

  return (
    <div className="relative w-screen h-screen bg-black text-white overflow-hidden selection:bg-cyan-500 selection:text-black">
      {/* Background Grid (CSS only) */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(0,20,30,0.9)_1px,transparent_1px),linear-gradient(90deg,rgba(0,20,30,0.9)_1px,transparent_1px)] bg-[length:50px_50px] opacity-20 pointer-events-none"></div>

      {/* Game Canvas Layer */}
      <GameCanvas 
        isPlaying={gameState.gameStatus === 'playing'}
        onScoreUpdate={handleScoreUpdate}
        onCommentaryUpdate={handleCommentaryUpdate}
        onError={handleError}
        onLoadComplete={handleLoadComplete}
      />

      {/* UI Overlay Layer - Adjusted for Mobile Responsiveness */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-3 md:p-6 pointer-events-none">
        
        {/* Top Header */}
        <header className="flex flex-col md:flex-row justify-between items-stretch md:items-start gap-3 pointer-events-none">
          <NeonPanel className="pointer-events-auto text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 animate-pulse">
              NEON PULSE
            </h1>
            <div className="hidden md:flex gap-4 mt-2 font-mono">
              <div className="text-xs text-cyan-200">
                SYSTEM: {gameState.isLoading ? 'LOADING...' : 'ONLINE'}
              </div>
            </div>
          </NeonPanel>

          {/* Timer & Score Display */}
          <div className="flex gap-3 justify-between md:justify-end">
             <NeonPanel className={`pointer-events-auto flex-1 md:flex-none min-w-[100px] md:min-w-[120px] text-center ${gameState.timeLeft <= 5 && gameState.gameStatus === 'playing' ? 'border-red-500 animate-pulse' : ''}`}>
                <div className="text-[10px] md:text-xs text-gray-400 uppercase">Time</div>
                <div className={`text-2xl md:text-4xl font-black ${gameState.timeLeft <= 5 ? 'text-red-500' : 'text-cyan-400'} drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]`}>
                  {gameState.timeLeft}s
                </div>
            </NeonPanel>

            <NeonPanel className="text-right pointer-events-auto flex-1 md:flex-none min-w-[120px] md:min-w-[150px]">
              <div className="text-[10px] md:text-xs text-gray-400 uppercase">Score</div>
              <div className="text-2xl md:text-4xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(255,255,0,0.5)]">
                {gameState.score.toString().padStart(6, '0')}
              </div>
            </NeonPanel>
          </div>
        </header>

        {/* Center UI (Loading, Start, or Results) */}
        
        {/* 1. Loading */}
        {gameState.isLoading && !gameState.error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-50">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <div className="text-cyan-400 font-mono animate-pulse text-sm md:text-base">CALIBRATING OPTICS...</div>
                </div>
            </div>
        )}

        {/* 2. Error */}
        {gameState.error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/80 backdrop-blur-sm z-50 p-4">
                <NeonPanel className="border-red-500 max-w-md w-full text-center">
                    <h2 className="text-red-500 text-lg md:text-xl font-bold mb-2">CRITICAL ERROR</h2>
                    <p className="text-gray-300 mb-4 text-sm">{gameState.error}</p>
                    <NeonButton onClick={() => window.location.reload()} className="border-red-500 text-red-500 hover:bg-red-500 text-sm">
                        Reboot System
                    </NeonButton>
                </NeonPanel>
            </div>
        )}

        {/* 3. Start Screen */}
        {!gameState.isLoading && gameState.gameStatus === 'idle' && !gameState.error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/40 backdrop-blur-sm z-40 p-4">
                <NeonPanel className="text-center p-6 md:p-10 max-w-lg w-full">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">READY TO SYNC?</h2>
                    <p className="text-cyan-200 mb-8 font-mono text-xs md:text-sm leading-relaxed">
                        Use your <span className="text-yellow-400">MOUTH</span> to collect floating items.
                        <br/>Time Limit: <span className="text-red-400">30 Seconds</span>
                    </p>
                    
                    {/* Mini Leaderboard Preview */}
                    {leaderboard.length > 0 && (
                      <div className="mb-8 text-left bg-black/40 p-3 md:p-4 rounded border border-white/10">
                        <div className="text-xs text-gray-400 uppercase mb-2 border-b border-gray-700 pb-1">Top Agents</div>
                        {leaderboard.slice(0, 3).map((entry, i) => (
                          <div key={i} className="flex justify-between text-xs md:text-sm font-mono my-1">
                            <span className="text-cyan-300">{i+1}. {entry.name}</span>
                            <span className="text-yellow-400">{entry.score}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <NeonButton onClick={handleStart} className="text-lg md:text-xl px-8 py-3 md:px-12 md:py-4 w-full md:w-auto">
                        INITIATE SEQUENCE
                    </NeonButton>
                </NeonPanel>
            </div>
        )}

        {/* 4. Game Over / Leaderboard Screen */}
        {gameState.gameStatus === 'finished' && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/80 backdrop-blur-md z-40 p-4">
                <NeonPanel className="text-center p-6 md:p-8 max-w-md w-full border-yellow-500/50 shadow-[0_0_30px_rgba(255,255,0,0.2)]">
                    <h2 className="text-2xl md:text-4xl font-black text-white mb-2 tracking-widest">MISSION COMPLETE</h2>
                    <div className="text-[10px] md:text-xs text-yellow-500 uppercase tracking-[0.2em] mb-6 md:mb-8">Session Terminated</div>
                    
                    <div className="mb-6 md:mb-8">
                        <div className="text-gray-400 text-xs md:text-sm uppercase">Final Score</div>
                        <div className="text-4xl md:text-6xl font-black text-yellow-400 drop-shadow-[0_0_15px_rgba(255,255,0,0.8)]">
                            {gameState.score}
                        </div>
                    </div>

                    {!hasSubmitted ? (
                        <div className="mb-6 space-y-4">
                            <p className="text-cyan-300 text-xs md:text-sm">Identify yourself for the records:</p>
                            <div className="flex gap-2">
                                <NeonInput 
                                    placeholder="AGENT NAME" 
                                    maxLength={10}
                                    value={playerName}
                                    onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitScore()}
                                    className="text-sm"
                                />
                                <NeonButton onClick={handleSubmitScore} className="px-4 py-2 text-sm" disabled={!playerName.trim()}>
                                    Submit
                                </NeonButton>
                            </div>
                        </div>
                    ) : (
                        <div className="mb-8">
                            <div className="text-green-400 font-mono text-xs md:text-sm mb-4">/// DATA UPLOADED SUCCESSFULLY</div>
                             <div className="bg-black/40 p-3 md:p-4 rounded border border-white/10 max-h-[150px] overflow-y-auto">
                                {leaderboard.map((entry, i) => (
                                  <div key={i} className={`flex justify-between text-xs md:text-sm font-mono my-1 p-1 ${entry.name === playerName && entry.score === gameState.score ? 'bg-white/10' : ''}`}>
                                    <span className="text-cyan-300">{i+1}. {entry.name}</span>
                                    <span className="text-yellow-400">{entry.score}</span>
                                  </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-center gap-4 mt-4">
                         <NeonButton onClick={handleStart} className="w-full text-sm md:text-base">
                            RETRY MISSION
                        </NeonButton>
                    </div>
                </NeonPanel>
             </div>
        )}

        {/* Bottom Bar */}
        <footer className="flex flex-col-reverse md:flex-row justify-between items-end w-full gap-3 md:gap-0">
            {/* AI Commentary */}
            <NeonPanel className="w-full md:max-w-xl md:mr-4 pointer-events-auto bg-black/80">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
                    <span className="text-[10px] md:text-xs font-bold text-green-400 tracking-wider">AI ANNOUNCER</span>
                </div>
                <p className="text-sm md:text-lg text-white font-medium italic min-h-[20px] md:min-h-[30px]">
                    "{gameState.aiCommentary}"
                </p>
            </NeonPanel>

            {/* Controls */}
            {gameState.gameStatus === 'playing' && (
                <NeonPanel className="pointer-events-auto w-full md:w-auto text-center">
                    <button 
                        onClick={handleStop}
                        className="text-red-400 hover:text-red-200 font-mono text-xs md:text-sm uppercase tracking-widest w-full md:w-auto"
                    >
                        [ ABORT ]
                    </button>
                </NeonPanel>
            )}
        </footer>
      </div>
    </div>
  );
}

export default App;
