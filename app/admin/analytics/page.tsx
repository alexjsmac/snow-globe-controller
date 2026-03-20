'use client';

import { useEffect, useMemo, useState } from 'react';
import { firestore } from '@/lib/firebase-config';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import Link from 'next/link';
import { colorOptions, effectOptions, patternOptions } from '@/lib/theme-options';

interface SessionTheme {
  row1: string;
  row2: string;
  row3: string;
}

interface SessionData {
  sessionId: string;
  startTime: number;
  endTime: number;
  createdAt?: number;
  theme?: SessionTheme;
}

function toMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  // Firestore Timestamp-like
  if (
    value &&
    typeof value === 'object' &&
    'seconds' in value &&
    typeof (value as { seconds: unknown }).seconds === 'number'
  ) {
    return (value as { seconds: number }).seconds * 1000;
  }

  if (typeof value === 'string') {
    const d = new Date(value);
    const ms = d.getTime();
    return Number.isNaN(ms) ? null : ms;
  }

  return null;
}

function countBy<T extends string>(items: T[]): Record<T, number> {
  return items.reduce(
    (acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    },
    {} as Record<T, number>
  );
}

type ThemeOptionLike = { id: string; name: string; symbol: string };

type ThemeGroup = {
  key: 'colors' | 'patterns' | 'effects';
  title: string;
  options: ThemeOptionLike[];
  counts: Record<string, number>;
  total: number;
};

function formatPercent(count: number, total: number): string {
  if (total <= 0) return '0%';
  return `${Math.round((count / total) * 100)}%`;
}

function buildRowsForGroup(group: ThemeGroup): Array<{
  id: string;
  label: string;
  count: number;
  percent: string;
}> {
  const knownCount = group.options.reduce((sum, opt) => sum + (group.counts[opt.id] || 0), 0);
  const otherCount = Math.max(0, group.total - knownCount);

  const rows = group.options.map((opt) => {
    const count = group.counts[opt.id] || 0;
    return {
      id: opt.id,
      label: `${opt.symbol} ${opt.name}`,
      count,
      percent: formatPercent(count, group.total),
    };
  });

  if (otherCount > 0) {
    rows.push({
      id: 'other',
      label: '… Other',
      count: otherCount,
      percent: formatPercent(otherCount, group.total),
    });
  }

  return rows;
}

