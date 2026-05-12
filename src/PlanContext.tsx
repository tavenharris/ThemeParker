import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RideWaitTime, WDW_PARKS } from './api';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';

export interface PlannedBreak {
  id: string;
  name: string;
  startTimeHour: number; // e.g., 14.5 for 2:30 PM
  durationHours: number; // e.g., 1 for 1 hour
}

export interface TripDayPlan {
  date: string;
  parkId: string;
}

export interface AppPreferences {
  notificationsEnabled: boolean;
  useMetricUnits: boolean;
  darkModeEnabled: boolean;
}

interface PlanContextType {
  plannedRides: (RideWaitTime & { date: string })[];
  addRide: (ride: RideWaitTime, date: string, selectedShowtimeHour?: number) => void;
  removeRide: (rideId: string, date: string) => void;
  isPlanned: (rideId: string, date: string) => boolean;
  plannedBreaks: (PlannedBreak & { date: string })[];
  addBreak: (brk: PlannedBreak, date: string) => void;
  removeBreak: (breakId: string) => void;
  tripStartDate: string;
  tripEndDate: string;
  tripDays: TripDayPlan[];
  setTripDates: (startDate: string, endDate: string) => void;
  updateTripDayPark: (date: string, parkId: string) => void;
  preferences: AppPreferences;
  updatePreference: <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => void;
  isLoading: boolean;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PARK_ID = WDW_PARKS[0]?.id ?? '';
const PLAN_SETTINGS_STORAGE_KEY = '@disney_planner/plan_settings';

const toISODate = (date: Date) => date.toISOString().slice(0, 10);

const parseISODate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);

const buildTripDays = (startDate: string, endDate: string, existingDays: TripDayPlan[] = []) => {
  const start = parseISODate(startDate);
  const end = parseISODate(endDate);

  if (!start || !end || start > end) {
    return existingDays;
  }

  const previousParkByDate = new Map(existingDays.map((day) => [day.date, day.parkId]));
  const tripDays: TripDayPlan[] = [];
  let index = 0;

  for (let current = start; current <= end; current = addDays(current, 1)) {
    const date = toISODate(current);
    const fallbackPark = WDW_PARKS[index % WDW_PARKS.length]?.id ?? DEFAULT_PARK_ID;

    tripDays.push({
      date,
      parkId: previousParkByDate.get(date) ?? fallbackPark,
    });

    index += 1;
  }

  return tripDays;
};

type PersistedPlanSettings = {
  tripStartDate?: unknown;
  tripEndDate?: unknown;
  tripDays?: unknown;
  preferences?: Partial<AppPreferences>;
  plannedRides?: unknown;
  plannedBreaks?: unknown;
  selectedDate?: string;
};

const isTripDayPlan = (value: unknown): value is TripDayPlan => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<TripDayPlan>;
  return typeof candidate.date === 'string' && typeof candidate.parkId === 'string';
};

const isPreferencePatch = (value: unknown): value is Partial<AppPreferences> => {
  return !!value && typeof value === 'object';
};

const initialStartDate = toISODate(addDays(new Date(), 30));
const initialEndDate = toISODate(addDays(new Date(), 33));
const initialTripDays = buildTripDays(initialStartDate, initialEndDate);

