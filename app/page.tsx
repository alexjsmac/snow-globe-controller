'use client';

import { useState } from 'react';
import { useSocket } from '@/hooks/useFirebaseQueue';
import { useAccelerometerStreaming } from '@/hooks/useAccelerometer';
import { ThemeSelector } from '@/components/ThemeSelector';
import { Footer } from '@/components/Footer';
import SnowParticles from '@/components/SnowParticles';
import {
  colorOptions,
  patternOptions,
  effectOptions,
  defaultThemeSelection,
} from '@/lib/theme-options';
import { Wifi, WifiOff, Clock, Users, Zap } from 'lucide-react';

export default function Home() {
  const {
    isConnected,
    sessionId,
    isActive,
    queuePosition,
    queueLength,
    remainingTime,
    submitTheme,
  } = useSocket();

  const [selectedRow1, setSelectedRow1] = useState(defaultThemeSelection.row1);
  const [selectedRow2, setSelectedRow2] = useState(defaultThemeSelection.row2);
  const [selectedRow3, setSelectedRow3] = useState(defaultThemeSelection.row3);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [showMotionModal, setShowMotionModal] = useState(false);

  const {
    isSupported: motionSupported,
    lastSample: motionSample,
    error: motionError,
    requestPermission: requestMotionPermission,
  } = useAccelerometerStreaming({
    enabled: isActive && !!sessionId && motionEnabled,
    sessionId,
    throttleMs: 50,
  });

  const handleSubmit = async () => {
    if (motionSupported && !motionEnabled) {
      setShowMotionModal(true);
      return;
    }
    await executeSubmission();
  };

  const executeSubmission = async () => {
    try {
      await submitTheme(selectedRow1, selectedRow2, selectedRow3);
      setHasSubmitted(true);
      setShowMotionModal(false);
    } catch (error) {
      console.error('Failed to submit theme:', error);
    }
  };

  const handleEnableAndSubmit = async () => {
    const granted = await requestMotionPermission();
    if (granted) {
      setMotionEnabled(true);
    }
    await executeSubmission();
  };

  const handleSkipAndSubmit = async () => {
    await executeSubmission();
  };

  const handleToggleMotion = async () => {
    if (motionEnabled) {
      setMotionEnabled(false);
      return;
    }

    const granted = await requestMotionPermission();
    if (granted) {
      setMotionEnabled(true);
    }
  };

  const handleGoAgain = () => {
    setHasSubmitted(false);
    setSelectedRow1(defaultThemeSelection.row1);
    setSelectedRow2(defaultThemeSelection.row2);
    setSelectedRow3(defaultThemeSelection.row3);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const showSubmitButton = !hasSubmitted && queuePosition === -1;
  const isInQueue = queuePosition > 0;
  const isYourTurn = isActive && queuePosition === 0;
  const showGoAgainButton = hasSubmitted && !isYourTurn && queuePosition === -1;

  return (
    <div className="min-h-screen relative overflow-hidden text-foreground selection:bg-neon-cyan selection:text-black">
      {/* 3D Background */}
      <SnowParticles />

      {/* Motion Permission Modal */}
      {showMotionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel max-w-md w-full p-8 rounded-2xl border border-neon-cyan/50 shadow-[0_0_50px_rgba(0,243,255,0.2)] relative">
            <div className="text-center">
              <div className="w-16 h-16 bg-neon-cyan/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-neon-cyan animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-wider">
                Enable Motion Control?
              </h2>
              <p className="text-white/70 mb-8 leading-relaxed">
                For the full immersive experience, allow us to use your device&apos;s motion sensors
                to control the lights during your turn.
              </p>

              <div className="flex flex-col gap-4">
                <button
                  onClick={handleEnableAndSubmit}
                  className="w-full py-4 bg-neon-cyan text-black font-bold text-lg uppercase tracking-widest rounded-lg hover:bg-white transition-colors shadow-[0_0_20px_rgba(0,243,255,0.4)]"
                >
                  Enable & Join
                </button>
                <button
                  onClick={handleSkipAndSubmit}
                  className="w-full py-4 bg-transparent border border-white/20 text-white/60 font-mono uppercase tracking-widest rounded-lg hover:bg-white/10 hover:text-white transition-colors"
                >
                  Skip for Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        {/* Header */}
        <header className="text-center mb-12 pt-8">
          <h1 className="text-6xl md:text-7xl font-black mb-4 tracking-tighter">
            <span className="neon-text-cyan">THE POLAR</span>
            <span className="block text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
              VAULT
            </span>
          </h1>
          <p className="text-neon-magenta text-xl tracking-widest font-mono uppercase">
            Immersive Photobooth Expedition
          </p>
        </header>

        {/* Connection Status */}
        <div className="mb-8 flex justify-center">
          <div
            className={`
            glass-panel px-6 py-2 rounded-full flex items-center gap-3
            ${isConnected ? 'border-neon-lime/30' : 'border-red-500/30'}
          `}
          >
            {isConnected ? (
              <Wifi className="w-5 h-5 text-neon-lime animate-pulse" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            <span
              className={`text-sm font-mono tracking-wider uppercase ${isConnected ? 'text-neon-lime' : 'text-red-400'}`}
            >
              {isConnected ? 'System Online' : 'Connection Lost'}
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="glass-panel rounded-2xl p-8 mb-8 relative overflow-hidden">
          {/* Decorative Corners */}
          <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-neon-cyan/30 rounded-tl-2xl"></div>
          <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-neon-cyan/30 rounded-tr-2xl"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-neon-cyan/30 rounded-bl-2xl"></div>
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-neon-cyan/30 rounded-br-2xl"></div>

          {/* Status Banner - Your Turn! */}
          {isYourTurn && (
            <div className="mb-8 p-8 bg-neon-lime/10 border border-neon-lime/50 rounded-xl relative overflow-hidden animate-pulse">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                  <h2 className="text-3xl font-black text-neon-lime tracking-tighter italic uppercase mb-2">
                    It&apos;s Showtime!
                  </h2>
                  <p className="text-lg text-white/80 font-mono">
                    Your theme is live. Capture the moment!
                  </p>
                </div>
                <div className="text-center bg-black/30 p-4 rounded-lg border border-neon-lime/30">
                  <div className="text-5xl font-bold text-neon-lime tabular-nums font-mono">
                    {formatTime(remainingTime)}
                  </div>
                  <div className="text-xs text-neon-lime/70 uppercase tracking-widest mt-1">
                    Time Remaining
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-6 h-1 bg-black/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-neon-lime shadow-[0_0_10px_rgba(204,255,0,0.6)] transition-all duration-1000 ease-linear"
                  style={{ width: `${(remainingTime / 60) * 100}%` }}
                />
              </div>
            </div>
          )}

          {isYourTurn && (
            <div className="mb-8 flex flex-col items-center gap-4">
              {motionSupported ? (
                <div className="w-full max-w-md">
                  <button
                    type="button"
                    onClick={handleToggleMotion}
                    className={`
                      w-full py-4 rounded-xl font-bold text-lg uppercase tracking-wider transition-all
                      flex items-center justify-center gap-3
                      ${
                        motionEnabled
                          ? 'bg-neon-purple/20 border border-neon-purple text-neon-purple shadow-[0_0_20px_rgba(188,19,254,0.3)]'
                          : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                      }
                    `}
                  >
                    <Zap className={`w-5 h-5 ${motionEnabled ? 'fill-current' : ''}`} />
                    {motionEnabled ? 'Motion Control Active' : 'Enable Motion Control'}
                  </button>

                  {motionError && (
                    <p className="text-xs text-red-400 mt-2 text-center font-mono">{motionError}</p>
                  )}

                  {motionEnabled && motionSample && (
                    <div className="mt-4 p-4 bg-black/40 rounded-lg border border-neon-purple/30 font-mono text-xs text-neon-purple/80">
                      <div className="flex justify-between mb-1">
                        <span>X-AXIS</span>
                        <span>{motionSample.x.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span>Y-AXIS</span>
                        <span>{motionSample.y.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Z-AXIS</span>
                        <span>{motionSample.z.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-yellow-500/80 font-mono border border-yellow-500/30 px-4 py-2 rounded">
                  ⚠ Motion controls not supported on this device
                </p>
              )}
            </div>
          )}

          {isInQueue && (
            <div className="mb-8 p-8 bg-neon-cyan/10 border border-neon-cyan/50 rounded-xl text-center">
              <h2 className="text-2xl font-bold text-neon-cyan tracking-widest uppercase mb-6 flex items-center justify-center gap-3">
                <Clock className="w-6 h-6" />
                In Queue
              </h2>
              <div className="flex flex-col md:flex-row justify-center gap-8">
                <div>
                  <div className="text-5xl font-bold text-white mb-2 font-mono">
                    {queuePosition}
                    <span className="text-2xl text-white/50">/{queueLength}</span>
                  </div>
                  <div className="text-xs text-neon-cyan/70 uppercase tracking-widest">
                    Your Position
                  </div>
                </div>
                <div className="hidden md:block w-px bg-neon-cyan/30"></div>
                <div>
                  <div className="text-5xl font-bold text-white mb-2 font-mono">
                    {formatTime(queuePosition * 60)}
                  </div>
                  <div className="text-xs text-neon-cyan/70 uppercase tracking-widest">
                    Est. Wait Time
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Theme Selector */}
          {showSubmitButton && (
            <div className="mb-8">
              <div className="text-center mb-10">
                <h2 className="text-2xl font-bold text-white mb-3 tracking-wide">
                  Design Your Experience
                </h2>
                <p className="text-white/60 font-light">
                  Swipe to customize your lighting sequence
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
            <div className="mb-8 p-6 bg-black/40 border border-white/10 rounded-xl">
              <h3 className="text-center text-sm font-bold text-white/70 mb-6 uppercase tracking-widest">
                Active Configuration
              </h3>
              <div className="flex justify-center gap-12 text-center">
                {[
                  { opt: colorOptions.find((o) => o.id === selectedRow1), label: 'Color' },
                  { opt: patternOptions.find((o) => o.id === selectedRow2), label: 'Pattern' },
                  { opt: effectOptions.find((o) => o.id === selectedRow3), label: 'Effect' },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="text-4xl filter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                      {item.opt?.symbol}
                    </div>
                    <div className="text-xs text-neon-cyan font-mono uppercase">
                      {item.opt?.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col items-center gap-6">
            {showSubmitButton && (
              <button
                onClick={handleSubmit}
                className="group relative px-12 py-6 bg-neon-cyan/10 border border-neon-cyan text-neon-cyan text-xl font-bold uppercase tracking-widest transition-all hover:bg-neon-cyan hover:text-black hover:shadow-[0_0_30px_rgba(0,243,255,0.6)] rounded-none clip-path-button"
                style={{ clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)' }}
              >
                <span className="relative z-10 flex items-center gap-3">
                  Initialize Sequence <Zap className="w-5 h-5" />
                </span>
              </button>
            )}

            {showGoAgainButton && (
              <button
                onClick={handleGoAgain}
                className="px-10 py-4 border border-white/30 text-white/80 font-mono uppercase tracking-widest hover:bg-white/10 hover:border-white hover:text-white transition-all rounded-lg"
              >
                Restart System
              </button>
            )}
          </div>
        </div>

        {/* Queue Information */}
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-lg font-bold text-white/80 mb-6 uppercase tracking-widest text-center flex items-center justify-center gap-2">
            <Users className="w-5 h-5" /> System Status
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="text-3xl font-bold text-white tabular-nums font-mono">
                {queueLength}
              </div>
              <div className="text-xs text-white/50 uppercase tracking-widest mt-2">
                Users Waiting
              </div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="text-3xl font-bold text-neon-magenta font-mono">
                {(() => {
                  if (isYourTurn) return 'ACTIVE';
                  if (queuePosition > 0) return `#${queuePosition}`;
                  return 'IDLE';
                })()}
              </div>
              <div className="text-xs text-neon-magenta/70 uppercase tracking-widest mt-2">
                Your Status
              </div>
            </div>
          </div>
        </div>

        {/* Motion Debug Panel */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-black/80 border border-gray-800 rounded font-mono text-xs text-gray-500">
            <div className="mb-2 text-gray-300 font-bold">DEBUG_OVERLAY</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div>sessionId: {sessionId?.slice(0, 8) ?? 'null'}...</div>
              <div>isActive: {String(isActive)}</div>
              <div>isYourTurn: {String(isYourTurn)}</div>
              <div>motionSupported: {String(motionSupported)}</div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
