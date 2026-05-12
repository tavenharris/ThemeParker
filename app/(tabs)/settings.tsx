import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar } from 'react-native-calendars';
import { WDW_PARKS } from '../../src/api';
import { usePlan } from '../../src/PlanContext';
import { useAuth } from '../../src/AuthContext';

const Colors = {
  primary: '#021541',
  secondary: '#735c00',
  secondaryContainer: '#fed65b',
  secondaryFixed: '#ffe088',
  secondaryFixedDim: '#e9c349',
  surface: '#f9f9f9',
  surfaceContainer: '#eeeeee',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f3f3f3',
  surfaceContainerHigh: '#e8e8e8',
  onSurface: '#1a1c1c',
  onSurfaceVariant: '#45464f',
  outline: '#757680',
  outlineVariant: '#c5c6d0',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onPrimary: '#ffffff',
  primaryContainer: '#1a2b56',
  onPrimaryContainer: '#8393c5',
  onSecondaryContainer: '#745c00',
};

const PARK_ACCENTS: Record<string, string> = {
  [WDW_PARKS[0]?.id ?? 'mk']: '#1E88E5',
  [WDW_PARKS[1]?.id ?? 'epcot']: '#8E24AA',
  [WDW_PARKS[2]?.id ?? 'hs']: '#E53935',
  [WDW_PARKS[3]?.id ?? 'ak']: '#43A047',
};

const formatDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const formatParkName = (name: string) => name
  .replace('Disney\'s ', '')
  .replace(' Theme Park', '')
  .replace(' Park', '');

