'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { adminOps, type QueueStatistics } from '@/lib/admin-operations';
import { Footer } from '@/components/Footer';
import Link from 'next/link';
import styles from './admin.module.css';

type ResetStatusVariant = 'error' | 'warning' | 'success';

const getResetStatusVariant = (status: string): ResetStatusVariant => {
  if (status.includes('❌')) {
    return 'error';
  }
  if (status.includes('⚠️')) {
    return 'warning';
  }
  return 'success';
};

const getResetStatusStyles = (variant: ResetStatusVariant) => {
  if (variant === 'error') {
    return {
      background: 'rgba(220, 38, 38, 0.1)',
      color: '#ef4444',
      borderColor: 'rgba(220, 38, 38, 0.3)',
    } as const;
  }

  if (variant === 'warning') {
    return {
      background: 'rgba(245, 158, 11, 0.1)',
      color: '#f59e0b',
      borderColor: 'rgba(245, 158, 11, 0.3)',
    } as const;
  }

  return {
    background: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  } as const;
};

export default function AdminDashboard() {
  const { isAuthenticated, isLoading, login, logout } = useAdminAuth();
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [stats, setStats] = useState<QueueStatistics | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState('');

  // Subscribe to real-time updates when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = adminOps.subscribeToQueueStats(setStats);
    return unsubscribe;
  }, [isAuthenticated]);

  // Handle login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!login(password)) {
      setLoginError('Invalid password');
      return;
    }

    setPassword('');
  };

  // Handle queue reset
  const handleReset = async (type: 'quick' | 'full') => {
    if (!window.confirm(`Are you sure you want to perform a ${type} reset?`)) {
      return;
    }

    setIsResetting(true);
    setResetStatus('Resetting...');

    try {
      const options =
        type === 'quick'
          ? { clearQueue: true, clearSliderValues: true, initialize: true }
          : { clearQueue: true, clearSliderValues: true, clearSessions: true, initialize: true };

      const result = await adminOps.resetQueue(options);

      if (result.success) {
        setResetStatus(`✅ ${type === 'quick' ? 'Quick' : 'Full'} reset completed`);
      } else if (result.errors.length > 0) {
        // Partial success with some errors
        const errorMessages = result.errors.join('\n');
        if (type === 'full' && result.errors.some((e) => e.includes('Firestore sessions'))) {
          setResetStatus(`⚠️ Reset partially completed. Note: ${result.errors[0]}`);
        } else {
          setResetStatus(`⚠️ Reset completed with warnings:\n${errorMessages}`);
        }
      }

      setTimeout(() => setResetStatus(''), 5000);
    } catch (error) {
      console.error('Reset error:', error);
      setResetStatus(`❌ Reset failed: ${error}`);
      setTimeout(() => setResetStatus(''), 5000);
    } finally {
      setIsResetting(false);
    }
  };

  // Handle skip active user
  const handleSkipUser = async () => {
    if (!stats?.activeUser) return;

    if (!window.confirm('Skip current active user?')) {
      return;
    }

    try {
      await adminOps.skipActiveUser();
    } catch (error) {
      console.error('Error skipping user:', error);
    }
  };

  // Handle remove user from queue
  const handleRemoveUser = async (sessionId: string) => {
    if (!window.confirm('Remove this user from the queue?')) {
      return;
    }

    try {
      await adminOps.removeUserFromQueue(sessionId);
    } catch (error) {
      console.error('Error removing user:', error);
    }
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <p
            style={{
              color: '#06b6d4',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            [SYSTEM] Loading...
          </p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    const isPasswordConfigured = !!process.env.NEXT_PUBLIC_ADMIN_PASSWORD_HASH;

    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <h1 className={styles.loginTitle}>Admin Dashboard</h1>
          {!isPasswordConfigured ? (
            <div
              style={{
                padding: '1rem',
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                marginBottom: '1rem',
                clipPath:
                  'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
              }}
            >
              <p
                style={{
                  color: '#ef4444',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                [ERROR] Admin Password Not Configured
              </p>
              <p
                style={{
                  color: '#f87171',
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem',
                  fontFamily: 'monospace',
                }}
              >
                Please set the admin password in your environment:
              </p>
              <code
                style={{
                  display: 'block',
                  padding: '0.5rem',
                  background: 'rgba(31, 41, 55, 0.5)',
                  border: '1px solid rgba(75, 85, 99, 0.5)',
                  fontSize: '0.75rem',
                  color: '#06b6d4',
                  fontFamily: 'monospace',
                }}
              >
                NEXT_PUBLIC_ADMIN_PASSWORD_HASH=your_secure_password
              </code>
            </div>
          ) : (
            <form className={styles.loginForm} onSubmit={handleLogin}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel} htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className={styles.inputField}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                  autoFocus
                />
              </div>
              {loginError && <div className={styles.errorMessage}>{loginError}</div>}
              <button type="submit" className={styles.loginBtn}>
                Login
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Show admin dashboard
  // Show loading state if stats not loaded yet
  if (!stats) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Concrete Canopy Admin Dashboard</h1>
          <button onClick={logout} className={styles.logoutBtn}>
            Logout
          </button>
        </header>
        <div
          style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#06b6d4',
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          [SYSTEM] Loading queue statistics...
        </div>
      </div>
    );
  }

  const averageSliderValue = stats.averageSliderValue ?? 0;
  let averageSliderColor = '#06b6d4';
  if (averageSliderValue > 0.1) {
    averageSliderColor = '#10b981';
  } else if (averageSliderValue < -0.1) {
    averageSliderColor = '#ef4444';
  }

  const resetStatusVariant = resetStatus ? getResetStatusVariant(resetStatus) : null;
  const resetStatusStyles = resetStatusVariant ? getResetStatusStyles(resetStatusVariant) : null;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Concrete Canopy Admin Dashboard</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link
            href="/admin/analytics"
            className={styles.logoutBtn}
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #9333ea)',
              borderColor: '#06b6d4',
            }}
          >
            📊 Analytics
          </Link>
          <button onClick={logout} className={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </header>

      {/* Statistics Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Queue Status</div>
          <p className={styles.statValue}>
            {stats?.activeUser ? (
              <>
                Active
                <span className={styles.activeIndicator}>
                  <span className={styles.pulse}></span>
                  Live
                </span>
              </>
            ) : (
              'Idle'
            )}
          </p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Queue Length</div>
          <p className={styles.statValue}>{stats?.queueLength || 0}</p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Sessions Today</div>
          <p className={styles.statValue}>{stats?.totalSessionsToday || 0}</p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Avg Slider Value</div>
          <p
            className={`${styles.statValue} ${styles.statValueSmall}`}
            style={{
              color: averageSliderColor,
            }}
          >
            {stats?.averageSliderValue !== undefined
              ? (stats.averageSliderValue >= 0 ? '+' : '') + stats.averageSliderValue.toFixed(2)
              : '0.00'}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Queue Management */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Queue Management</h2>

          <div className={styles.queueList}>
            {/* Active User */}
            {stats?.activeUser && (
              <div className={`${styles.queueItem} ${styles.queueItemActive}`}>
                <div className={styles.queueInfo}>
                  <span className={styles.queuePosition}>Active User</span>
                  <span className={styles.queueSession}>
                    {stats.activeUser.sessionId.slice(0, 8)}...
                  </span>
                </div>
                <div className={styles.queueTimer}>
                  <span>⏱️</span>
                  <span>{formatTime(stats.activeUser.remainingTime)}</span>
                  <button onClick={handleSkipUser} className={styles.skipBtn}>
                    Skip
                  </button>
                </div>
              </div>
            )}

            {/* Waiting Users */}
            {stats?.waitingUsers && stats.waitingUsers.length > 0
              ? stats.waitingUsers.map((user) => (
                  <div key={user.sessionId} className={styles.queueItem}>
                    <div className={styles.queueInfo}>
                      <span className={styles.queuePosition}>Position #{user.position}</span>
                      <span className={styles.queueSession}>{user.sessionId.slice(0, 8)}...</span>
                    </div>
                    <button
                      onClick={() => handleRemoveUser(user.sessionId)}
                      className={styles.removeBtn}
                    >
                      Remove
                    </button>
                  </div>
                ))
              : !stats?.activeUser && <div className={styles.emptyQueue}>Queue is empty</div>}
          </div>

          {/* Current Slider Value */}
          {stats && typeof stats.currentSliderValue === 'number' && (
            <div className={styles.sliderIndicator}>
              <div className={styles.sliderLabel}>Current Slider Value</div>
              <div className={styles.sliderValue}>
                {(stats.currentSliderValue >= 0 ? '+' : '') + stats.currentSliderValue.toFixed(3)}
              </div>
              <div className={styles.sliderBar}>
                <div
                  className={styles.sliderFill}
                  style={{
                    width: `${((stats.currentSliderValue + 1) / 2) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* System Controls */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>System Controls</h2>

          <div className={styles.controls}>
            <button
              onClick={() => handleReset('quick')}
              disabled={isResetting}
              className={styles.controlBtn}
            >
              Quick Reset
            </button>
            <p className={styles.controlDesc}>Clear the current queue and slider values</p>

            <button
              onClick={() => handleReset('full')}
              disabled={isResetting}
              className={`${styles.controlBtn} ${styles.dangerBtn}`}
            >
              Full Reset
            </button>
            <p className={styles.controlDesc}>Clear everything including session history</p>

            {resetStatus && resetStatusStyles && (
              <div
                className={styles.controlDesc}
                style={{
                  whiteSpace: 'pre-line',
                  padding: '1rem',
                  marginTop: '1rem',
                  background: resetStatusStyles.background,
                  color: resetStatusStyles.color,
                  border: `1px solid ${resetStatusStyles.borderColor}`,
                  clipPath:
                    'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {resetStatus}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
