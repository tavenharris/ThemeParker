import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Animated } from 'react-native';
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

const TimelineItem = ({ item, index, isLast, removeRide }: { item: any, index: number, isLast: boolean, removeRide: (id: string) => void }) => {
  const waitTime = item.expectedWait !== undefined ? item.expectedWait : (item.queue?.STANDBY?.waitTime || 0);
  
  const hour = item.scheduledHour !== undefined ? item.scheduledHour : 9 + index;
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const ampm = h >= 12 && h < 24 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m < 10 ? `0${m}` : m;
  const timeString = `${displayH}:${displayM} ${ampm}`;
  
  // Decide colors based on wait time severity
  const isHighWait = waitTime > 50;
  const badgeBg = isHighWait ? Colors.errorContainer : Colors.primaryContainer;
  const badgeText = isHighWait ? Colors.onErrorContainer : Colors.onPrimaryContainer;
  const badgeLabel = isHighWait ? `Peak: ${waitTime}m Wait` : `${waitTime}m Wait`;

  return (
    <View style={styles.timelineWrapper}>
      {/* Continuous Line (hidden on last item) */}
      {!isLast && <View style={styles.timelineLine} />}
      
      {/* Timeline Node Icon */}
      <View style={styles.timelineNode}>
        <Ionicons name="color-wand" size={20} color={Colors.primary} />
      </View>

      {/* Ride Card */}
      <View style={[styles.timelineCard, isHighWait ? { borderLeftColor: Colors.primaryFixedDim } : { borderLeftColor: Colors.primary }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTime}>{timeString}</Text>
          <View style={[styles.waitBadge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.waitBadgeText, { color: badgeText }]}>{badgeLabel}</Text>
          </View>
        </View>
        
        <Text style={styles.rideName}>{item.name}</Text>
        
        <View style={styles.cardFooterRow}>
          <View style={styles.locationGroup}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.onSurfaceVariant} />
            <Text style={styles.locationText}>{item.status}</Text>
          </View>
          
          <TouchableOpacity onPress={() => removeRide(item.id)} style={styles.removeBtn}>
            <Ionicons name="trash-outline" size={18} color={Colors.outlineVariant} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Transit/Walking step */}
      {!isLast && (
        <View style={styles.transitWrapper}>
          <View style={styles.transitDot} />
          <View style={styles.transitPill}>
            <Ionicons name="walk" size={14} color={Colors.onSurfaceVariant} />
            <Text style={styles.transitText}>10 min walk to next ride</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default function PlanScreen() {
  const { plannedRides, removeRide } = usePlan();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedRides, setOptimizedRides] = useState<any[]>([]);

  // Clear optimized list if a ride is removed that was in the optimization
  useEffect(() => {
    if (optimizedRides.length > 0) {
      const stillValid = optimizedRides.every(optRide => plannedRides.some(pr => pr.id === optRide.id));
      if (!stillValid || optimizedRides.length !== plannedRides.length) {
        setOptimizedRides([]); // Reset if mismatch
      }
    }
  }, [plannedRides]);

  const optimizePlan = async () => {
    if (plannedRides.length === 0) return;
    setIsOptimizing(true);
    setOptimizedRides([]); // Clear existing first to show loading state well

    // Fetch history for all rides
    const historyData: Record<string, HourlyAverage[]> = {};
    for (const ride of plannedRides) {
      historyData[ride.id] = await getHistoricalWaitTimes(ride.id);
    }

    // Greedy optimization starting at 9 AM
    let currentTimeHour = 9;
    const unassigned = [...plannedRides];
    const newPlan = [];

    while (unassigned.length > 0) {
      let bestRideIndex = -1;
      let minWait = Infinity;

      for (let i = 0; i < unassigned.length; i++) {
        const ride = unassigned[i];
        const history = historyData[ride.id];
        
        let wait = ride.queue?.STANDBY?.waitTime || 30; // fallback
        if (history && history.length > 0) {
          // Find the average wait time for the closest matching hour
          const closest = history.reduce((prev, curr) => 
            Math.abs(curr.hour - currentTimeHour) < Math.abs(prev.hour - currentTimeHour) ? curr : prev
          );
          wait = closest.averageWait;
        }

        if (wait < minWait) {
          minWait = wait;
          bestRideIndex = i;
        }
      }

      const selectedRide = unassigned[bestRideIndex];
      newPlan.push({
        ...selectedRide,
        scheduledHour: currentTimeHour,
        expectedWait: minWait
      });
      unassigned.splice(bestRideIndex, 1);

      // Advance time: wait time + assumed 10 min transit
      currentTimeHour += (minWait + 10) / 60;
    }

    setOptimizedRides(newPlan);
    setIsOptimizing(false);
  };

  if (plannedRides.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="clipboard-outline" size={64} color={Colors.outlineVariant} />
        <Text style={styles.emptyText}>Your plan is empty.</Text>
        <Text style={styles.emptySubtext}>Go to the Wait Times tab to add rides to your priority list!</Text>
      </View>
    );
  }

  const displayList = optimizedRides.length > 0 ? optimizedRides : plannedRides;

  return (
    <View style={styles.container}>
      {isOptimizing ? (
        <View style={styles.optimizingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.optimizingText}>Optimizing with AI magic...</Text>
        </View>
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <TimelineItem 
              item={item} 
              index={index} 
              isLast={index === displayList.length - 1} 
              removeRide={removeRide} 
            />
          )}
          ListHeaderComponent={() => (
            optimizedRides.length > 0 ? (
              <View style={styles.statsBadge}>
                <View style={styles.statsLeft}>
                  <Ionicons name="flash" size={32} color={Colors.secondary} />
                  <View>
                    <Text style={styles.statsLabel}>SMART OPTIMIZATION</Text>
                    <Text style={styles.statsTitle}>Itinerary Optimized</Text>
                  </View>
                </View>
              </View>
            ) : null
          )}
          ListFooterComponent={() => (
            <TouchableOpacity style={styles.updateButton} onPress={optimizePlan}>
              <Ionicons name="color-filter" size={20} color={Colors.onSecondaryContainer} />
              <Text style={styles.updateButtonText}>
                {optimizedRides.length > 0 ? "Re-Optimize Itinerary" : "Optimize Itinerary"}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
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
  optimizingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  optimizingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
    paddingTop: 60, // Account for layout header
    paddingBottom: 120, // Account for bottom nav
  },
  statsBadge: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    shadowColor: Colors.secondaryContainer,
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  statsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statsLabel: {
    color: Colors.onPrimaryContainer,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    opacity: 0.8,
  },
  statsTitle: {
    color: Colors.onPrimary,
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Georgia',
  },
  statsRight: {
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  statsTime: {
    color: Colors.onSecondaryContainer,
    fontSize: 20,
    fontWeight: '700',
  },
  statsEst: {
    color: Colors.onSecondaryContainer,
    fontSize: 8,
    fontWeight: '700',
  },
  timelineWrapper: {
    position: 'relative',
    paddingLeft: 48,
    marginBottom: 0,
  },
  timelineLine: {
    position: 'absolute',
    left: 19,
    top: 16,
    bottom: -40, // Extends to next item
    width: 2,
    backgroundColor: Colors.outlineVariant,
    opacity: 0.5,
    borderStyle: 'dashed', // React Native doesn't perfectly support dashed borders on Views like this natively, but setting opacity helps it look like a track
  },
  timelineNode: {
    position: 'absolute',
    left: 0,
    top: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  timelineCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // glass effect approx
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 24,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTime: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  waitBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  waitBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  rideName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.onSurface,
    marginBottom: 8,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  removeBtn: {
    padding: 4,
  },
  transitWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    marginLeft: -48, // Reset padding
    paddingLeft: 16, // Align dot with line
  },
  transitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.outlineVariant,
    zIndex: 10,
  },
  transitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(197, 198, 208, 0.3)',
  },
  transitText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: Colors.secondaryContainer,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    shadowColor: Colors.secondaryContainer,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  updateButtonText: {
    color: Colors.onSecondaryContainer,
    fontSize: 18,
    fontWeight: '700',
  }
});