const parseDateInput = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export default function SettingsScreen() {
  const {
    tripStartDate,
    tripEndDate,
    tripDays,
    setTripDates,
    updateTripDayPark,
    preferences,
    updatePreference,
  } = usePlan();
  const { signOut, profile } = useAuth();
  
  const [range, setRange] = useState<{ start?: string; end?: string }>({
    start: tripStartDate,
    end: tripEndDate,
  });
  
  const [dateError, setDateError] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    setRange({ start: tripStartDate, end: tripEndDate });
  }, [tripEndDate, tripStartDate]);

  const tripDuration = tripDays.length;

  const onDayPress = (day: { dateString: string }) => {
    const { dateString } = day;
    
    if (!range.start || (range.start && range.end)) {
      // Start new selection
      setRange({ start: dateString, end: undefined });
      setDateError('');
    } else {
      // Selecting end date
      if (dateString < range.start) {
        // If selected date is before start, make it the new start
        setRange({ start: dateString, end: undefined });
      } else {
        const start = new Date(`${range.start}T00:00:00`);
        const end = new Date(`${dateString}T00:00:00`);
        const dayCount = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
        
        if (dayCount > 21) {
          setDateError('Keep the planning window to 21 days or fewer.');
          return;
        }
        
        setRange({ ...range, end: dateString });
        setDateError('');
      }
    }
  };

  const markedDates = useMemo(() => {
    const marked: any = {};
    if (range.start) {
      marked[range.start] = { 
        startingDay: true, 
        color: Colors.primary, 
        textColor: 'white',
        selected: true 
      };
    }
    if (range.end) {
      marked[range.end] = { 
        endingDay: true, 
        color: Colors.primary, 
        textColor: 'white',
        selected: true 
      };
      
      // Fill in between
      let current = new Date(`${range.start}T00:00:00`);
      const end = new Date(`${range.end}T00:00:00`);
      current.setDate(current.getDate() + 1);
      while (current < end) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        marked[dateString] = { 
          color: Colors.primaryContainer, 
          textColor: Colors.onPrimaryContainer,
          selected: true
        };
        current.setDate(current.getDate() + 1);
      }
    }
    return marked;
  }, [range]);

  const handleApplyDates = () => {
    if (!range.start || !range.end) {
      setDateError('Please select a start and end date on the calendar.');
      return;
    }

    setTripDates(range.start, range.end);
    Alert.alert('Success', 'Trip dates updated successfully!');
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Log out failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  };

  const displayName = profile?.full_name || 'Guest User';
  const displayEmail = profile?.email || 'Sign in to sync your plans';
  const displayAvatar = profile?.avatar_url || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[Colors.primaryContainer, Colors.primary]} style={styles.profileCard}>
        <View style={styles.profileGlow} />
        <Image
          source={{ uri: displayAvatar }}
          style={styles.profileImage}
        />
        <View style={styles.profileCopy}>
          <Text style={styles.profileEyebrow}>{profile ? 'Gold Pass Member' : 'Guest mode'}</Text>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileMeta}>{displayEmail}</Text>
        </View>
      </LinearGradient>

      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionKicker}>Trip Planner</Text>
          <Text style={styles.sectionTitle}>Plan Your Magic</Text>
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationNumber}>{tripDuration}</Text>
          <Text style={styles.durationLabel}>{tripDuration === 1 ? 'day' : 'days'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.calendarContainer}>
          <Calendar
            markingType={'period'}
            markedDates={markedDates}
            onDayPress={onDayPress}
            theme={{
              calendarBackground: 'transparent',
              textSectionTitleColor: Colors.outline,
              selectedDayBackgroundColor: Colors.primary,
              selectedDayTextColor: '#ffffff',
              todayTextColor: Colors.secondary,
              dayTextColor: Colors.onSurface,
              textDisabledColor: Colors.outlineVariant,
              dotColor: Colors.primary,
              selectedDotColor: '#ffffff',
              arrowColor: Colors.primary,
              monthTextColor: Colors.primary,
              indicatorColor: Colors.primary,
              textDayFontFamily: 'System',
              textMonthFontFamily: 'Georgia',
              textDayHeaderFontFamily: 'System',
              textDayFontWeight: '600',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 14,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 12,
            }}
          />
        </View>

        <View style={styles.rangeInfo}>
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>Start</Text>
            <Text style={styles.dateValue}>{range.start ? formatDate(range.start) : 'Select'}</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={Colors.outline} />
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>End</Text>
            <Text style={styles.dateValue}>{range.end ? formatDate(range.end) : 'Select'}</Text>
          </View>
        </View>

        {dateError ? <Text style={styles.errorText}>{dateError}</Text> : null}

        <TouchableOpacity style={styles.applyButton} onPress={handleApplyDates} activeOpacity={0.85}>
          <LinearGradient
            colors={[Colors.secondary, Colors.secondaryFixed]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.applyButtonGradient}
          >
            <Text style={styles.applyButtonText}>Save Itinerary</Text>
            <Ionicons name="sparkles" size={18} color={Colors.onSecondaryContainer} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionKicker}>Destinations</Text>
          <Text style={styles.sectionTitle}>Assign Destinations</Text>
        </View>
        <Ionicons name="map-outline" size={24} color={Colors.secondary} />
      </View>

      <View style={styles.daysList}>
        {tripDays.map((day, index) => (
          <View key={day.date} style={[styles.dayCard, { borderLeftColor: PARK_ACCENTS[day.parkId] ?? Colors.primary }]}> 
            <View style={styles.dayHeader}>
              <View style={styles.dayIcon}>
                <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.dayDate}>{formatDate(day.date)}</Text>
                <Text style={styles.dayTitle}>Day {index + 1}</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.parkChipRow}>
              {WDW_PARKS.map((park) => {
                const isSelected = park.id === day.parkId;
                return (
                  <TouchableOpacity
                    key={park.id}
                    style={[styles.parkChip, isSelected && styles.parkChipActive]}
                    onPress={() => updateTripDayPark(day.date, park.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.parkChipText, isSelected && styles.parkChipTextActive]}>{formatParkName(park.name)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ))}
        {tripDays.length === 0 && (
          <Text style={styles.emptyText}>Select trip dates above to start planning your days.</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>App Preferences</Text>
      <View style={styles.cardGroup}>
        <PreferenceSwitch
          icon="notifications-outline"
          title="Notifications"
          subtitle="Wait time alerts and itinerary reminders"
          value={preferences.notificationsEnabled}
          onValueChange={(value) => updatePreference('notificationsEnabled', value)}
        />
        <View style={styles.preferenceRow}>
          <View style={styles.preferenceLeft}>
            <Ionicons name="resize-outline" size={22} color={Colors.primary} />
            <View style={styles.preferenceCopy}>
              <Text style={styles.preferenceTitle}>Units</Text>
              <Text style={styles.preferenceSubtitle}>Choose distance labels for maps</Text>
            </View>
          </View>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segmentButton, !preferences.useMetricUnits && styles.segmentButtonActive]}
              onPress={() => updatePreference('useMetricUnits', false)}
            >
              <Text style={[styles.segmentText, !preferences.useMetricUnits && styles.segmentTextActive]}>mi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentButton, preferences.useMetricUnits && styles.segmentButtonActive]}
              onPress={() => updatePreference('useMetricUnits', true)}
            >
              <Text style={[styles.segmentText, preferences.useMetricUnits && styles.segmentTextActive]}>km</Text>
            </TouchableOpacity>
          </View>
        </View>
        <PreferenceSwitch
          icon="moon-outline"
          title="Dark Mode"
          subtitle="Store your display preference"
          value={preferences.darkModeEnabled}
          onValueChange={(value) => updatePreference('darkModeEnabled', value)}
        />
      </View>

      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.cardGroup}>
        <AccountRow icon="ticket-outline" title="Link Tickets" detail="3 linked" />
        <AccountRow icon="card-outline" title="Payment Methods" detail="Manage" />
        <AccountRow icon="lock-closed-outline" title="Change Password" detail="Update" />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut} disabled={isSigningOut} activeOpacity={0.85}>
        {isSigningOut ? (
          <ActivityIndicator color={Colors.error} />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={22} color={Colors.error} />
            <Text style={styles.logoutText}>Log Out</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.versionText}>Version 1.0.0 · Magic Build</Text>
    </ScrollView>
  );
}

