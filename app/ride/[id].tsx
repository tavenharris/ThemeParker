import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Path, Circle } from 'react-native-svg';
import { getHistoricalWaitTimes, HourlyAverage } from '../../src/api';

const Colors = {
  primary: '#021541',
  secondaryContainer: '#fed65b',
  secondaryFixed: '#ffe088',
  secondaryFixedDim: '#e9c349',
  surface: '#f9f9f9',
  surfaceContainer: '#eeeeee',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f3f3f3',
  surfaceContainerHigh: '#e8e8e8',
  surfaceBright: '#f9f9f9',
  surfaceDim: '#dadada',
  onSurface: '#1a1c1c',
  onSurfaceVariant: '#45464f',
  outline: '#757680',
  outlineVariant: '#c5c6d0',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  onPrimary: '#ffffff',
  primaryContainer: '#1a2b56',
  onPrimaryContainer: '#8393c5',
  secondary: '#735c00',
  tertiaryFixedDim: '#7dd1fa',
  primaryFixedDim: '#b5c5f9',
  onSecondaryContainer: '#745c00',
};

const screenWidth = Dimensions.get('window').width;

export default function RideDetailsScreen() {
  const { id, name, waitTime, status } = useLocalSearchParams<{ id: string, name: string, waitTime: string, status: string }>();
  const router = useRouter();
  const [history, setHistory] = useState<HourlyAverage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadHistory();
    }
  }, [id]);

  const loadHistory = async () => {
    setLoading(true);
    const data = await getHistoricalWaitTimes(id);
    setHistory(data);
    setLoading(false);
  };

  const avgWait = history.length > 0 
    ? Math.round(history.reduce((acc, curr) => acc + curr.averageWait, 0) / history.length)
    : '--';

  const bestTime = history.length > 0 
    ? [...history].sort((a, b) => a.averageWait - b.averageWait)[0]
    : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{name || 'Ride Details'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Stats Card */}
        <View style={styles.heroStatsContainer}>
          <View style={[styles.statCard, { borderLeftColor: Colors.primary }]}>
            <Text style={styles.statLabel}>CURRENT WAIT</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValueMain}>{status === 'OPERATING' ? waitTime : '--'}</Text>
              <Text style={styles.statValueSub}>MIN</Text>
            </View>
            <View style={styles.statFooterRow}>
              <Ionicons name="trending-up" size={16} color={Colors.secondary} />
              <Text style={styles.statFooterText}>Live updates</Text>
            </View>
          </View>

          <View style={[styles.statCard, { borderLeftColor: Colors.tertiaryFixedDim }]}>
            <Text style={styles.statLabel}>30-DAY AVG</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValueMain}>{avgWait}</Text>
              <Text style={styles.statValueSub}>MIN</Text>
            </View>
            <View style={styles.statFooterRow}>
              <Ionicons name="calendar" size={16} color={Colors.onSurfaceVariant} />
              <Text style={[styles.statFooterText, { color: Colors.onSurfaceVariant }]}>Based on past data</Text>
            </View>
          </View>

          <LinearGradient
            colors={[Colors.primary, '#1a2b56']}
            style={[styles.statCard, styles.magicalGlow, { borderLeftWidth: 0, paddingVertical: 18 }]}
          >
            <Text style={[styles.statLabel, { color: Colors.secondaryFixed }]}>PREDICTED BEST</Text>
            <View style={styles.statValueRow}>
              <Text style={[styles.statValueMain, { color: Colors.onPrimary }]}>
                {bestTime ? `${bestTime.hour > 12 ? bestTime.hour - 12 : bestTime.hour}:00 ${bestTime.hour >= 12 ? 'PM' : 'AM'}` : '--:--'}
              </Text>
            </View>
            <View style={styles.statFooterRow}>
              <Ionicons name="flash" size={16} color={Colors.secondaryFixed} />
              <Text style={[styles.statFooterText, { color: Colors.secondaryFixed }]}>LL Multi Pass Recommended</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Main Analytics Section */}
        <View style={styles.analyticsSection}>
          <View style={styles.analyticsHeader}>
            <View>
              <Text style={styles.analyticsTitle}>Wait Time Trends</Text>
              <Text style={styles.analyticsSubtitle}>30-day historical analysis</Text>
            </View>
            <View style={styles.timeFilter}>
              <View style={styles.filterButtonActive}>
                <Text style={styles.filterTextActive}>All Day</Text>
              </View>
            </View>
          </View>

          {/* Custom SVG Chart Area */}
          <View style={styles.chartContainer}>
            {loading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
            ) : history.length > 0 ? (
              <Svg width="100%" height="100%" viewBox="0 0 1200 256" preserveAspectRatio="none">
                <Defs>
                  <SvgLinearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={Colors.tertiaryFixedDim} stopOpacity="0.4" />
                    <Stop offset="1" stopColor={Colors.tertiaryFixedDim} stopOpacity="0" />
                  </SvgLinearGradient>
                </Defs>
                <Path
                  d={(() => {
                    const maxWait = Math.max(...history.map(h => h.averageWait), 1);
                    const minHour = Math.min(...history.map(h => h.hour));
                    const maxHour = Math.max(...history.map(h => h.hour));
                    const hourRange = Math.max(maxHour - minHour, 1);
                    let d = '';
                    history.forEach((h, i) => {
                      const x = ((h.hour - minHour) / hourRange) * 1200;
                      const y = 200 - (h.averageWait / maxWait) * 160;
                      if (i === 0) d += `M${x},${y}`;
                      else d += ` L${x},${y}`;
                    });
                    const lastX = ((history[history.length - 1].hour - minHour) / hourRange) * 1200;
                    const firstX = ((history[0].hour - minHour) / hourRange) * 1200;
                    d += ` L${lastX},256 L${firstX},256 Z`;
                    return d;
                  })()}
                  fill="url(#chartFill)"
                />
                <Path
                  d={(() => {
                    const maxWait = Math.max(...history.map(h => h.averageWait), 1);
                    const minHour = Math.min(...history.map(h => h.hour));
                    const maxHour = Math.max(...history.map(h => h.hour));
                    const hourRange = Math.max(maxHour - minHour, 1);
                    let d = '';
                    history.forEach((h, i) => {
                      const x = ((h.hour - minHour) / hourRange) * 1200;
                      const y = 200 - (h.averageWait / maxWait) * 160;
                      if (i === 0) d += `M${x},${y}`;
                      else d += ` L${x},${y}`;
                    });
                    return d;
                  })()}
                  fill="none"
                  stroke={Colors.primary}
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                {/* Points */}
                {history.map((h, i) => {
                  const maxWait = Math.max(...history.map(h => h.averageWait), 1);
                  const minHour = Math.min(...history.map(h => h.hour));
                  const maxHour = Math.max(...history.map(h => h.hour));
                  const hourRange = Math.max(maxHour - minHour, 1);
                  const x = ((h.hour - minHour) / hourRange) * 1200;
                  const y = 200 - (h.averageWait / maxWait) * 160;
                  const isBest = bestTime && h.hour === bestTime.hour;
                  return (
                    <Circle
                      key={h.hour}
                      cx={x}
                      cy={y}
                      r={isBest ? "16" : "8"}
                      fill={isBest ? Colors.secondary : Colors.primary}
                      stroke={isBest ? "#ffffff" : "none"}
                      strokeWidth={isBest ? "4" : "0"}
                    />
                  );
                })}
              </Svg>
            ) : (
              <Text style={{ textAlign: 'center', marginTop: 80, color: Colors.outline }}>No trend data available.</Text>
            )}

            {/* Grid Lines Overlay */}
            <View style={styles.gridLinesContainer} pointerEvents="none">
              <View style={styles.gridLine} />
              <View style={styles.gridLine} />
              <View style={styles.gridLine} />
              <View style={styles.gridLine} />
            </View>

            {/* Floating Bubble */}
            {!loading && history.length > 0 && bestTime && (
              <View style={[styles.floatingBubble, {
                left: (() => {
                  const minHour = Math.min(...history.map(h => h.hour));
                  const maxHour = Math.max(...history.map(h => h.hour));
                  const hourRange = Math.max(maxHour - minHour, 1);
                  const xPercent = ((bestTime.hour - minHour) / hourRange) * 100;
                  // Keep bubble within bounds
                  return `${Math.min(Math.max(xPercent, 10), 90)}%`;
                })(),
                top: -10, // Move above chart line
                transform: [{ translateX: -40 }] // Center the bubble based on approximate width
              }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="star" size={16} color={Colors.secondary} />
                  <Text style={styles.bubbleText}>{bestTime?.averageWait}m</Text>
                </View>
                <Text style={styles.bubbleLabel}>OPTIMAL WINDOW</Text>
              </View>
            )}
          </View>
          <View style={styles.chartXAxis}>
            {history.length > 0 ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                <Text style={styles.xAxisLabel}>
                  {(() => {
                    const minH = Math.min(...history.map(h => h.hour));
                    return `${minH > 12 ? minH - 12 : minH}${minH >= 12 ? 'pm' : 'am'}`;
                  })()}
                </Text>
                <Text style={styles.xAxisLabel}>
                  {(() => {
                    const maxH = Math.max(...history.map(h => h.hour));
                    return `${maxH > 12 ? maxH - 12 : maxH}${maxH >= 12 ? 'pm' : 'am'}`;
                  })()}
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.xAxisLabel}>Morning</Text>
                <Text style={styles.xAxisLabel}>Noon</Text>
                <Text style={styles.xAxisLabel}>Evening</Text>
                <Text style={styles.xAxisLabel}>Night</Text>
              </>
            )}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: Colors.surfaceBright,
    shadowColor: '#021541',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    zIndex: 50,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'Georgia',
    flexShrink: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heroStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    minWidth: '45%',
    flex: 1,
  },
  magicalGlow: {
    shadowColor: '#e9c349',
    shadowOpacity: 0.4,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 0 },
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValueMain: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'Georgia',
  },
  statValueSub: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  statFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  statFooterText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondary,
  },
  analyticsSection: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  analyticsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'Georgia',
  },
  analyticsSubtitle: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  timeFilter: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 20,
    padding: 4,
  },
  filterButtonActive: {
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterTextActive: {
    color: Colors.onSecondaryContainer,
    fontSize: 12,
    fontWeight: '600',
  },
  chartContainer: {
    height: 180,
    width: '100%',
    position: 'relative',
    marginBottom: 16,
  },
  gridLinesContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    opacity: 0.3,
  },
  chartXAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xAxisLabel: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  floatingBubble: {
    position: 'absolute',
    top: 20,
    right: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  bubbleText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  bubbleLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  bentoGrid: {
    flexDirection: 'column',
    gap: 16,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  bentoItem: {
    borderRadius: 12,
    padding: 16,
  },
  bentoFull: {
    width: '100%',
  },
  bentoHalf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  }
});