function ThemeBreakdownChart({
  themeSessionCount,
  groups,
}: {
  themeSessionCount: number;
  groups: ThemeGroup[];
}) {
  const width = 1200;
  const padding = {
    top: 28,
    right: 170,
    bottom: 18,
    left: 24,
  };

  const groupTitleHeight = 26;
  const rowHeight = 28;
  const groupGap = 18;

  const groupRows = groups.map((g) => ({ group: g, rows: buildRowsForGroup(g) }));
  const height =
    padding.top +
    padding.bottom +
    groupRows.reduce((sum, gr) => {
      return sum + groupTitleHeight + gr.rows.length * rowHeight + groupGap;
    }, 0) -
    groupGap;

  const labelColWidth = 220;
  const barStartX = padding.left + labelColWidth;
  const barMaxWidth = width - barStartX - padding.right;

  let y = padding.top;

  return (
    <section
      className="border border-gray-800 bg-gray-900/50 backdrop-blur p-6 relative overflow-hidden"
      aria-label="Theme breakdown chart"
    >
      {/* Subtle animated grid background */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(cyan 1px, transparent 1px), linear-gradient(90deg, cyan 1px, transparent 1px)',
            backgroundSize: '50px 50px',
            animation: 'slide 10s linear infinite',
          }}
        />
      </div>

      <svg
        className="relative z-10 w-full h-auto"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Theme breakdown across ${themeSessionCount} session(s)`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="themeBar" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00ffff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#9333ea" stopOpacity="0.55" />
          </linearGradient>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Header */}
        <text
          x={padding.left}
          y={18}
          fill="#00ffff"
          fontSize={14}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
        >
          Theme Selections (counts + %)
        </text>
        <text
          x={width - padding.right}
          y={18}
          fill="#9ca3af"
          fontSize={12}
          textAnchor="end"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
        >
          Total sessions: {themeSessionCount}
        </text>

        {/* Groups */}
        {groupRows.map(({ group, rows }) => {
          const groupYStart = y;
          y += groupTitleHeight;

          return (
            <g key={group.key}>
              <text
                x={padding.left}
                y={groupYStart + 18}
                fill="#e5e7eb"
                fontSize={13}
                fontWeight={700}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
              >
                {group.title}
              </text>
              <text
                x={width - padding.right}
                y={groupYStart + 18}
                fill="#9ca3af"
                fontSize={12}
                textAnchor="end"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
              >
                n = {group.total}
              </text>

              {rows.map((row) => {
                const rowY = y;
                y += rowHeight;

                const barWidth = group.total > 0 ? (row.count / group.total) * barMaxWidth : 0;

                return (
                  <g key={`${group.key}:${row.id}`}>
                    <text
                      x={padding.left}
                      y={rowY + 18}
                      fill="#d1d5db"
                      fontSize={12}
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
                    >
                      {row.label}
                    </text>

                    <rect
                      x={barStartX}
                      y={rowY + 6}
                      width={barMaxWidth}
                      height={14}
                      fill="#0b1220"
                      stroke="#1f2937"
                      strokeWidth={1}
                    />
                    <rect
                      x={barStartX}
                      y={rowY + 6}
                      width={barWidth}
                      height={14}
                      fill="url(#themeBar)"
                      filter="url(#softGlow)"
                    />

                    <text
                      x={barStartX + barMaxWidth + 10}
                      y={rowY + 18}
                      fill="#e5e7eb"
                      fontSize={12}
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
                    >
                      {row.count} ({row.percent})
                    </text>
                  </g>
                );
              })}

              {(() => {
                y += groupGap;
                return null;
              })()}
            </g>
          );
        })}
      </svg>

      <style jsx>{`
        @keyframes slide {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(50px, 50px);
          }
        }
      `}</style>
    </section>
  );
}

export default function AdminAnalytics() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const sessionsWithTheme = useMemo(() => {
    return sessions.filter((s) => s.theme && s.theme.row1 && s.theme.row2 && s.theme.row3);
  }, [sessions]);

  const themeCounts = useMemo(() => {
    const colors = countBy(sessionsWithTheme.map((s) => s.theme!.row1));
    const patterns = countBy(sessionsWithTheme.map((s) => s.theme!.row2));
    const effects = countBy(sessionsWithTheme.map((s) => s.theme!.row3));

    return { colors, patterns, effects };
  }, [sessionsWithTheme]);

  const chartGroups: ThemeGroup[] = useMemo(() => {
    const total = sessionsWithTheme.length;

    return [
      {
        key: 'colors',
        title: 'Color Palette',
        options: colorOptions,
        counts: themeCounts.colors,
        total,
      },
      {
        key: 'patterns',
        title: 'Light Pattern',
        options: patternOptions,
        counts: themeCounts.patterns,
        total,
      },
      {
        key: 'effects',
        title: 'Special Effect',
        options: effectOptions,
        counts: themeCounts.effects,
        total,
      },
    ];
  }, [sessionsWithTheme.length, themeCounts.colors, themeCounts.effects, themeCounts.patterns]);

  const timeRange = useMemo(() => {
    if (sessionsWithTheme.length === 0) return null;

    const minStart = Math.min(...sessionsWithTheme.map((s) => s.startTime || 0));
    const maxEnd = Math.max(...sessionsWithTheme.map((s) => s.endTime || 0));

    return {
      minStart,
      maxEnd,
    };
  }, [sessionsWithTheme]);

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
        const raw = doc.data() as Record<string, unknown>;

        const startTime = toMs(raw.startTime) ?? 0;
        const endTime = toMs(raw.endTime) ?? 0;
        const createdAt = toMs(raw.createdAt) ?? undefined;

        const themeRaw = raw.theme as Record<string, unknown> | undefined;
        const theme =
          themeRaw &&
          typeof themeRaw.row1 === 'string' &&
          typeof themeRaw.row2 === 'string' &&
          typeof themeRaw.row3 === 'string'
            ? {
                row1: themeRaw.row1,
                row2: themeRaw.row2,
                row3: themeRaw.row3,
              }
            : undefined;

        // Prefer stored sessionId; fall back to doc ID.
        const sessionId =
          typeof raw.sessionId === 'string' && raw.sessionId.length > 0 ? raw.sessionId : doc.id;

        sessionsData.push({
          sessionId,
          startTime,
          endTime,
          createdAt,
          theme,
        });
      });

      setSessions(sessionsData);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
            {[1, 2, 3, 4].map((i) => (
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
              Theme sessions: {sessionsWithTheme.length}
              {timeRange && (
                <>
                  {' '}
                  | {formatTime(timeRange.minStart)} → {formatTime(timeRange.maxEnd)}
                </>
              )}
            </p>
          </div>

          <div className="flex gap-4">
            <Link
              href="/admin"
              className="px-4 py-2 border border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white transition-all"
            >
              BACK TO ADMIN
            </Link>
          </div>
        </div>

        {/* Theme Breakdown Chart */}
        {sessionsWithTheme.length > 0 ? (
          <ThemeBreakdownChart themeSessionCount={sessionsWithTheme.length} groups={chartGroups} />
        ) : (
          <div className="border border-gray-800 bg-gray-900/50 backdrop-blur p-6 text-gray-400">
            No theme sessions found.
          </div>
        )}
      </div>
    </div>
  );
}
