import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Animated, ScrollView, Modal, Dimensions } from 'react-native';
import { usePlan, TripDayPlan } from '../../src/PlanContext';
import { getHistoricalWaitTimes, HourlyAverage, WDW_PARKS } from '../../src/api';
import { Ionicons } from '@expo/vector-icons';

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

const TIME_OPTIONS = Array.from({ length: 25 }, (_, i) => 9 + i * 0.5); // 9:00 AM to 9:00 PM
const DURATION_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3];
const BREAK_TYPES = ['Lunch', 'Dinner', 'Snack', 'Rest Break', 'Custom'];

const formatTime = (hour: number) => {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const ampm = h >= 12 && h < 24 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m === 0 ? '00' : m;
  return `${displayH}:${displayM} ${ampm}`;
};

const formatDuration = (hours: number) => {
  if (hours === 1) return '1 hr';
  if (hours % 1 === 0) return `${hours} hrs`;
  return `${hours * 60} min`;
};

const formatTripDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
};

const formatParkName = (parkId: string) => {
  const park = WDW_PARKS.find((item) => item.id === parkId);
  return (park?.name ?? 'Select a park')
    .replace('Disney\'s ', '')
    .replace(' Theme Park', '')
    .replace(' Park', '');
};

const TripSummaryCard = ({ tripDays }: { tripDays: TripDayPlan[] }) => {
  if (tripDays.length === 0) {
    return null;
  }

  return (
    <View style={styles.tripSummaryCard}>
      <View style={styles.tripSummaryHeader}>
        <View>
          <Text style={styles.tripSummaryLabel}>Trip Plan</Text>
          <Text style={styles.tripSummaryTitle}>{tripDays.length} Day Park Schedule</Text>
        </View>
        <Ionicons name="map" size={24} color={Colors.secondaryContainer} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tripDayPills}>
        {tripDays.map((day, index) => (
          <View key={day.date} style={styles.tripDayPill}>
            <Text style={styles.tripDayDate}>Day {index + 1} · {formatTripDate(day.date)}</Text>
            <Text style={styles.tripDayPark}>{formatParkName(day.parkId)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const TimelineItem = ({ item, index, isLast, removeRide, removeBreak }: { item: any, index: number, isLast: boolean, removeRide: (id: string) => void, removeBreak: (id: string) => void }) => {
  const isBreak = item.isBreak;
  const isShow = item.entityType === 'SHOW';
  
  const waitTime = item.expectedWait !== undefined ? item.expectedWait : (item.queue?.STANDBY?.waitTime || 0);
  
  const hour = item.scheduledHour !== undefined ? item.scheduledHour : 9 + index;
  const timeString = formatTime(hour);
  
  // Decide colors based on item type
  const badgeBg = isBreak ? Colors.surfaceContainerHigh : (isShow ? Colors.tertiaryFixedDim : (waitTime > 50 ? Colors.errorContainer : Colors.primaryContainer));
  const badgeText = isBreak ? Colors.onSurface : (isShow ? Colors.primary : (waitTime > 50 ? Colors.onErrorContainer : Colors.onPrimaryContainer));
  const badgeLabel = isBreak ? 'Break' : (isShow ? 'Showtime' : (waitTime > 50 ? `Peak: ${waitTime}m Wait` : `${waitTime}m Wait`));

  return (
    <View style={styles.timelineWrapper}>
      {/* Continuous Line (hidden on last item) */}
      {!isLast && <View style={styles.timelineLine} />}
      
      {/* Timeline Node Icon */}
      <View style={[styles.timelineNode, isBreak ? { borderColor: Colors.outline } : {}]}>
        <Ionicons name={isBreak ? "restaurant" : (isShow ? "star" : "color-wand")} size={20} color={isBreak ? Colors.outline : Colors.primary} />
      </View>

      {/* Ride Card */}
      <View style={[styles.timelineCard, isBreak ? { borderLeftColor: Colors.outlineVariant } : (isShow ? { borderLeftColor: Colors.tertiaryFixedDim } : (waitTime > 50 ? { borderLeftColor: Colors.primaryFixedDim } : { borderLeftColor: Colors.primary })) ]}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTime}>{timeString}</Text>
          <View style={[styles.waitBadge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.waitBadgeText, { color: badgeText }]}>{badgeLabel}</Text>
          </View>
        </View>
        
        <Text style={styles.rideName}>{item.name}</Text>
        
        <View style={styles.cardFooterRow}>
          <View style={styles.locationGroup}>
            <Ionicons name={isBreak ? "time-outline" : "information-circle-outline"} size={14} color={Colors.onSurfaceVariant} />
            <Text style={styles.locationText}>{isBreak ? formatDuration(item.durationHours) : (isShow ? 'Entertainment' : item.status)}</Text>
          </View>
          
          <TouchableOpacity onPress={() => isBreak ? removeBreak(item.id) : removeRide(item.id)} style={styles.removeBtn}>
            <Ionicons name="trash-outline" size={18} color={Colors.outlineVariant} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Transit/Walking step */}
      {!isLast && !isBreak && (
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

const BreakModal = ({ isVisible, onClose, onAdd }: { isVisible: boolean, onClose: () => void, onAdd: (type: string, time: number, duration: number) => void }) => {
  const [breakType, setBreakType] = useState(BREAK_TYPES[0]);
  const [breakTime, setBreakTime] = useState(12.5);
  const [breakDuration, setBreakDuration] = useState(1);
  
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8
      }).start();
    } else {
      slideAnim.setValue(Dimensions.get('window').height);
    }
  }, [isVisible]);

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalContent, { transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.modalTitle}>Schedule Break</Text>
          
          <Text style={styles.pickerLabel}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerScroll}>
            {BREAK_TYPES.map(type => (
              <TouchableOpacity 
                key={type} 
                style={[styles.pickerChip, breakType === type && styles.pickerChipActive]}
                onPress={() => setBreakType(type)}
              >
                <Text style={[styles.pickerChipText, breakType === type && styles.pickerChipTextActive]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.pickerLabel}>Start Time</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerScroll}>
            {TIME_OPTIONS.map(time => (
              <TouchableOpacity 
                key={time} 
                style={[styles.pickerChip, breakTime === time && styles.pickerChipActive]}
                onPress={() => setBreakTime(time)}
              >
                <Text style={[styles.pickerChipText, breakTime === time && styles.pickerChipTextActive]}>{formatTime(time)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.pickerLabel}>Duration</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerScroll}>
            {DURATION_OPTIONS.map(dur => (
              <TouchableOpacity 
                key={dur} 
                style={[styles.pickerChip, breakDuration === dur && styles.pickerChipActive]}
                onPress={() => setBreakDuration(dur)}
              >
                <Text style={[styles.pickerChipText, breakDuration === dur && styles.pickerChipTextActive]}>{formatDuration(dur)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
             <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={onClose}>
               <Text style={styles.modalBtnCancelText}>Cancel</Text>
             </TouchableOpacity>
             <TouchableOpacity style={[styles.modalBtn, styles.modalBtnAdd]} onPress={() => onAdd(breakType, breakTime, breakDuration)}>
               <Text style={styles.modalBtnAddText}>Add Break</Text>
             </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const DateSelector = ({ tripDays, selectedDate, onSelectDate }: { tripDays: any[], selectedDate: string, onSelectDate: (date: string) => void }) => (
  <View style={styles.dateSelectorContainer}>
    <Text style={styles.dateSelectorLabel}>Planning for:</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateSelectorScroll}>
      {tripDays.map((day, index) => (
        <TouchableOpacity
          key={day.date}
          style={[styles.dateTab, selectedDate === day.date && styles.dateTabActive]}
          onPress={() => onSelectDate(day.date)}
        >
          <Text style={[styles.dateTabText, selectedDate === day.date && styles.dateTabTextActive]}>
            Day {index + 1}: {formatTripDate(day.date)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

export default function PlanScreen() {
  const { 
    plannedRides, 
    removeRide, 
    plannedBreaks, 
    addBreak, 
    removeBreak, 
    tripDays, 
    isLoading: isContextLoading,
    selectedDate,
    setSelectedDate
  } = usePlan();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedPlan, setOptimizedPlan] = useState<any[]>([]);

  // Modal Visibility State
  const [isModalVisible, setModalVisible] = useState(false);

  const currentRides = plannedRides.filter(r => r.date === selectedDate);
  const currentBreaks = plannedBreaks.filter(b => b.date === selectedDate);

  // Clear optimized list if a ride or break is removed that was in the optimization
  useEffect(() => {
    if (optimizedPlan.length > 0) {
      const ridesInOpt = optimizedPlan.filter(r => !r.isBreak);
      const breaksInOpt = optimizedPlan.filter(r => r.isBreak);
      
      const ridesStillValid = ridesInOpt.every(optRide => currentRides.some(pr => pr.id === optRide.id));
      const breaksStillValid = breaksInOpt.every(optBreak => currentBreaks.some(pb => pb.id === optBreak.id));
      
      if (!ridesStillValid || !breaksStillValid || ridesInOpt.length !== currentRides.length || breaksInOpt.length !== currentBreaks.length) {
        setOptimizedPlan([]); // Reset if mismatch
      }
    }
  }, [plannedRides, plannedBreaks, selectedDate]);

  const handleAddBreak = (type: string, time: number, duration: number) => {
    addBreak({
      id: `break-${Date.now()}`,
      name: type === 'Custom' ? 'Break' : `${type} Break`,
      startTimeHour: time,
      durationHours: duration
    }, selectedDate);
    setModalVisible(false);
  };

  const optimizePlan = async () => {
    if (currentRides.length === 0 && currentBreaks.length === 0) return;
    setIsOptimizing(true);
    setOptimizedPlan([]);

    // Fetch history for all rides (ignore shows for wait time history)
    const historyData: Record<string, HourlyAverage[]> = {};
    for (const ride of currentRides) {
      if (ride.entityType !== 'SHOW') {
        historyData[ride.id] = await getHistoricalWaitTimes(ride.id);
      }
    }

    const unassignedAttractions = [...currentRides.filter(r => r.entityType !== 'SHOW')];
    const shows = currentRides.filter(r => r.entityType === 'SHOW').map(s => ({
      ...s,
      scheduledHour: (s as any).selectedShowtimeHour || 15, // default 3 PM if not set
      durationHours: 0.75, // 45 min for show
      isBreak: false
    }));

    const breaks = currentBreaks.map(b => ({
      ...b,
      scheduledHour: b.startTimeHour,
      isBreak: true
    }));

    // Fixed schedule items (Shows and Breaks)
    const fixedItems = [...shows, ...breaks].sort((a, b) => a.scheduledHour - b.scheduledHour);

    let currentTimeHour = 9; // Park opens 9 AM
    const newPlan = [];

    // Utility to check if a specific time slot overlaps with fixed items
    const getNextAvailableTime = (time: number, duration: number) => {
      let current = time;
      let conflict = true;
      while (conflict) {
        conflict = false;
        for (const fixed of fixedItems) {
          const fixedEnd = fixed.scheduledHour + (fixed.durationHours || 0.75);
          const currentEnd = current + duration;
          // Check overlap
          if (current < fixedEnd && currentEnd > fixed.scheduledHour) {
            current = fixedEnd; // Skip to the end of the conflicting block
            conflict = true;
            break;
          }
        }
      }
      return current;
    };

    while (unassignedAttractions.length > 0) {
      let bestRideIndex = -1;
      let minWait = Infinity;

      for (let i = 0; i < unassignedAttractions.length; i++) {
        const ride = unassignedAttractions[i];
        const history = historyData[ride.id];
        
        let wait = ride.queue?.STANDBY?.waitTime || 30; // fallback
        if (history && history.length > 0) {
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

      const selectedRide = unassignedAttractions[bestRideIndex];
      const waitHours = minWait / 60;
      const rideDuration = 10 / 60; // 10 min ride time
      const transit = 10 / 60; // 10 min transit
      const totalBlock = waitHours + rideDuration;

      // Ensure we don't start the wait/ride during a show or break
      currentTimeHour = getNextAvailableTime(currentTimeHour, totalBlock);

      newPlan.push({
        ...selectedRide,
        scheduledHour: currentTimeHour,
        expectedWait: minWait
      });

      unassignedAttractions.splice(bestRideIndex, 1);
      currentTimeHour += totalBlock + transit;
    }

    // Combine newly scheduled rides with the fixed items
    const finalPlan = [...newPlan, ...fixedItems].sort((a, b) => a.scheduledHour - b.scheduledHour);

    setOptimizedPlan(finalPlan);
    setIsOptimizing(false);
  };

  if (isContextLoading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.emptyText, { marginTop: 12 }]}>Loading your magical plans...</Text>
      </View>
    );
  }

  if (currentRides.length === 0 && currentBreaks.length === 0) {
    return (
      <View style={styles.container}>
        <DateSelector tripDays={tripDays} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        <View style={styles.emptyContainer}>
          <Ionicons name="clipboard-outline" size={64} color={Colors.outlineVariant} />
          <Text style={styles.emptyText}>Your plan for this day is empty.</Text>
          <Text style={styles.emptySubtext}>Go to the Wait Times tab to add rides and shows to your priority list!</Text>
          
          <View style={[styles.breaksContainer, {marginTop: 24}]}>
            <TouchableOpacity style={styles.addBreakButton} onPress={() => setModalVisible(true)}>
              <Ionicons name="add-circle-outline" size={20} color={Colors.onPrimary} />
              <Text style={styles.addBreakButtonText}>Schedule Custom Break</Text>
            </TouchableOpacity>
          </View>

          <BreakModal 
            isVisible={isModalVisible} 
            onClose={() => setModalVisible(false)} 
            onAdd={handleAddBreak} 
          />
        </View>
      </View>
    );
  }

  const displayList = optimizedPlan.length > 0 ? optimizedPlan : [...currentBreaks.map(b => ({...b, isBreak: true})), ...currentRides];

  return (
    <View style={styles.container}>
      <DateSelector tripDays={tripDays} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      <BreakModal 
          isVisible={isModalVisible} 
          onClose={() => setModalVisible(false)} 
          onAdd={handleAddBreak} 
        />
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
              removeRide={(id) => removeRide(id, selectedDate)} 
              removeBreak={removeBreak}
            />
          )}
          ListHeaderComponent={() => (
            <View>
              <TripSummaryCard tripDays={tripDays.filter(d => d.date === selectedDate)} />

              {/* Add Breaks UI */}
              <View style={styles.breaksContainer}>
                <TouchableOpacity style={styles.addBreakButton} onPress={() => setModalVisible(true)}>
                  <Ionicons name="add-circle-outline" size={20} color={Colors.onPrimary} />
                  <Text style={styles.addBreakButtonText}>Schedule Custom Break</Text>
                </TouchableOpacity>
              </View>

              {optimizedPlan.length > 0 && (
                <View style={styles.statsBadge}>
                  <View style={styles.statsLeft}>
                    <Ionicons name="flash" size={32} color={Colors.secondary} />
                    <View>
                      <Text style={styles.statsLabel}>SMART OPTIMIZATION</Text>
                      <Text style={styles.statsTitle}>Itinerary Optimized</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
          ListFooterComponent={() => (
            <TouchableOpacity style={styles.updateButton} onPress={optimizePlan}>
              <Ionicons name="color-filter" size={20} color={Colors.onSecondaryContainer} />
              <Text style={styles.updateButtonText}>
                {optimizedPlan.length > 0 ? "Re-Optimize Itinerary" : "Optimize Itinerary"}
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
  breaksContainer: {
    marginBottom: 24,
  },
  breaksTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  breakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  breakButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
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

  tripSummaryCard: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: 18,
    padding: 16,
    marginTop: 24,
    marginBottom: 24,
    width: '100%',
    shadowColor: Colors.secondaryContainer,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  tripSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  tripSummaryLabel: {
    color: Colors.onPrimaryContainer,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tripSummaryTitle: {
    color: Colors.onPrimary,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Georgia',
    marginTop: 2,
  },
  tripDayPills: {
    gap: 10,
  },
  tripDayPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 145,
  },
  tripDayDate: {
    color: Colors.onPrimaryContainer,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  tripDayPark: {
    color: Colors.secondaryContainer,
    fontSize: 14,
    fontWeight: '800',
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    marginBottom: 8,
    marginTop: 16,
  },
  pickerScroll: {
    gap: 8,
  },
  pickerChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  pickerChipActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  pickerChipText: {
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
    fontSize: 14,
  },
  pickerChipTextActive: {
    color: Colors.onPrimaryContainer,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
    gap: 16,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  modalBtnAdd: {
    backgroundColor: Colors.primary,
  },
  modalBtnCancelText: {
    color: Colors.onSurface,
    fontWeight: '600',
    fontSize: 16,
  },
  modalBtnAddText: {
    color: Colors.onPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  addBreakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryContainer,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.primaryFixedDim,
  },
  addBreakButtonText: {
    color: Colors.onPrimaryContainer,
    fontWeight: '600',
    fontSize: 16,
  },
  dateSelectorContainer: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
  },
  dateSelectorLabel: {
    color: Colors.secondaryFixedDim,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  dateSelectorScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dateTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dateTabActive: {
    backgroundColor: Colors.secondaryContainer,
    borderColor: Colors.secondaryFixed,
  },
  dateTabText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
  },
  dateTabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
