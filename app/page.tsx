'use client';

import { useState } from 'react';
import { useSocket } from '@/hooks/useFirebaseQueue';
import { ThemeSelector } from '@/components/ThemeSelector';
import { Footer } from '@/components/Footer';
import { 
  colorOptions, 
  patternOptions, 
  effectOptions, 
  defaultThemeSelection 
} from '@/lib/theme-options';

export default function Home() {
  const {
    isConnected,
    isActive,
    queuePosition,
    queueLength,
    remainingTime,
    submitTheme
  } = useSocket();

  const [selectedRow1, setSelectedRow1] = useState(defaultThemeSelection.row1);
  const [selectedRow2, setSelectedRow2] = useState(defaultThemeSelection.row2);
  const [selectedRow3, setSelectedRow3] = useState(defaultThemeSelection.row3);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSubmit = async () => {
    try {
      await submitTheme(selectedRow1, selectedRow2, selectedRow3);
      setHasSubmitted(true);
    } catch (error) {
      console.error('Failed to submit theme:', error);
    }
  };

  const handleGoAgain = () => {
    // Reset local state so the guest can pick a new theme and rejoin the queue
    setHasSubmitted(false);
    setSelectedRow1(defaultThemeSelection.row1);
    setSelectedRow2(defaultThemeSelection.row2);
    setSelectedRow3(defaultThemeSelection.row3);
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine UI state
  const showSubmitButton = !hasSubmitted && queuePosition === -1;
  const isInQueue = queuePosition > 0;
  const isYourTurn = isActive && queuePosition === 0;
  const showGoAgainButton = hasSubmitted && !isYourTurn && queuePosition === -1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-950 via-green-950 to-red-950 relative overflow-hidden">
      {/* Christmas snowflakes background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-900/30 via-green-900/20 to-red-900/30">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFFFFF' fill-opacity='0.2'%3E%3Cpath d='M30 30 L32 28 L30 26 L28 28 Z M30 30 L28 32 L30 34 L32 32 Z M30 30 L26 30 L24 32 L26 34 L30 30 Z M30 30 L34 30 L36 28 L34 26 L30 30 Z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>
      
      <div className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-6xl font-black mb-4 relative inline-block">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-green-300 to-red-400 drop-shadow-lg">
              🎄 Christmas Magic 🎄
            </span>
          </h1>
          <p className="text-green-100 text-xl tracking-wide mt-4 font-semibold">
            Create your theme and join the festive installation!
          </p>
        </header>

        {/* Connection Status */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            <div className={`w-4 h-4 rounded-full ${
              isConnected ? 'bg-green-400 shadow-green-400/50' : 'bg-red-600 shadow-red-600/50'
            } shadow-lg animate-pulse`} />
            <span className={`text-sm font-semibold tracking-wider ${
              isConnected ? 'text-green-300' : 'text-red-400'
            }`}>
              {isConnected ? '✨ Connected to Christmas Magic ✨' : '❌ Connection Lost'}
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-green-950/80 backdrop-blur-sm border-4 border-red-500/50 rounded-xl p-8 mb-8 relative overflow-hidden shadow-2xl shadow-red-500/20">
          {/* Christmas ornament corners */}
          <div className="absolute top-2 left-2 text-3xl">🎁</div>
          <div className="absolute top-2 right-2 text-3xl">🎁</div>
          <div className="absolute bottom-2 left-2 text-3xl">⛄</div>
          <div className="absolute bottom-2 right-2 text-3xl">⛄</div>

          {/* Status Banner - Your Turn! */}
          {isYourTurn && (
            <div className="mb-6 p-6 bg-gradient-to-r from-green-800/50 to-red-800/50 border-2 border-green-400 rounded-lg relative animate-pulse">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-red-400 to-green-400"></div>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-green-300 tracking-wider uppercase">
                    🎉 IT&apos;S YOUR TURN! 🎉
                  </h2>
                  <p className="text-lg text-green-100 mt-2">
                    Your Christmas theme is now displayed!
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-green-300 tabular-nums">
                    {formatTime(remainingTime)}
                  </div>
                  <div className="text-sm text-green-200 uppercase tracking-wider">Time Remaining</div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-4 h-2 bg-green-950 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-red-400 transition-all duration-1000 ease-linear"
                  style={{ width: `${(remainingTime / 60) * 100}%` }}
                />
              </div>
            </div>
          )}

          {isInQueue && (
            <div className="mb-6 p-6 bg-gradient-to-r from-red-900/50 to-green-900/50 border-2 border-yellow-400 rounded-lg relative">
              <h2 className="text-2xl font-bold text-yellow-300 tracking-wider uppercase text-center">
                🎄 In Queue 🎄
              </h2>
              <p className="text-center text-xl text-green-100 mt-4">
                Position: <span className="text-yellow-300 font-bold text-3xl">{queuePosition}</span> of {queueLength}
              </p>
              <p className="text-center text-lg text-green-200 mt-2">
                Estimated wait: {formatTime(queuePosition * 60)}
              </p>
            </div>
          )}

          {/* Theme Selector */}
          {showSubmitButton && (
            <div className="mb-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-green-200 mb-2">
                  ✨ Pick Your Christmas Theme ✨
                </h2>
                <p className="text-green-100">
                  Swipe or click to select options from each category
                </p>
              </div>
              <ThemeSelector
                row1Options={colorOptions}
                row2Options={patternOptions}
                row3Options={effectOptions}
                selectedRow1={selectedRow1}
                selectedRow2={selectedRow2}
                selectedRow3={selectedRow3}
                onRow1Change={setSelectedRow1}
                onRow2Change={setSelectedRow2}
                onRow3Change={setSelectedRow3}
                disabled={false}
              />
            </div>
          )}

          {/* Display selected theme when in queue or active */}
          {(isInQueue || isYourTurn) && (
            <div className="mb-6 p-4 bg-black/30 border-2 border-green-400 rounded-lg">
              <h3 className="text-center text-lg font-bold text-green-300 mb-3">
                Your Christmas Theme
              </h3>
              <div className="flex justify-center gap-8 text-center">
                <div>
                  <div className="text-5xl mb-2">
                    {colorOptions.find(o => o.id === selectedRow1)?.symbol}
                  </div>
                  <div className="text-green-200 text-sm">
                    {colorOptions.find(o => o.id === selectedRow1)?.name}
                  </div>
                </div>
                <div>
                  <div className="text-5xl mb-2">
                    {patternOptions.find(o => o.id === selectedRow2)?.symbol}
                  </div>
                  <div className="text-green-200 text-sm">
                    {patternOptions.find(o => o.id === selectedRow2)?.name}
                  </div>
                </div>
                <div>
                  <div className="text-5xl mb-2">
                    {effectOptions.find(o => o.id === selectedRow3)?.symbol}
                  </div>
                  <div className="text-green-200 text-sm">
                    {effectOptions.find(o => o.id === selectedRow3)?.name}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col items-center gap-4">
            {showSubmitButton && (
              <button
                onClick={handleSubmit}
                className="group relative px-12 py-5 bg-gradient-to-r from-red-600 to-green-600 text-white text-xl font-bold uppercase tracking-wider transition-all hover:scale-105 hover:shadow-2xl hover:shadow-green-500/50 rounded-lg overflow-hidden"
              >
                <span className="relative z-10">🎄 Submit & Join Queue 🎄</span>
                <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
            )}

            {isYourTurn && (
              <div className="text-center">
                <p className="text-green-200 text-lg animate-pulse">
                  ✨ Enjoy your minute of Christmas magic! ✨
                </p>
              </div>
            )}

            {showGoAgainButton && (
              <button
                onClick={handleGoAgain}
                className="mt-2 px-10 py-4 border-2 border-green-400 text-green-200 font-bold uppercase tracking-wider rounded-lg bg-black/40 hover:bg-green-900/40 hover:border-green-300 transition-colors"
              >
                GO AGAIN
              </button>
            )}
          </div>
        </div>

        {/* Queue Information */}
        <div className="bg-green-950/80 backdrop-blur-sm border-2 border-yellow-500/50 p-6 rounded-lg shadow-lg">
          <h3 className="text-2xl font-bold text-yellow-300 mb-4 uppercase tracking-wider text-center">
            🎅 Queue Status 🎅
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-red-900/30 border-2 border-green-500 rounded-lg">
              <div className="text-4xl font-bold text-green-300 tabular-nums">
                {queueLength}
              </div>
              <div className="text-sm text-green-200 uppercase tracking-wider mt-2">People Waiting</div>
            </div>
            <div className="text-center p-4 bg-green-900/30 border-2 border-red-500 rounded-lg">
              <div className="text-4xl font-bold text-red-300">
                {isYourTurn ? '🎉' : queuePosition > 0 ? `#${queuePosition}` : '—'}
              </div>
              <div className="text-sm text-red-200 uppercase tracking-wider mt-2">Your Position</div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center text-green-100">
          <p className="text-lg mb-2">⏱️ Each turn lasts 1 minute</p>
          <p className="text-sm text-green-200">
            Pick your favorite Christmas theme and watch it come to life!
          </p>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