export const PlanProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const [plannedRides, setPlannedRides] = useState<(RideWaitTime & { date: string })[]>([]);
  const [plannedBreaks, setPlannedBreaks] = useState<(PlannedBreak & { date: string })[]>([]);
  const [tripStartDate, setTripStartDate] = useState(initialStartDate);
  const [tripEndDate, setTripEndDate] = useState(initialEndDate);
  const [tripDays, setTripDays] = useState<TripDayPlan[]>(initialTripDays);
  const [selectedDate, setSelectedDate] = useState(initialStartDate);
  const [preferences, setPreferences] = useState<AppPreferences>({
    notificationsEnabled: true,
    useMetricUnits: false,
    darkModeEnabled: false,
  });
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasHydratedSettings, setHasHydratedSettings] = useState(false);

  // Sync with Supabase if logged in
  useEffect(() => {
    let isMounted = true;

    const syncWithSupabase = async () => {
      if (!session?.user) {
        // If not logged in, load from AsyncStorage
        try {
          const rawSettings = await AsyncStorage.getItem(PLAN_SETTINGS_STORAGE_KEY);
          if (rawSettings && isMounted) {
            const parsed = JSON.parse(rawSettings) as PersistedPlanSettings;
            if (typeof parsed.tripStartDate === 'string') setTripStartDate(parsed.tripStartDate);
            if (typeof parsed.tripEndDate === 'string') setTripEndDate(parsed.tripEndDate);
            if (Array.isArray(parsed.tripDays) && parsed.tripDays.every(isTripDayPlan)) setTripDays(parsed.tripDays);
            if (isPreferencePatch(parsed.preferences)) setPreferences(prev => ({ ...prev, ...parsed.preferences }));
            if (Array.isArray(parsed.plannedRides)) setPlannedRides(parsed.plannedRides);
            if (Array.isArray(parsed.plannedBreaks)) setPlannedBreaks(parsed.plannedBreaks);
            if (parsed.selectedDate) setSelectedDate(parsed.selectedDate);
          }
        } catch (e) {
          console.error('AsyncStorage load error', e);
        } finally {
          if (isMounted) {
            setIsLoading(false);
            setHasHydratedSettings(true);
          }
        }
        return;
      }

      setIsLoading(true);
      try {
        // Fetch or create active trip
        let { data: trips, error: tripsError } = await supabase
          .from('trips')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        let activeTrip;
        if (tripsError || !trips || trips.length === 0) {
          const { data: newTrip, error: createError } = await supabase
            .from('trips')
            .insert({
              user_id: session.user.id,
              start_date: tripStartDate,
              end_date: tripEndDate,
              name: 'My Disney Trip'
            })
            .select()
            .single();
          
          if (createError) throw createError;
          activeTrip = newTrip;
        } else {
          activeTrip = trips[0];
        }

        if (isMounted) {
          setActiveTripId(activeTrip.id);
          setTripStartDate(activeTrip.start_date);
          setTripEndDate(activeTrip.end_date);
          setSelectedDate(activeTrip.start_date);

          // Fetch trip days
          const { data: days } = await supabase.from('trip_days').select('*').eq('trip_id', activeTrip.id);
          if (days && days.length > 0) {
            setTripDays(days.map(d => ({ date: d.date, parkId: d.park_id })));
          } else {
            // Populate trip days if missing
            const generatedDays = buildTripDays(activeTrip.start_date, activeTrip.end_date);
            await supabase.from('trip_days').insert(generatedDays.map(d => ({
              trip_id: activeTrip.id,
              date: d.date,
              park_id: d.park_id
            })));
            setTripDays(generatedDays);
          }

          // Fetch planned rides
          const { data: rides } = await supabase.from('planned_rides').select('*').eq('trip_id', activeTrip.id);
          if (rides) {
            setPlannedRides(rides.map(r => ({
              id: r.ride_id,
              name: r.ride_name || 'Unknown Attraction',
              entityType: 'ATTRACTION', // Defaulting for now
              status: 'OPERATING',
              selectedShowtimeHour: r.showtime_hour,
              date: r.date || activeTrip.start_date
            } as any)));
          }

          // Fetch planned breaks
          const { data: breaks } = await supabase.from('planned_breaks').select('*').eq('trip_id', activeTrip.id);
          if (breaks) {
            setPlannedBreaks(breaks.map(b => ({
              id: b.id,
              name: b.name,
              startTimeHour: b.start_time_hour,
              durationHours: b.duration_hours,
              date: b.date
            })));
          }
        }
      } catch (error) {
        console.error('Supabase sync error:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setHasHydratedSettings(true);
        }
      }
    };

    syncWithSupabase();

    return () => {
      isMounted = false;
    };
  }, [session, tripStartDate, tripEndDate]);

  // Persist preferences to AsyncStorage (always local for now)
  useEffect(() => {
    if (!hasHydratedSettings) return;

    AsyncStorage.setItem(PLAN_SETTINGS_STORAGE_KEY, JSON.stringify({
      tripStartDate,
      tripEndDate,
      tripDays,
      preferences,
      plannedRides,
      plannedBreaks,
      selectedDate
    })).catch((error) => {
      console.error('Unable to save plan settings:', error);
    });
  }, [hasHydratedSettings, preferences, tripDays, tripEndDate, tripStartDate, plannedRides, plannedBreaks, selectedDate]);

  const addRide = async (ride: RideWaitTime, date: string, selectedShowtimeHour?: number) => {
    setPlannedRides((prev) => {
      if (prev.some(r => r.id === ride.id && r.date === date)) return prev;
      const newRide = { ...ride, date };
      if (selectedShowtimeHour !== undefined) {
        (newRide as any).selectedShowtimeHour = selectedShowtimeHour;
      }
      return [...prev, newRide];
    });

    if (session?.user && activeTripId) {
      await supabase.from('planned_rides').insert({
        trip_id: activeTripId,
        ride_id: ride.id,
        ride_name: ride.name,
        showtime_hour: selectedShowtimeHour,
        date
      });
    }
  };

  const removeRide = async (rideId: string, date: string) => {
    setPlannedRides((prev) => prev.filter((r) => !(r.id === rideId && r.date === date)));

    if (session?.user && activeTripId) {
      await supabase.from('planned_rides').delete().eq('trip_id', activeTripId).eq('ride_id', rideId).eq('date', date);
    }
  };

  const isPlanned = (rideId: string, date: string) => {
    return plannedRides.some((r) => r.id === rideId && r.date === date);
  };

  const addBreak = async (brk: PlannedBreak, date: string) => {
    const newBreak = { ...brk, date };
    setPlannedBreaks((prev) => [...prev, newBreak]);

    if (session?.user && activeTripId) {
      await supabase.from('planned_breaks').insert({
        trip_id: activeTripId,
        name: brk.name,
        start_time_hour: brk.startTimeHour,
        duration_hours: brk.durationHours,
        date
      });
    }
  };

  const removeBreak = async (breakId: string) => {
    setPlannedBreaks((prev) => prev.filter(b => b.id !== breakId));

    if (session?.user && activeTripId) {
      await supabase.from('planned_breaks').delete().eq('id', breakId);
    }
  };

  const setTripDates = async (startDate: string, endDate: string) => {
    setTripStartDate(startDate);
    setTripEndDate(endDate);
    const newDays = buildTripDays(startDate, endDate, tripDays);
    setTripDays(newDays);
    
    // Ensure selectedDate is still valid
    if (selectedDate < startDate || selectedDate > endDate) {
      setSelectedDate(startDate);
    }

    if (session?.user && activeTripId) {
      await supabase.from('trips').update({ start_date: startDate, end_date: endDate }).eq('id', activeTripId);
      
      // Update trip days (delete old, insert new for simplicity or upsert)
      await supabase.from('trip_days').delete().eq('trip_id', activeTripId);
      await supabase.from('trip_days').insert(newDays.map(d => ({
        trip_id: activeTripId,
        date: d.date,
        park_id: d.park_id
      })));
    }
  };

  const updateTripDayPark = async (date: string, parkId: string) => {
    setTripDays((prev) => prev.map((day) => day.date === date ? { ...day, parkId } : day));

    if (session?.user && activeTripId) {
      await supabase.from('trip_days').upsert({
        trip_id: activeTripId,
        date,
        park_id: parkId
      }, { onConflict: 'trip_id,date' });
    }
  };

  const updatePreference = <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <PlanContext.Provider value={{ 
      plannedRides, addRide, removeRide, isPlanned,
      plannedBreaks, addBreak, removeBreak,
      tripStartDate, tripEndDate, tripDays, setTripDates, updateTripDayPark,
      preferences, updatePreference, isLoading,
      selectedDate, setSelectedDate
    }}>
      {children}
    </PlanContext.Provider>
  );
};

export const usePlan = () => {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
};
