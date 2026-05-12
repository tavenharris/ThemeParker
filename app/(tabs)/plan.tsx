import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { usePlan } from '../../src/PlanContext';
import { RideWaitTime, getHistoricalWaitTimes, HourlyAverage } from '../../src/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const Colors = {
  primary: '#021541',
  secondaryContainer: '#fed65b',
  secondaryFixed: '#ffe088',
  secondaryFixedDim: '#e9c349',
  surface: '#f9f9f9',
  surfaceContainer: '#eeeeee',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerHigh: '#e8e8e8',
  onSurface: '#1a1c1c',
  onSurfaceVariant: '#45464f',
  outline: '#757680',
  outlineVariant: '#c5c6d0',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  onPrimary: '#ffffff',
  primaryContainer: '#1a2b56',
  onPrimaryContainer: '#8393c5',
};

const PlannedRideCard = ({ item, index, removeRide }: { item: RideWaitTime, index: number, removeRide: (id: string) => void }) => {
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<HourlyAverage[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleExpand = async () => {
    if (!expanded && history.length === 0) {
      setLoading(true);
      const data = await getHistoricalWaitTimes(item.id);
      setHistory(data);
      setLoading(false);
    }
    setExpanded(!expanded);
  };

  const waitTimeText = item.status === 'OPERATING' && item.queue?.STANDBY?.waitTime !== undefined
    ? `${item.queue.STANDBY.waitTime} min`
    : item.status;

  const bestTime = history.length > 0 
    ? [...history].sort((a, b) => a.averageWait - b.averageWait)[0]
    : null;

  return (
    <View style={styles.rideCard}>
      <View style={styles.rideCardHeader}>
        <View style={styles.rankContainer}>
          <Text style={styles.rankText}>{index + 1}</Text>
        </View>
        <View style={styles.rideInfo}>
          <Text style={styles.rideName}>{item.name}</Text>
          <Text style={styles.waitTime}>Current Wait: {waitTimeText}</Text>
        </View>
        <TouchableOpacity style={styles.actionButton} onPress={toggleExpand}>
          <Ionicons name={expanded ? "chevron-up" : "analytics"} size={24} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => removeRide(item.id)}>
          <Ionicons name="trash-outline" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>
      
      {expanded && (
        <View style={styles.expandedContent}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : history.length > 0 ? (
            <>
              <LinearGradient
                colors={['#fffbe6', '#fff1b8']}
                style={styles.bestTimeBanner}
              >
                <Ionicons name="star" size={20} color="#D48806" />
                <Text style={styles.bestTimeText}>
                  Best Time: {bestTime?.hour === 12 ? '12 PM' : bestTime?.hour && bestTime.hour > 12 ? `${bestTime.hour - 12} PM` : `${bestTime?.hour} AM`} ({bestTime?.averageWait} min)
                </Text>
              </LinearGradient>
              <Text style={styles.chartTitle}>Average Wait by Hour</Text>
              <View style={styles.chartContainer}>
                {history.map((point) => {
                  const maxWait = Math.max(...history.map(h => h.averageWait));
                  const heightPercent = maxWait > 0 ? (point.averageWait / maxWait) * 100 : 0;
                  
                  return (
                    <View key={point.hour} style={styles.barWrapper}>
                      <View style={styles.barBackground}>
                        <View style={[styles.barFill, { height: `${heightPercent}%`, backgroundColor: point.hour === bestTime?.hour ? Colors.secondaryContainer : Colors.onPrimaryContainer }]} />
                      </View>
                      <Text style={styles.barLabel}>{point.hour > 12 ? point.hour - 12 : point.hour}{point.hour >= 12 ? 'p' : 'a'}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <Text style={styles.noDataText}>No historical data available yet.</Text>
          )}
        </View>
      )}
    </View>
  );
};

export default function PlanScreen() {
  const { plannedRides, removeRide } = usePlan();

  if (plannedRides.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="clipboard-outline" size={64} color={Colors.outlineVariant} />
        <Text style={styles.emptyText}>Your plan is empty.</Text>
        <Text style={styles.emptySubtext}>Go to the Wait Times tab to add rides to your priority list!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <Ionicons name="sparkles" size={24} color={Colors.secondaryContainer} />
        <Text style={styles.headerTitle}>Your Perfect Day</Text>
      </View>
      
      <FlatList
        data={plannedRides}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <PlannedRideCard item={item} index={index} removeRide={removeRide} />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  headerArea: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'Georgia',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.onSurfaceVariant,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: Colors.outline,
    textAlign: 'center',
    marginTop: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100, // accommodate bottom tab
  },
  rideCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.1)', // subtle gold border
  },
  rideCardHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rankContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: Colors.onPrimary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  rideInfo: {
    flex: 1,
    paddingRight: 10,
  },
  rideName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.onSurface,
    marginBottom: 4,
  },
  waitTime: {
    fontSize: 14,
    color: Colors.outline,
  },
  actionButton: {
    padding: 8,
  },
  expandedContent: {
    padding: 16,
    backgroundColor: Colors.surfaceContainer,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
  },
  bestTimeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  bestTimeText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#D48806',
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    marginBottom: 12,
    textAlign: 'center',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    paddingTop: 10,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  barBackground: {
    width: 12,
    height: 90,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 10,
    color: Colors.outline,
    marginTop: 4,
  },
  noDataText: {
    textAlign: 'center',
    color: Colors.outline,
    fontStyle: 'italic',
  }
});
