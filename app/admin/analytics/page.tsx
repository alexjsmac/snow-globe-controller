'use client';

import { useEffect, useState, useRef } from 'react';
import { firestore } from '@/lib/firebase-config';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import Link from 'next/link';

interface SessionData {
  sessionId: string;
  startTime: number;
  endTime: number;
  statistics?: {
    average: number;
    min: number;
    max: number;
    standardDeviation?: number;
  };
}

export default function AdminAnalytics() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'bar' | 'line'>('line'); // Start with line view to show animation
  const [lineAnimationComplete, setLineAnimationComplete] = useState(false);
  const pathRef = useRef<SVGPathElement>(null);
  
  useEffect(() => {
    fetchSessions();
  }, []);
  
  // Animate line drawing when data loads and in line view
  useEffect(() => {
    if (!loading && sessions.length > 0 && viewMode === 'line' && pathRef.current) {
      // Small delay to ensure smooth transition from loading state
      const startDelay = setTimeout(() => {
        // Reset animation
        setLineAnimationComplete(false);
        
        if (pathRef.current) {
          // Get the total length of the path
          const pathLength = pathRef.current.getTotalLength();
          
          // Set up the path for animation
          pathRef.current.style.strokeDasharray = `${pathLength}`;
          pathRef.current.style.strokeDashoffset = `${pathLength}`;
          
          // Force browser to recalculate styles
          pathRef.current.getBoundingClientRect();
          
          // Animate the line drawing with easing
          pathRef.current.style.transition = 'stroke-dashoffset 2.5s cubic-bezier(0.4, 0, 0.2, 1)';
          pathRef.current.style.strokeDashoffset = '0';
          
          // Mark animation as complete after it finishes
          setTimeout(() => {
            setLineAnimationComplete(true);
            if (pathRef.current) {
              pathRef.current.style.strokeDasharray = '';
              pathRef.current.style.strokeDashoffset = '';
            }
          }, 2500);
        }
      }, 100);
      
      return () => clearTimeout(startDelay);
    }
  }, [loading, sessions, viewMode]);

  const fetchSessions = async () => {
    if (!firestore) {
      console.error('Firestore is not initialized');
      setLoading(false);
      return;
    }
    try {
      const sessionsRef = collection(firestore, 'sessions');
      const q = query(sessionsRef, orderBy('startTime', 'asc'));
      const querySnapshot = await getDocs(q);
      
      const sessionsData: SessionData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as SessionData;
        // Filter out inactive sessions (where min and max are both 0)
        if (data.statistics && !(data.statistics.min === 0 && data.statistics.max === 0)) {
          sessionsData.push(data);
        }
      });
      
      setSessions(sessionsData);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate graph dimensions and scaling
  const graphWidth = 1200;
  const graphHeight = 500;
  const padding = { top: 40, right: 40, bottom: 80, left: 60 };
  const plotWidth = graphWidth - padding.left - padding.right;
  const plotHeight = graphHeight - padding.top - padding.bottom;
  
  // Scale values from [-1, 1] to graph coordinates
  const scaleY = (value: number) => {
    // value is between -1 and 1, map to plotHeight
    return plotHeight / 2 - (value * plotHeight / 2);
  };
  
  const scaleX = (index: number) => {
    return (index / Math.max(sessions.length - 1, 1)) * plotWidth;
  };

  // Calculate statistics
  const averages = sessions.map(s => s.statistics?.average || 0);
  const globalAverage = averages.reduce((a, b) => a + b, 0) / (averages.length || 1);
  const maxAvg = Math.max(...averages, 0);
  const minAvg = Math.min(...averages, 0);

  // Create SVG path for line graph
  const createLinePath = () => {
    if (sessions.length === 0) return '';
    
    return sessions
      .map((session, i) => {
        const x = scaleX(i);
        const y = scaleY(session.statistics?.average || 0);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  // Create polyline points for area under curve
  const createAreaPath = () => {
    if (sessions.length === 0) return '';
    
    const topPath = sessions
      .map((session, i) => `${scaleX(i)},${scaleY(session.statistics?.average || 0)}`)
      .join(' ');
    
    // Use slice() to create a copy before reversing to avoid mutating original array
    const bottomPath = sessions
      .slice()
      .reverse()
      .map((_, i) => `${scaleX(sessions.length - 1 - i)},${scaleY(0)}`)
      .join(' ');
    
    return topPath + ' ' + bottomPath;
  };

  // Format timestamp to readable time
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8 font-mono">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent mb-2">
              SESSION ANALYTICS
            </h1>
            <div className="h-6 w-48 bg-gray-800 animate-pulse rounded"></div>
          </div>
          
          {/* Skeleton stats cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="border border-gray-800 p-4 bg-gray-900/50">
                <div className="h-4 w-20 bg-gray-800 animate-pulse rounded mb-2"></div>
                <div className="h-8 w-24 bg-gray-800 animate-pulse rounded"></div>
              </div>
            ))}
          </div>
          
          {/* Skeleton graph */}
          <div className="border border-gray-800 bg-gray-900/50 p-6 h-[500px] flex items-center justify-center">
            <div className="text-cyan-400 text-xl animate-pulse">Loading session data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 font-mono">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent mb-2">
              SESSION ANALYTICS
            </h1>
            <p className="text-gray-400">
              Active sessions: {sessions.length} | Global Average: {globalAverage.toFixed(4)}
            </p>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={() => setViewMode(viewMode === 'bar' ? 'line' : 'bar')}
              className="px-4 py-2 border border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all"
            >
              {viewMode === 'bar' ? 'LINE VIEW' : 'BAR VIEW'}
            </button>
            <Link
              href="/admin"
              className="px-4 py-2 border border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white transition-all"
            >
              BACK TO ADMIN
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="border border-gray-800 p-4 bg-gray-900/50 backdrop-blur">
            <div className="text-gray-400 text-sm">MIN AVERAGE</div>
            <div className="text-2xl text-red-400">{minAvg.toFixed(4)}</div>
          </div>
          <div className="border border-gray-800 p-4 bg-gray-900/50 backdrop-blur">
            <div className="text-gray-400 text-sm">MAX AVERAGE</div>
            <div className="text-2xl text-green-400">{maxAvg.toFixed(4)}</div>
          </div>
          <div className="border border-gray-800 p-4 bg-gray-900/50 backdrop-blur">
            <div className="text-gray-400 text-sm">GLOBAL AVERAGE</div>
            <div className="text-2xl text-cyan-400">{globalAverage.toFixed(4)}</div>
          </div>
          <div className="border border-gray-800 p-4 bg-gray-900/50 backdrop-blur">
            <div className="text-gray-400 text-sm">TREND</div>
            <div className="text-2xl">
              {sessions.length > 1 ? (
                <>
                  {(() => {
                    const firstAvg = sessions[0].statistics?.average || 0;
                    const lastAvg = sessions[sessions.length - 1].statistics?.average || 0;
                    const diff = lastAvg - firstAvg;
                    
                    if (Math.abs(diff) < 0.01) {
                      return <span className="text-gray-400">→ STABLE</span>;
                    } else if (diff > 0) {
                      return <span className="text-green-400">↑ UP</span>;
                    } else {
                      return <span className="text-red-400">↓ DOWN</span>;
                    }
                  })()}
                </>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
          </div>
        </div>

        {/* Main Graph */}
        <div className="border border-gray-800 bg-gray-900/50 backdrop-blur p-6 relative overflow-hidden">
          {/* Animated background grid */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `linear-gradient(cyan 1px, transparent 1px), linear-gradient(90deg, cyan 1px, transparent 1px)`,
              backgroundSize: '50px 50px',
              animation: 'slide 10s linear infinite'
            }}></div>
          </div>

          <svg
            width={graphWidth}
            height={graphHeight}
            className="relative z-10"
            viewBox={`0 0 ${graphWidth} ${graphHeight}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ maxWidth: '100%', height: 'auto' }}
          >
            <defs>
              <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00ffff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#9333ea" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00ffff" />
                <stop offset="50%" stopColor="#9333ea" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            <g transform={`translate(${padding.left}, ${padding.top})`}>
              {/* Y-axis label - positioned outside the main graph area */}
              <text
                x={-45}
                y={plotHeight / 2}
                fill="#666"
                fontSize="12"
                textAnchor="middle"
                transform={`rotate(-90, -45, ${plotHeight / 2})`}
              >
                Slider Value
              </text>
              {/* Grid lines */}
              {[-1, -0.5, 0, 0.5, 1].map(val => (
                <g key={val}>
                  <line
                    x1={0}
                    y1={scaleY(val)}
                    x2={plotWidth}
                    y2={scaleY(val)}
                    stroke={val === 0 ? '#666' : '#333'}
                    strokeWidth={val === 0 ? 2 : 1}
                    strokeDasharray={val === 0 ? "0" : "5,5"}
                  />
                  <text
                    x={-10}
                    y={scaleY(val) + 5}
                    fill="#666"
                    fontSize="12"
                    textAnchor="end"
                  >
                    {val.toFixed(1)}
                  </text>
                </g>
              ))}

              {/* Global average line */}
              <line
                x1={0}
                y1={scaleY(globalAverage)}
                x2={plotWidth}
                y2={scaleY(globalAverage)}
                stroke="#00ffff"
                strokeWidth={2}
                strokeDasharray="10,5"
                opacity={0.5}
              />
              <text
                x={plotWidth + 5}
                y={scaleY(globalAverage) + 5}
                fill="#00ffff"
                fontSize="10"
              >
                AVG
              </text>

              {viewMode === 'bar' ? (
                // Bar chart
                <>
                  {sessions.map((session, i) => {
                    const avg = session.statistics?.average || 0;
                    const barHeight = Math.abs(avg) * (plotHeight / 2);
                    const barY = avg > 0 ? scaleY(avg) : scaleY(0);
                    const barWidth = Math.max(1, plotWidth / sessions.length - 1);
                    const isHovered = hoveredIndex === i;

                    return (
                      <g key={i}>
                        <rect
                          x={scaleX(i) - barWidth / 2}
                          y={barY}
                          width={barWidth}
                          height={barHeight}
                          fill="url(#barGradient)"
                          opacity={isHovered ? 1 : 0.7}
                          stroke={isHovered ? '#00ffff' : 'none'}
                          strokeWidth={2}
                          onMouseEnter={() => setHoveredIndex(i)}
                          onMouseLeave={() => setHoveredIndex(null)}
                          style={{ transition: 'all 0.3s ease' }}
                        />
                        {isHovered && (
                          <g>
                            <rect
                              x={scaleX(i) - 60}
                              y={barY - 40}
                              width={120}
                              height={30}
                              fill="black"
                              stroke="#00ffff"
                              strokeWidth={1}
                              opacity={0.9}
                            />
                            <text
                              x={scaleX(i)}
                              y={barY - 25}
                              fill="#00ffff"
                              fontSize="10"
                              textAnchor="middle"
                            >
                              {avg.toFixed(4)}
                            </text>
                            <text
                              x={scaleX(i)}
                              y={barY - 15}
                              fill="#666"
                              fontSize="8"
                              textAnchor="middle"
                            >
                              {formatTime(session.startTime)}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </>
              ) : (
                // Line chart with area
                <>
                  <polygon
                    points={createAreaPath()}
                    fill="url(#barGradient)"
                    opacity={lineAnimationComplete ? 0.3 : 0}
                    style={{
                      transition: 'opacity 1s ease-out 1.5s'
                    }}
                  />
                  <path
                    ref={pathRef}
                    d={createLinePath()}
                    stroke="url(#lineGradient)"
                    strokeWidth={3}
                    fill="none"
                    filter="url(#glow)"
                  />
                  {sessions.map((session, i) => {
                    const isHovered = hoveredIndex === i;
                    const avg = session.statistics?.average || 0;
                    // Calculate delay for staggered appearance
                    const delay = (i / sessions.length) * 2; // 2 seconds total animation

                    return (
                      <g key={i}>
                        <circle
                          cx={scaleX(i)}
                          cy={scaleY(avg)}
                          r={isHovered ? 8 : 4}
                          fill="#00ffff"
                          stroke="white"
                          strokeWidth={2}
                          opacity={isHovered ? 1 : lineAnimationComplete ? 0.8 : 0}
                          onMouseEnter={() => setHoveredIndex(i)}
                          onMouseLeave={() => setHoveredIndex(null)}
                          style={{ 
                            transition: 'all 0.3s ease', 
                            cursor: 'pointer',
                            animation: lineAnimationComplete ? 'none' : `fadeIn 0.3s ease-out ${delay}s forwards`
                          }}
                        />
                        {isHovered && (
                          <g>
                            <rect
                              x={scaleX(i) - 60}
                              y={scaleY(avg) - 40}
                              width={120}
                              height={30}
                              fill="black"
                              stroke="#00ffff"
                              strokeWidth={1}
                              opacity={0.9}
                            />
                            <text
                              x={scaleX(i)}
                              y={scaleY(avg) - 25}
                              fill="#00ffff"
                              fontSize="10"
                              textAnchor="middle"
                            >
                              {avg.toFixed(4)}
                            </text>
                            <text
                              x={scaleX(i)}
                              y={scaleY(avg) - 15}
                              fill="#666"
                              fontSize="8"
                              textAnchor="middle"
                            >
                              {formatTime(session.startTime)}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </>
              )}

              {/* X-axis labels */}
              <g>
                <text
                  x={0}
                  y={plotHeight + 30}
                  fill="#666"
                  fontSize="10"
                  textAnchor="start"
                >
                  {sessions[0] && formatTime(sessions[0].startTime)}
                </text>
                <text
                  x={plotWidth}
                  y={plotHeight + 30}
                  fill="#666"
                  fontSize="10"
                  textAnchor="end"
                >
                  {sessions[sessions.length - 1] && formatTime(sessions[sessions.length - 1].startTime)}
                </text>
                <text
                  x={plotWidth / 2}
                  y={plotHeight + 50}
                  fill="#666"
                  fontSize="12"
                  textAnchor="middle"
                >
                  Session Timeline →
                </text>
              </g>

            </g>
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-6 flex justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-cyan-400 to-purple-600"></div>
            <span className="text-gray-400">Session Average</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-cyan-400" style={{ borderTop: '2px dashed' }}></div>
            <span className="text-gray-400">Global Average</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-gray-600"></div>
            <span className="text-gray-400">Neutral (0)</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(50px, 50px);
          }
        }
        
        @keyframes fadeIn {
          0% {
            opacity: 0;
            transform: scale(0);
          }
          100% {
            opacity: 0.8;
            transform: scale(1);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}