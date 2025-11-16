import React, { useEffect, useMemo, useState } from 'react';
import MinimalIcon from './icons/MinimalIcon.jsx';
import { sleepProgressService } from '../api/sleepProgressService';

const MetricCard = ({ label, value, hint }) => {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {hint ? <div className="metric-hint">{hint}</div> : null}
    </div>
  );
};

const RingProgress = ({ size = 140, value = 0, goal = 1, color = '#7f6aa4', track = '#eee', label, subtitle, gradientEnd, iconName }) => {
  const pct = Math.max(0, Math.min(1, goal > 0 ? value / goal : 0));
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * pct;
  const gap = circumference - dash;
  const gradId = `grad-${color.replace('#', '')}-${(gradientEnd || color).replace('#', '')}`;
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size} role="img" aria-label={label} style={{ filter: 'drop-shadow(0 2px 6px rgba(127,106,164,0.18))' }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={gradientEnd || color} />
          </linearGradient>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={track}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          strokeDasharray={`${dash} ${gap}`}
        />
        <text
          x="50%"
          y="46%"
          dominantBaseline="middle"
          textAnchor="middle"
          style={{ fontSize: '1.15rem', fontWeight: 800, fill: '#333' }}
        >
          {label}
        </text>
        <text
          x="50%"
          y="60%"
          dominantBaseline="middle"
          textAnchor="middle"
          style={{ fontSize: '0.9rem', fontWeight: 600, fill: '#666' }}
        >
          {subtitle}
        </text>
      </svg>
      {iconName ? (
        <div style={{ marginTop: '0.25rem', opacity: 0.85 }}>
          <MinimalIcon name={iconName} size={16} />
        </div>
      ) : null}
    </div>
  );
};

