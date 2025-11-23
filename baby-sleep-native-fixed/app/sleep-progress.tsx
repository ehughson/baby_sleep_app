/**
 * Sleep Progress Page - Track sleep metrics and trends with graphs
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect, Text as SvgText, Defs, LinearGradient, Stop, Line, Polygon } from 'react-native-svg';
import { router } from 'expo-router';
import { sleepProgressService } from '../src/services/sleepProgressService';
import { AppHeader } from '../src/components/AppHeader';
import MinimalIcon from '../src/components/icons/MinimalIcon';

export const options = {
  headerShown: false,
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RingProgressProps {
  size?: number;
  value?: number;
  goal?: number;
  color?: string;
  track?: string;
  label?: string;
  subtitle?: string;
  gradientEnd?: string;
  iconName?: string;
}

const RingProgress: React.FC<RingProgressProps> = ({
  size = 140,
  value = 0,
  goal = 1,
  color = '#7f6aa4',
  track = '#eee',
  label,
  subtitle,
  gradientEnd,
  iconName,
}) => {
  const pct = Math.max(0, Math.min(1, goal > 0 ? value / goal : 0));
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * pct;
  const gap = circumference - dash;
  // Use a unique ID based on component instance
  const gradId = `grad-${color.replace('#', '')}-${(gradientEnd || color).replace('#', '')}-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={color} />
            <Stop offset="100%" stopColor={gradientEnd || color} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={track}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
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
        <SvgText
          x={center}
          y={center - 8}
          fontSize="18"
          fontWeight="800"
          fill="#333"
          textAnchor="middle"
        >
          {label || '—'}
        </SvgText>
        <SvgText
          x={center}
          y={center + 8}
          fontSize="14"
          fontWeight="600"
          fill="#666"
          textAnchor="middle"
        >
          {subtitle || ''}
        </SvgText>
      </Svg>
      {iconName && (
        <View style={{ marginTop: 4, opacity: 0.85 }}>
          <MinimalIcon name={iconName} size={16} color="#7f6aa4" />
        </View>
      )}
    </View>
  );
};

interface QualityChartProps {
  data: Array<{ date: string; quality: number; factors?: string[] }>;
  selectedPoint: { index: number; date: string; value: number; factors?: string[] } | null;
  onPointSelect: (point: { index: number; date: string; value: number; factors?: string[] } | null) => void;
}

const QualityChart: React.FC<QualityChartProps> = ({ data, selectedPoint, onPointSelect }) => {
  const chartWidth = Math.min(280, SCREEN_WIDTH - 80);
  const chartHeight = 150;
  const padding = { top: 10, right: 10, bottom: 40, left: 40 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const values = data.map(d => d.quality || 0);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 100);
  const range = Math.max(1, max - min);
  const stepX = innerWidth / Math.max(1, values.length - 1);

  const points = data.map((d, i) => {
    const v = d.quality || 0;
    const x = padding.left + i * stepX;
    const y = padding.top + innerHeight - ((v - min) / range) * innerHeight;
    return { x, y, value: v, date: d.date, index: i, factors: d.factors || [] };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={{ position: 'relative' }}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(score => {
          const y = padding.top + innerHeight - ((score - min) / range) * innerHeight;
          return (
            <Line
              key={score}
              x1={padding.left}
              y1={y}
              x2={chartWidth - padding.right}
              y2={y}
              stroke="#f0f0f0"
              strokeWidth="1"
            />
          );
        })}
        {/* Quality line */}
        <Path
          d={pathD}
          fill="none"
          stroke="#7f6aa4"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Data points */}
        {points.map((p, i) => (
          <React.Fragment key={i}>
            {/* Invisible larger circle for easier tapping */}
            <Circle
              cx={p.x}
              cy={p.y}
              r="8"
              fill="transparent"
              onPress={() => {
                if (selectedPoint?.index === i) {
                  onPointSelect(null);
                } else {
                  onPointSelect(p);
                }
              }}
            />
            {/* Visible data point */}
            <Circle
              cx={p.x}
              cy={p.y}
              r={selectedPoint?.index === i ? 5 : 3}
              fill="#7f6aa4"
              stroke="white"
              strokeWidth="2"
            />
            {/* Factor indicator */}
            {p.factors && p.factors.length > 0 && (
              <Polygon
                points={`${p.x},${padding.top + innerHeight + 2} ${p.x - 4},${padding.top + innerHeight + 7} ${p.x + 4},${padding.top + innerHeight + 7}`}
                fill="#ff9500"
                stroke="white"
                strokeWidth="1"
              />
            )}
          </React.Fragment>
        ))}
        {/* Y-axis labels */}
        <SvgText x={padding.left - 8} y={padding.top + innerHeight + 3} fontSize="9" fill="#666" textAnchor="end">0</SvgText>
        <SvgText x={padding.left - 8} y={padding.top + innerHeight / 2 + 3} fontSize="9" fill="#666" textAnchor="end">50</SvgText>
        <SvgText x={padding.left - 8} y={padding.top + 3} fontSize="9" fill="#666" textAnchor="end">100</SvgText>
      </Svg>
      {/* Tooltip */}
      {selectedPoint && (
        <View
          style={{
            position: 'absolute',
            left: selectedPoint.x - 50,
            top: selectedPoint.y - 60,
            backgroundColor: '#7f6aa4',
            padding: 8,
            borderRadius: 8,
            minWidth: 100,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 12, marginBottom: 4 }}>
            {formatDate(selectedPoint.date)}
          </Text>
          <Text style={{ color: 'white', opacity: 0.9, fontSize: 11 }}>
            Quality: {selectedPoint.value}/100
          </Text>
          {selectedPoint.factors && selectedPoint.factors.length > 0 && (
            <Text style={{ color: 'white', fontSize: 10, marginTop: 4, opacity: 0.95 }}>
              Factors: {selectedPoint.factors.join(', ')}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

export default function SleepProgressScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<{ index: number; date: string; value: number; factors?: string[] } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadTodayFactors();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await sleepProgressService.getProgressSummary();
      setSummary(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load sleep progress');
    } finally {
      setLoading(false);
    }
  };

  const loadTodayFactors = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const factors = await sleepProgressService.getFactors(1);
      if (factors[today]) {
        const todayFactors = factors[today].map((f: any) => f.factor);
        setSelectedFactors(todayFactors);
      }
    } catch (e) {
      console.error('Failed to load today\'s factors:', e);
    }
  };

  const handleFactorToggle = async (factor: string) => {
    const next = selectedFactors.includes(factor)
      ? selectedFactors.filter(x => x !== factor)
      : [...selectedFactors, factor];
    setSelectedFactors(next);
    try {
      const today = new Date().toISOString().split('T')[0];
      await sleepProgressService.setFactors({ date: today, factors: next });
      const refreshed = await sleepProgressService.getProgressSummary();
      setSummary(refreshed);
    } catch (e) {
      console.error('Failed to update factors:', e);
    }
  };

  const trendHours = useMemo(() => (summary?.trend || []).map((d: any) => (d.totalSeconds || 0) / 3600), [summary]);
  const wakingsSeries = useMemo(() => (summary?.nightWakingsTrend || []).map((d: any) => (d.wakings || 0)), [summary]);
  const hasTrendData = useMemo(() => trendHours.some((v: number) => v > 0), [trendHours]);
  const hasWakingData = useMemo(() => wakingsSeries.some((v: number) => v > 0), [wakingsSeries]);

  const totalHours = hasTrendData ? ((summary?.trend || []).slice(-1)[0]?.totalSeconds || 0) / 3600 : 0;
  const totalGoal = 14;
  const wakings = hasWakingData ? (summary?.night?.wakings ?? 0) : 0;
  const goalMax = 1;
  const wakingsPct = Math.max(0, Math.min(1, (goalMax - Math.min(goalMax, wakings)) / Math.max(1, goalMax)));
  const napsCount = hasTrendData ? (summary?.naps?.count ?? 0) : 0;
  const napsGoal = 3;

  const qualityData = (summary?.qualityTrend || []).slice(-14);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader subtitle="Sleep Progress" showMenu={false} showBackButton={true} onBack={() => router.back()} />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3a1f35" />
          <Text style={styles.loadingText}>Loading sleep progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader subtitle="Sleep Progress" showMenu={false} showBackButton={true} onBack={() => router.back()} />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader subtitle="Sleep Progress" showMenu={false} showBackButton={true} onBack={() => router.back()} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Sleep Factors */}
        <View style={styles.factorSection}>
          <View style={styles.factorHeader}>
            <MinimalIcon name="target" size={14} color="#7f6aa4" />
            <Text style={styles.factorHeaderText}>Sleep Factors</Text>
          </View>
          <View style={styles.factorRow}>
            {['sick', 'teething', 'travel', 'regression', 'vaccines'].map((f) => {
              const active = selectedFactors.includes(f);
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.factorChip, active && styles.factorChipActive]}
                  onPress={() => handleFactorToggle(f)}
                >
                  <View style={styles.factorChipContent}>
                    {f === 'sick' && <MinimalIcon name="shield" size={14} color="#7f6aa4" />}
                    {f === 'teething' && <MinimalIcon name="baby" size={14} color="#7f6aa4" />}
                    {f === 'travel' && <MinimalIcon name="globe" size={14} color="#7f6aa4" />}
                    {f === 'regression' && <MinimalIcon name="target" size={14} color="#7f6aa4" />}
                    {f === 'vaccines' && <MinimalIcon name="document" size={14} color="#7f6aa4" />}
                    <Text style={styles.factorChipText}>{f}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Two-column layout on larger screens, stacked on mobile */}
        <View style={styles.layoutGrid}>
          {/* Left column: Ring progress indicators */}
          <View style={styles.leftStack}>
            {/* Daily Sleep Ring */}
            <View style={styles.ringCard}>
              <RingProgress
                size={140}
                value={hasTrendData ? totalHours : 0}
                goal={totalGoal}
                color="#7f6aa4"
                track="#f2ecfa"
                gradientEnd="#b999e8"
                iconName="baby"
                label={hasTrendData ? `${Math.max(0, Math.min(200, Math.round((totalHours / (totalGoal || 1)) * 100)))}%` : '—'}
                subtitle={hasTrendData ? 'Daily Sleep' : 'No data yet'}
              />
              <Text style={styles.ringDescription}>
                {hasTrendData ? 'Progress toward daily sleep target' : 'Start chatting to log sleep'}
              </Text>
            </View>

            {/* Night Wakings Ring */}
            <View style={styles.ringCard}>
              <RingProgress
                size={140}
                value={hasWakingData ? wakingsPct : 0}
                goal={1}
                color="#9c84c8"
                track="#efe7f7"
                gradientEnd="#c7b3e6"
                iconName="moon"
                label={hasWakingData ? `${Math.round(wakingsPct * 100)}%` : '—'}
                subtitle={hasWakingData ? 'Night Wakings' : 'No data yet'}
              />
              <Text style={styles.ringDescription}>
                {hasWakingData ? 'Closer to ≤1 waking is better' : 'Collect a few nights to see this'}
              </Text>
            </View>

            {/* Naps Ring */}
            <View style={styles.ringCard}>
              <RingProgress
                size={140}
                value={hasTrendData ? napsCount : 0}
                goal={napsGoal}
                color="#b999e8"
                track="#f6f0fb"
                gradientEnd="#dac4f2"
                iconName="star"
                label={hasTrendData ? `${Math.max(0, Math.min(200, Math.round((napsCount / (napsGoal || 1)) * 100)))}%` : '—'}
                subtitle={hasTrendData ? 'Naps' : 'No data yet'}
              />
              <Text style={styles.ringDescription}>
                {hasTrendData ? 'Progress toward daily naps goal' : 'Naps appear as you log days'}
              </Text>
            </View>
          </View>

          {/* Right column: Quality chart and timeline */}
          <View style={styles.rightColumn}>
            {/* Quality of Sleep Over Time */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <MinimalIcon name="sleep" size={14} color="#7f6aa4" />
                <Text style={styles.chartTitle}>Sleep Quality Over Time</Text>
              </View>
              {qualityData.some((d: any) => d.quality > 0) ? (
                <QualityChart
                  data={qualityData}
                  selectedPoint={selectedPoint}
                  onPointSelect={setSelectedPoint}
                />
              ) : (
                <View style={styles.emptyChart}>
                  <Text style={styles.emptyChartText}>Collect data to see sleep quality trends</Text>
                </View>
              )}
            </View>

            {/* 9-day Timeline */}
            <View style={styles.timelineCard}>
              <View style={styles.chartHeader}>
                <MinimalIcon name="calendar" size={14} color="#7f6aa4" />
                <Text style={styles.chartTitle}>Last 9 days (24h)</Text>
              </View>
              <View style={styles.timelineContainer}>
                {(summary?.timeline7 || []).slice(-9).map((day: any, idx: number) => {
                  const segments = Array.isArray(day.segments) ? day.segments : [];
                  const dayStart = new Date(`${day.date}T00:00:00Z`).getTime();
                  const dayMs = 24 * 60 * 60 * 1000;
                  return (
                    <View key={`${day.date}-${idx}`} style={styles.timelineDay}>
                      <Text style={styles.timelineDate}>
                        {new Date(day.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </Text>
                      <View style={styles.timelineBar}>
                        {segments.map((seg: any, sIdx: number) => {
                          const s = new Date(seg.start).getTime();
                          const e = new Date(seg.end).getTime();
                          const leftPct = Math.max(0, Math.min(100, ((s - dayStart) / dayMs) * 100));
                          const widthPct = Math.max(0.8, Math.min(100, ((e - s) / dayMs) * 100));
                          return (
                            <View
                              key={sIdx}
                              style={[
                                styles.timelineSegment,
                                {
                                  left: `${leftPct}%`,
                                  width: `${widthPct}%`,
                                },
                              ]}
                            />
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#c33',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  factorSection: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  factorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    justifyContent: 'center',
  },
  factorHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7f6aa4',
  },
  factorRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  factorChip: {
    borderWidth: 1,
    borderColor: '#e8ddf6',
    backgroundColor: 'white',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    minHeight: 44,
    justifyContent: 'center',
  },
  factorChipActive: {
    backgroundColor: '#f3ecfb',
  },
  factorChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  factorChipText: {
    fontSize: 13,
    color: '#7f6aa4',
  },
  layoutGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  leftStack: {
    gap: 12,
    minWidth: 200,
    flex: 1,
  },
  rightColumn: {
    flex: 1,
    minWidth: 280,
    gap: 12,
  },
  ringCard: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  ringDescription: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 14,
    color: '#7f6aa4',
    fontWeight: '600',
  },
  emptyChart: {
    padding: 40,
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  timelineCard: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  timelineContainer: {
    gap: 8,
  },
  timelineDay: {
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: '#7f6aa4',
    marginBottom: 4,
  },
  timelineBar: {
    position: 'relative',
    height: 14,
    backgroundColor: '#f6f0fb',
    borderRadius: 10,
    overflow: 'hidden',
  },
  timelineSegment: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#7f6aa4',
  },
});