function PreferenceSwitch({ icon, title, subtitle, value, onValueChange }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.preferenceRow}>
      <View style={styles.preferenceLeft}>
        <Ionicons name={icon} size={22} color={Colors.primary} />
        <View style={styles.preferenceCopy}>
          <Text style={styles.preferenceTitle}>{title}</Text>
          <Text style={styles.preferenceSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.outlineVariant, true: Colors.secondaryContainer }}
        thumbColor={value ? Colors.secondary : Colors.surfaceContainerLowest}
      />
    </View>
  );
}

function AccountRow({ icon, title, detail }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
}) {
  return (
    <TouchableOpacity style={styles.accountRow} activeOpacity={0.75}>
      <View style={styles.preferenceLeft}>
        <Ionicons name={icon} size={22} color={Colors.primary} />
        <Text style={styles.preferenceTitle}>{title}</Text>
      </View>
      <View style={styles.accountDetailRow}>
        <Text style={styles.accountDetail}>{detail}</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.outlineVariant} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 120,
  },
  profileCard: {
    borderRadius: 24,
    padding: 20,
    minHeight: 150,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 28,
    shadowColor: Colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  profileGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -50,
    top: -60,
    backgroundColor: 'rgba(254, 214, 91, 0.22)',
  },
  profileImage: {
    width: 78,
    height: 78,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.secondaryFixed,
    marginRight: 16,
  },
  profileCopy: {
    flex: 1,
  },
  profileEyebrow: {
    color: Colors.secondaryFixedDim,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  profileName: {
    color: Colors.onPrimary,
    fontFamily: 'Georgia',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileMeta: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  sectionKicker: {
    color: Colors.secondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sectionTitle: {
    color: Colors.primary,
    fontFamily: 'Georgia',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  durationBadge: {
    backgroundColor: Colors.secondaryContainer,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  durationNumber: {
    color: Colors.onSecondaryContainer,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
  },
  durationLabel: {
    color: Colors.onSecondaryContainer,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.22)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 28,
    shadowColor: Colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  calendarContainer: {
    marginBottom: 16,
  },
  rangeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    marginTop: 8,
  },
  dateBlock: {
    alignItems: 'center',
  },
  dateLabel: {
    color: Colors.outline,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateValue: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  applyButton: {
    marginTop: 14,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.secondary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  applyButtonGradient: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  applyButtonText: {
    color: Colors.onSecondaryContainer,
    fontSize: 15,
    fontWeight: '800',
  },
  daysList: {
    gap: 12,
    marginBottom: 28,
  },
  dayCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 18,
    borderLeftWidth: 5,
    padding: 14,
    shadowColor: Colors.primary,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  dayIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDate: {
    color: Colors.outline,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  dayTitle: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  parkChipRow: {
    gap: 8,
    paddingRight: 4,
  },
  parkChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  parkChipActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  parkChipText: {
    color: Colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '700',
  },
  parkChipTextActive: {
    color: Colors.onPrimaryContainer,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginTop: 20,
    paddingHorizontal: 40,
  },
  cardGroup: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(197, 198, 208, 0.55)',
  },
  preferenceRow: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.outlineVariant,
    gap: 12,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  preferenceCopy: {
    flex: 1,
  },
  preferenceTitle: {
    color: Colors.onSurface,
    fontSize: 16,
    fontWeight: '800',
  },
  preferenceSubtitle: {
    color: Colors.onSurfaceVariant,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 14,
    padding: 3,
  },
  segmentButton: {
    minWidth: 40,
    paddingVertical: 7,
    borderRadius: 11,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: Colors.primary,
  },
  segmentText: {
    color: Colors.onSurfaceVariant,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: Colors.onPrimary,
  },
  accountRow: {
    minHeight: 62,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.outlineVariant,
  },
  accountDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountDetail: {
    color: Colors.outline,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  logoutButton: {
    height: 56,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 218, 214, 0.22)',
  },
  logoutText: {
    color: Colors.error,
    fontFamily: 'Georgia',
    fontSize: 20,
    fontWeight: '700',
  },
  versionText: {
    color: Colors.outline,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