const TrendSparkline = ({ data, color = '#a68cab', height = 48, stripes = [] }) => {
  const vw = 160;
  const padding = 6;
  const stripeEls = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0 || !Array.isArray(stripes) || stripes.length === 0) return null;
    const stepX = (vw - padding * 2) / Math.max(1, data.length - 1);
    const rects = [];
    stripes.forEach((idx) => {
      if (idx < 0 || idx >= data.length) return;
      let x = padding + idx * stepX - stepX * 0.5;
      const w = Math.max(2, stepX);
      // clamp within inner area
      if (x < padding) x = padding;
      if (x + w > vw - padding) x = Math.max(padding, (vw - padding) - w);
      rects.push({ x, w, y: padding, h: height - padding * 2 });
    });
    return rects;
  }, [data, stripes, height]);
  const d = useMemo(() => {
    if (!Array.isArray(data) || data.length < 2) return '';
    const values = data.map(p => p.y);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1e-6, max - min);
    const stepX = (vw - padding * 2) / (data.length - 1);
    const yFor = (v) => {
      const t = (v - min) / span;
      return padding + (height - padding * 2) * (1 - t);
    };
    return data
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${padding + i * stepX} ${yFor(p.y)}`)
      .join(' ');
  }, [data, height]);
  if (!d) return null;
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${vw} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="trend sparkline"
      style={{ filter: 'drop-shadow(0 1px 4px rgba(127,106,164,0.12))', display: 'block' }}
    >
      {stripeEls && stripeEls.map((r, idx) => (
        <rect key={idx} x={r.x} y={r.y} width={r.w} height={r.h} fill="#ede3f7" />
      ))}
      {/* shadow path */}
      <path d={d} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="4" />
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" />
    </svg>
  );
};

const MetricTrendCard = ({ title, value, change, data, color }) => {
  const isUp = typeof change === 'number' && change > 0;
  const isDown = typeof change === 'number' && change < 0;
  const changeLabel = typeof change === 'number' ? `${isUp ? '+' : ''}${change.toFixed(0)}%` : '—';
  return (
    <div className="metric-trend-card">
      <div className="metric-trend-header">
        <div className="metric-trend-title">{title}</div>
        <div className="metric-trend-value">{value}</div>
      </div>
      <div className="metric-trend-body">
        <TrendSparkline data={data} color={color} />
        <div className={`metric-trend-change ${isUp ? 'up' : isDown ? 'down' : ''}`}>
          {isUp && <span aria-hidden="true">▲</span>}
          {isDown && <span aria-hidden="true">▼</span>}
          <span>{changeLabel}</span>
        </div>
      </div>
    </div>
  );
};

const PlaceholderChart = () => {
  return (
    <div className="placeholder-chart">
      <div className="placeholder-chart-header">
        <span className="chart-icon" aria-hidden="true">
          <MinimalIcon name="target" size={16} />
        </span>
        <span>7-day Sleep Trend</span>
      </div>
      <div className="placeholder-chart-body">
        <div className="chart-bar" style={{ height: '60%' }} />
        <div className="chart-bar" style={{ height: '72%' }} />
        <div className="chart-bar" style={{ height: '65%' }} />
        <div className="chart-bar" style={{ height: '78%' }} />
        <div className="chart-bar" style={{ height: '70%' }} />
        <div className="chart-bar" style={{ height: '82%' }} />
        <div className="chart-bar" style={{ height: '75%' }} />
      </div>
      <div className="placeholder-chart-footer">
        <span className="chart-caption">Preview — more detail coming soon</span>
      </div>
    </div>
  );
};

const SleepProgress = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const days = 14;
  const [selectedFactors, setSelectedFactors] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);

  const loadDemoData = useMemo(() => {
    return () => {
      const today = new Date();
      const isoDate = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      // Trend: total sleep seconds per day (13–15.5h band)
      const trend = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const base = 13 * 3600;
        const variance = ((i % 5) + 1) * 15 * 60; // up to +75m
        trend.push({
          date: isoDate(d),
          totalSeconds: base + variance
        });
      }
      // Night wakings trend (0–3)
      const nightWakingsTrend = [];
      for (let i = days; i >= 1; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const wakings = i % 6 === 0 ? 0 : (i % 2 === 0 ? 1 : 2);
        nightWakingsTrend.push({
          night: isoDate(d),
          wakings
        });
      }
      // Timeline7 with segments
      const timeline7 = [];
      for (let i = 8; i >= 0; i--) {  // Show 9 days (8, 7, 6, 5, 4, 3, 2, 1, 0)
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = isoDate(d);
        const dayStart = new Date(`${dateStr}T00:00:00Z`);
        const mk = (h, m) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), h, m)).toISOString();
        const segments = [
          // night segment crosses midnight; we clip per backend but here show two within-day segments
          { start: mk(0, 30), end: mk(6, 0) },
          // naps
          { start: mk(10, (i % 2) ? 30 : 0), end: mk(11, (i % 2) ? 30 : 0) },
          { start: mk(14, 0), end: mk(15, (i % 3) ? 0 : 20) },
        ];
        timeline7.push({ date: dateStr, segments });
      }
      // Factors on some days
      const factors = trend.map((t, idx) => {
        const list = [];
        if (idx % 7 === 0) list.push('sick');
        if (idx % 9 === 0) list.push('teething');
        return { date: t.date, factors: list };
      });
      // Quality trend: calculate based on sleep hours, wakings, and occasional behavior issues
      const qualityTrend = trend.map((t, idx) => {
        const sleepHours = t.totalSeconds / 3600;
        const wakings = nightWakingsTrend[idx]?.wakings ?? 0;
        // Occasional behavior issues (grumpy, not alert, lack of engagement)
        const hasBehaviorIssue = idx % 5 === 0 || idx % 8 === 0;
        // Calculate quality (0-100)
        const sleepScore = Math.min(1.0, sleepHours / 14.0);
        const settlingScore = wakings === 0 ? 1.0 : wakings === 1 ? 0.8 : wakings === 2 ? 0.5 : 0.2;
        const behaviorPenalty = hasBehaviorIssue ? 0.2 : 0;
        const quality = Math.max(0, Math.min(100, ((0.5 * sleepScore + 0.4 * settlingScore) * (1.0 - behaviorPenalty)) * 100));
        
        // Add factors for some days (sick, teething, etc.)
        const factors = [];
        if (idx % 7 === 3) factors.push('sick');
        if (idx % 9 === 5) factors.push('teething');
        if (idx % 11 === 7) factors.push('sick', 'teething');
        
        return { date: t.date, quality: Math.round(quality), factors };
      });
      // Night summary
      const lastNightWakings = nightWakingsTrend[nightWakingsTrend.length - 1]?.wakings ?? 1;
      const summaryDemo = {
        totals: { last24h: '14h 10m' },
        night: { wakings: lastNightWakings, longestStretch: '6h 20m' },
        naps: { count: 3 },
        trend,
        nightWakingsTrend,
        timeline7,
        factors,
        qualityTrend,
        quality: { score: 78, label: 'good', signals: { grumpy: 0, fussy: 1, irritable: 0, restless: 0, overtired: 0, cranky: 0 } }
      };
      setSummary(summaryDemo);
      setLoading(false);
      setError('');
    };
  }, [days]);

  const trendHours = useMemo(() => (summary?.trend || []).map(d => (d.totalSeconds || 0) / 3600), [summary]);
  const wakingsSeries = useMemo(() => (summary?.nightWakingsTrend || []).map(d => (d.wakings || 0)), [summary]);
  const hasTrendData = useMemo(() => trendHours.some(v => v > 0), [trendHours]);
  const hasWakingData = useMemo(() => wakingsSeries.some(v => v > 0), [wakingsSeries]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await sleepProgressService.getProgressSummary();
        if (isMounted) {
          setSummary(data);
        }
      } catch (e) {
        if (isMounted) {
          setError(e?.message || 'Failed to load sleep progress');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load today's factors on mount
  useEffect(() => {
    let isMounted = true;
    const loadTodayFactors = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const factors = await sleepProgressService.getFactors(1);
        if (isMounted && factors[today]) {
          const todayFactors = factors[today].map(f => f.factor);
          setSelectedFactors(todayFactors);
        }
      } catch (e) {
        console.error('Failed to load today\'s factors:', e);
      }
    };
    loadTodayFactors();
    return () => {
      isMounted = false;
    };
  }, []);

  // Track current date to detect day changes
  const [currentDate, setCurrentDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Check if date has changed and reset factors if needed
  useEffect(() => {
    const checkDateChange = () => {
      const today = new Date().toISOString().split('T')[0];
      if (today !== currentDate) {
        setCurrentDate(today);
        setSelectedFactors([]);
        // Reload today's factors (should be empty for new day)
        sleepProgressService.getFactors(1).then(factors => {
          if (factors[today]) {
            const todayFactors = factors[today].map(f => f.factor);
            setSelectedFactors(todayFactors);
          }
        }).catch(() => {});
      }
    };

    // Check on mount
    checkDateChange();

    // Check when page becomes visible (user returns to app)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkDateChange();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Auto-reset factors at midnight
    const getNextMidnight = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      return midnight.getTime() - now.getTime();
    };

    const scheduleReset = () => {
      const msUntilMidnight = getNextMidnight();
      const timeoutId = setTimeout(() => {
        // Clear factors for the new day
        setSelectedFactors([]);
        setCurrentDate(new Date().toISOString().split('T')[0]);
        // Schedule next reset
        scheduleReset();
      }, msUntilMidnight);
      return timeoutId;
    };

    const timeoutId = scheduleReset();
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentDate]);

  return (
    <div className="sleep-progress-container" style={{ padding: '0 clamp(0.75rem, 4vw, 1.25rem) clamp(1.5rem, 5vw, 2.5rem)' }}>
      {!loading && !error && (
        <>
          {/* Sleep Factors - top */}
          <div className="factor-toggle-top" style={{ background: 'white', border: '1px solid #eee', borderRadius: '14px', padding: '0.75rem', boxShadow: '0 6px 18px rgba(127,106,164,0.08)', marginTop: '1rem', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#7f6aa4', marginBottom: '0.4rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center', width: '100%' }}>
              <MinimalIcon name="target" size={14} />
              Sleep Factors
            </div>
            <div className="factor-toggle-row" style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {['sick', 'teething', 'travel', 'regression', 'vaccines'].map((f) => {
                const active = selectedFactors.includes(f);
                return (
                  <button
                    key={f}
                    className={`chip ${active ? 'active' : ''}`}
                    onClick={async () => {
                      const next = active ? selectedFactors.filter(x => x !== f) : [...selectedFactors, f];
                      setSelectedFactors(next);
                      try {
                        const today = new Date().toISOString().split('T')[0];
                        await sleepProgressService.setFactors({ date: today, factors: next });
                        const refreshed = await sleepProgressService.getProgressSummary();
                        setSummary(refreshed);
                      } catch (e) {}
                    }}
                    style={{
                      border: '1px solid #e8ddf6',
                      background: active ? 'linear-gradient(90deg,#f3ecfb,#ede3f7)' : 'white',
                      color: '#7f6aa4',
                      padding: '0.4rem 0.7rem',
                      borderRadius: '999px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      {f === 'sick' && <MinimalIcon name="shield" size={14} />}
                      {f === 'teething' && <MinimalIcon name="baby" size={14} />}
                      {f === 'travel' && <MinimalIcon name="globe" size={14} />}
                      {f === 'regression' && <MinimalIcon name="target" size={14} />}
                      {f === 'vaccines' && <MinimalIcon name="document" size={14} />}
                      {f}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Two-column layout: rings stacked (left) and calendar timeline (right) */}
          <style>{`
            @media (max-width: 768px) {
              .layout-grid {
                grid-template-columns: 1fr !important;
              }
              .left-stack {
                gap: 0.75rem !important;
              }
              .ring-card {
                padding: 0.6rem !important;
              }
              .ring-card svg {
                width: 120px !important;
                height: 120px !important;
              }
              .quality-chart-svg,
              .timeline7 svg {
                max-width: 100% !important;
                height: auto !important;
              }
              .quality-graph,
              .timeline7 {
                padding: 0.6rem !important;
              }
              .factor-toggle-top {
                padding: 0.6rem !important;
              }
              .factor-toggle-row {
                gap: 0.4rem !important;
              }
              .factor-toggle-row button {
                font-size: 0.8rem !important;
                padding: 0.35rem 0.6rem !important;
              }
              .ring-card > div {
                font-size: 0.8rem !important;
              }
              .timeline7 .card {
                font-size: 0.85rem !important;
              }
              .timeline7 > div:first-child {
                font-size: 0.85rem !important;
                margin-bottom: 0.5rem !important;
              }
              .sleep-progress-container {
                font-size: 0.9rem !important;
              }
              /* Ensure touch targets are at least 44px */
              .factor-toggle-row button,
              button[type="button"] {
                min-height: 44px !important;
                min-width: 44px !important;
              }
              /* Adjust tooltip for mobile */
              .quality-graph [style*="position: absolute"] {
                font-size: 0.7rem !important;
                padding: 0.4rem 0.6rem !important;
                max-width: 90vw !important;
              }
            }
            @media (min-width: 769px) {
              .layout-grid {
                grid-template-columns: minmax(260px, 360px) 1fr !important;
              }
            }
            .quality-chart-svg {
              width: 100%;
              max-width: 280px;
              height: auto;
            }
          `}</style>
          <div className="layout-grid" style={{ 
            display: 'grid', 
            gap: 'clamp(0.75rem, 2vw, 1rem)', 
            alignItems: 'start', 
            marginTop: '0.5rem'
          }}>
            <div className="left-stack" style={{ display: 'grid', gridAutoRows: 'min-content', gap: '1rem' }}>
              {(() => {
              const totalHours = hasTrendData ? ((summary?.trend || []).slice(-1)[0]?.totalSeconds || 0) / 3600 : 0;
          const totalGoal = 14; // default daily target hours (can be replaced by user goals)
          return (
                <div className="ring-card" style={{ background: 'white', border: '1px solid #eee', borderRadius: '14px', padding: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', boxShadow: '0 6px 18px rgba(127,106,164,0.12)' }}>
                  <RingProgress
                    size={140}
                    value={hasTrendData ? totalHours : 0}
                    goal={totalGoal}
                    color="#7f6aa4"          // primary purple
                    track="#f2ecfa"
                    gradientEnd="#b999e8"
                    iconName="baby"          // unique icon 1
                    label={hasTrendData ? `${Math.max(0, Math.min(200, Math.round((totalHours / (totalGoal || 1)) * 100)))}%` : '—'}
                    subtitle={hasTrendData ? 'Daily Sleep' : 'No data yet'}
                  />
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    {hasTrendData ? 'Progress toward daily sleep target' : 'Start chatting to log sleep'}
                  </div>
                </div>
          );
        })()}

        {(() => {
              const wakings = hasWakingData ? (summary?.night?.wakings ?? 0) : 0;
          const goalMax = 1; // aim for <=1 waking
          const pct = Math.max(0, Math.min(1, (goalMax - Math.min(goalMax, wakings)) / Math.max(1, goalMax)));
          return (
                <div className="ring-card" style={{ background: 'white', border: '1px solid #eee', borderRadius: '14px', padding: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', boxShadow: '0 6px 18px rgba(127,106,164,0.12)' }}>
                  <RingProgress
                    size={140}
                    value={hasWakingData ? pct : 0}
                    goal={1}
                    color="#9c84c8"          // distinct purple hue
                    track="#efe7f7"
                    gradientEnd="#c7b3e6"
                    iconName="moon"          // unique icon 2
                    label={hasWakingData ? `${Math.round(pct * 100)}%` : '—'}
                    subtitle={hasWakingData ? 'Night Wakings' : 'No data yet'}
                  />
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    {hasWakingData ? 'Closer to ≤1 waking is better' : 'Collect a few nights to see this'}
                  </div>
                </div>
          );
        })()}

        {(() => {
              const napsCount = hasTrendData ? (summary?.naps?.count ?? 0) : 0;
          const napsGoal = 3; // default daily naps target
          return (
                <div className="ring-card" style={{ background: 'white', border: '1px solid #eee', borderRadius: '14px', padding: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', boxShadow: '0 6px 18px rgba(127,106,164,0.12)' }}>
                  <RingProgress
                    size={140}
                    value={hasTrendData ? napsCount : 0}
                    goal={napsGoal}
                    color="#b999e8"          // another distinct purple
                    track="#f6f0fb"
                    gradientEnd="#dac4f2"
                    iconName="star"          // unique icon 3
                    label={hasTrendData ? `${Math.max(0, Math.min(200, Math.round((napsCount / (napsGoal || 1)) * 100)))}%` : '—'}
                    subtitle={hasTrendData ? 'Naps' : 'No data yet'}
                  />
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    {hasTrendData ? 'Progress toward daily naps goal' : 'Naps appear as you log days'}
                  </div>
                </div>
          );
        })()}
            </div>
            {/* Right column: Quality line graph and 7-day daily timeline (calendar-style) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Quality of Sleep Over Time */}
            <div className="quality-graph card" style={{ background: 'white', border: '1px solid #eee', borderRadius: '14px', padding: '0.75rem', boxShadow: '0 6px 18px rgba(127,106,164,0.08)' }}>
              <div style={{ fontSize: '0.9rem', color: '#7f6aa4', marginBottom: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <MinimalIcon name="sleep" size={14} /> Sleep Quality Over Time
              </div>
              {(() => {
                const qualityData = (summary?.qualityTrend || []).slice(-14);
                const hasQualityData = qualityData.some(d => d.quality > 0);
                if (!hasQualityData) {
                  return (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#999', fontSize: '0.85rem' }}>
                      Collect data to see sleep quality trends
                    </div>
                  );
                }
                const width = 280;
                const height = 150;
                const padding = { top: 10, right: 10, bottom: 40, left: 40 };
                const chartWidth = width - padding.left - padding.right;
                const chartHeight = height - padding.top - padding.bottom;
                const values = qualityData.map(d => d.quality || 0);
                const min = Math.min(...values, 0);
                const max = Math.max(...values, 100);
                const range = Math.max(1, max - min);
                const stepX = chartWidth / Math.max(1, values.length - 1);
                const points = qualityData.map((d, i) => {
                  const v = d.quality || 0;
                  const x = padding.left + i * stepX;
                  const y = padding.top + chartHeight - ((v - min) / range) * chartHeight;
                  return { x, y, value: v, date: d.date, index: i, factors: d.factors || [] };
                });
                const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                
                const formatDate = (dateStr) => {
                  const date = new Date(dateStr);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                };
                
                return (
                  <div style={{ position: 'relative' }}>
                    <svg className="quality-chart-svg" width={width} height={height} style={{ display: 'block' }}>
                      {/* Grid lines */}
                      {[0, 25, 50, 75, 100].map(score => {
                        const y = padding.top + chartHeight - ((score - min) / range) * chartHeight;
                        return (
                          <line
                            key={score}
                            x1={padding.left}
                            y1={y}
                            x2={width - padding.right}
                            y2={y}
                            stroke="#f0f0f0"
                            strokeWidth="1"
                          />
                        );
                      })}
                      {/* Quality line */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#7f6aa4"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Data points */}
                      {points.map((p, i) => (
                        <g key={i}>
                          {/* Invisible larger circle for easier clicking */}
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="8"
                            fill="transparent"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Toggle: if clicking the same point, deselect it; otherwise select the new point
                              if (selectedPoint?.index === i) {
                                setSelectedPoint(null);
                              } else {
                                setSelectedPoint(p);
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                          {/* Visible data point */}
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={selectedPoint?.index === i ? "5" : "3"}
                            fill="#7f6aa4"
                            stroke="white"
                            strokeWidth="2"
                            style={{ transition: 'r 0.2s ease' }}
                          />
                          {/* Factor indicator - small triangle below point */}
                          {p.factors && p.factors.length > 0 && (
                            <polygon
                              points={`${p.x},${padding.top + chartHeight + 2} ${p.x - 4},${padding.top + chartHeight + 7} ${p.x + 4},${padding.top + chartHeight + 7}`}
                              fill="#ff9500"
                              stroke="white"
                              strokeWidth="1"
                            />
                          )}
                        </g>
                      ))}
                      {/* Y-axis labels */}
                      <text x={padding.left - 8} y={padding.top + chartHeight + 3} fontSize="9" fill="#666" textAnchor="end">0</text>
                      <text x={padding.left - 8} y={padding.top + chartHeight / 2 + 3} fontSize="9" fill="#666" textAnchor="end">50</text>
                      <text x={padding.left - 8} y={padding.top + 3} fontSize="9" fill="#666" textAnchor="end">100</text>
                      {/* Y-axis label */}
                      <text 
                        x={12} 
                        y={padding.top + chartHeight / 2} 
                        fontSize="10" 
                        fill="#666" 
                        textAnchor="middle"
                        transform={`rotate(-90, 12, ${padding.top + chartHeight / 2})`}
                        style={{ fontWeight: 500 }}
                      >
                        Quality Score
                      </text>
                      {/* X-axis label */}
                      <text 
                        x={width / 2} 
                        y={height - 8} 
                        fontSize="10" 
                        fill="#666" 
                        textAnchor="middle"
                        style={{ fontWeight: 500 }}
                      >
                        Days
                      </text>
                    </svg>
                    {/* Tooltip */}
                    {selectedPoint && (
                      <div
                        style={{
                          position: 'absolute',
                          left: `${selectedPoint.x}px`,
                          top: `${selectedPoint.y - 50}px`,
                          transform: 'translateX(-50%)',
                          background: '#7f6aa4',
                          color: 'white',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          pointerEvents: 'none',
                          zIndex: 1000,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                          {formatDate(selectedPoint.date)}
                        </div>
                        <div style={{ opacity: 0.9 }}>
                          Quality: {selectedPoint.value}/100
                        </div>
                        {selectedPoint.factors && selectedPoint.factors.length > 0 && (
                          <div style={{ marginTop: '0.25rem', paddingTop: '0.25rem', borderTop: '1px solid rgba(255,255,255,0.3)', fontSize: '0.7rem', opacity: 0.95 }}>
                            Factors: {selectedPoint.factors.join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            {/* 9-day daily timeline (calendar-style) */}
            <div className="timeline7 card" style={{ background: 'white', border: '1px solid #eee', borderRadius: '14px', padding: '0.75rem', boxShadow: '0 6px 18px rgba(127,106,164,0.08)' }}>
              <div style={{ fontSize: '0.9rem', color: '#7f6aa4', marginBottom: '0.35rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <MinimalIcon name="calendar" size={14} /> Last 9 days (24h)
              </div>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {(summary?.timeline7 || []).slice(-9).map((day, idx) => {
                  const segments = Array.isArray(day.segments) ? day.segments : [];
                  const dayStart = new Date(`${day.date}T00:00:00Z`).getTime();
                  const dayMs = 24 * 60 * 60 * 1000;
                  return (
                    <div key={`${day.date}-${idx}`}>
                      <div style={{ fontSize: '0.8rem', color: '#7f6aa4', marginBottom: '0.3rem' }}>
                        {new Date(day.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                      <div style={{ position: 'relative', height: '14px', background: '#f6f0fb', borderRadius: '10px', overflow: 'hidden' }}>
                        {segments.map((seg, sIdx) => {
                          const s = new Date(seg.start).getTime();
                          const e = new Date(seg.end).getTime();
                          const leftPct = Math.max(0, Math.min(100, ((s - dayStart) / dayMs) * 100));
                          const widthPct = Math.max(0.8, Math.min(100, ((e - s) / dayMs) * 100));
                          return (
                            <div
                              key={sIdx}
                              style={{
                                position: 'absolute',
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                                top: 0,
                                bottom: 0,
                                background: 'linear-gradient(90deg,#7f6aa4,#b999e8)'
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </div>
          </div>

          
        </>
      )}
    </div>
  );
};

export default SleepProgress;


