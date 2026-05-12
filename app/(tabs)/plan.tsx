import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { usePlan } from '../../src/PlanContext';
import { RideWaitTime, getHistoricalWaitTimes, HourlyAverage } from '../../src/api';
import { Ionicons } from '@expo/vector-icons';

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
          <Ionicons name={expanded ? "chevron-up" : "analytics"} size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => removeRide(item.id)}>
          <Ionicons name="trash-outline" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>
      
      {expanded && (
        <View style={styles.expandedContent}>
          {loading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : history.length > 0 ? (
            <>
              <View style={styles.bestTimeBanner}>
                <Ionicons name="star" size={20} color="#FFD60A" />
                <Text style={styles.bestTimeText}>
                  Best Time: {bestTime?.hour === 12 ? '12 PM' : bestTime?.hour && bestTime.hour > 12 ? `${bestTime.hour - 12} PM` : `${bestTime?.hour} AM`} ({bestTime?.averageWait} min)
                </Text>
              </View>
              <Text style={styles.chartTitle}>Average Wait by Hour</Text>
              <View style={styles.chartContainer}>
                {history.map((point) => {
                  const maxWait = Math.max(...history.map(h => h.averageWait));
                  const heightPercent = maxWait > 0 ? (point.averageWait / maxWait) * 100 : 0;
                  
                  return (
                    <View key={point.hour} style={styles.barWrapper}>
                      <View style={styles.barBackground}>
                        <View style={[styles.barFill, { height: `${heightPercent}%`, backgroundColor: point.hour === bestTime?.hour ? '#FFD60A' : '#007AFF' }]} />
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
        <Ionicons name="clipboard-outline" size={64} color="#C7C7CC" />
        <Text style={styles.emptyText}>Your plan is empty.</Text>
        <Text style={styles.emptySubtext}>Go to the Wait Times tab to add rides to your priority list!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
    backgroundColor: '#F2F2F7',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#AEAEB2',
    textAlign: 'center',
    marginTop: 8,
  },
  listContent: {
    padding: 16,
  },
  rideCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: 'hidden',
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
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#FFF',
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
    color: '#1C1C1E',
    marginBottom: 4,
  },
  waitTime: {
    fontSize: 14,
    color: '#8E8E93',
  },
  actionButton: {
    padding: 8,
  },
  expandedContent: {
    padding: 16,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  bestTimeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBE6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
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
    color: '#8E8E93',
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
    backgroundColor: '#E5E5EA',
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
    color: '#8E8E93',
    marginTop: 4,
  },
  noDataText: {
    textAlign: 'center',
    color: '#8E8E93',
    fontStyle: 'italic',
  }
});