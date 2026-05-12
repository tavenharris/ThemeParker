import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RideWaitTime, WDW_PARKS } from './api';

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
  plannedRides: RideWaitTime[];
  addRide: (ride: RideWaitTime, selectedShowtimeHour?: number) => void;
  removeRide: (rideId: string) => void;
  isPlanned: (rideId: string) => boolean;
  plannedBreaks: PlannedBreak[];
  addBreak: (brk: PlannedBreak) => void;
  removeBreak: (breakId: string) => void;
  tripStartDate: string;
  tripEndDate: string;
  tripDays: TripDayPlan[];
  setTripDates: (startDate: string, endDate: string) => void;
  updateTripDayPark: (date: string, parkId: string) => void;
  preferences: AppPreferences;
  updatePreference: <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => void;
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
  const [plannedRides, setPlannedRides] = useState<RideWaitTime[]>([]);
  const [plannedBreaks, setPlannedBreaks] = useState<PlannedBreak[]>([]);
  const [tripStartDate, setTripStartDate] = useState(initialStartDate);
  const [tripEndDate, setTripEndDate] = useState(initialEndDate);
  const [tripDays, setTripDays] = useState<TripDayPlan[]>(initialTripDays);
  const [preferences, setPreferences] = useState<AppPreferences>({
    notificationsEnabled: true,
    useMetricUnits: false,
    darkModeEnabled: false,
  });
  const [hasHydratedSettings, setHasHydratedSettings] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const rawSettings = await AsyncStorage.getItem(PLAN_SETTINGS_STORAGE_KEY);
        if (!rawSettings || !isMounted) return;

        const parsed = JSON.parse(rawSettings) as PersistedPlanSettings;
        const savedStartDate = typeof parsed.tripStartDate === 'string' ? parsed.tripStartDate : initialStartDate;
        const savedEndDate = typeof parsed.tripEndDate === 'string' ? parsed.tripEndDate : initialEndDate;
        const savedTripDays = Array.isArray(parsed.tripDays) && parsed.tripDays.every(isTripDayPlan)
          ? parsed.tripDays
          : buildTripDays(savedStartDate, savedEndDate);

        setTripStartDate(savedStartDate);
        setTripEndDate(savedEndDate);
        setTripDays(savedTripDays);

        if (isPreferencePatch(parsed.preferences)) {
          setPreferences((prev) => ({ ...prev, ...parsed.preferences }));
        }
      } catch (error) {
        console.error('Unable to load plan settings:', error);
      } finally {
        if (isMounted) {
          setHasHydratedSettings(true);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedSettings) return;

    AsyncStorage.setItem(PLAN_SETTINGS_STORAGE_KEY, JSON.stringify({
      tripStartDate,
      tripEndDate,
      tripDays,
      preferences,
    })).catch((error) => {
      console.error('Unable to save plan settings:', error);
    });
  }, [hasHydratedSettings, preferences, tripDays, tripEndDate, tripStartDate]);

  const addRide = (ride: RideWaitTime, selectedShowtimeHour?: number) => {
    setPlannedRides((prev) => {
      if (prev.some(r => r.id === ride.id)) return prev;
      
      const newRide = { ...ride };
      // If a specific showtime was selected, attach it to the ride object for the planner
      if (selectedShowtimeHour !== undefined) {
        (newRide as RideWaitTime & { selectedShowtimeHour?: number }).selectedShowtimeHour = selectedShowtimeHour;
      }
      
      return [...prev, newRide];
    });
  };

  const removeRide = (rideId: string) => {
    setPlannedRides((prev) => prev.filter((r) => r.id !== rideId));
  };

  const isPlanned = (rideId: string) => {
    return plannedRides.some((r) => r.id === rideId);
  };

  const addBreak = (brk: PlannedBreak) => {
    setPlannedBreaks((prev) => [...prev, brk]);
  };

  const removeBreak = (breakId: string) => {
    setPlannedBreaks((prev) => prev.filter(b => b.id !== breakId));
  };

  const setTripDates = (startDate: string, endDate: string) => {
    setTripStartDate(startDate);
    setTripEndDate(endDate);
    setTripDays((prev) => buildTripDays(startDate, endDate, prev));
  };

  const updateTripDayPark = (date: string, parkId: string) => {
    setTripDays((prev) => prev.map((day) => day.date === date ? { ...day, parkId } : day));
  };

  const updatePreference = <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <PlanContext.Provider value={{ 
      plannedRides, addRide, removeRide, isPlanned,
      plannedBreaks, addBreak, removeBreak,
      tripStartDate, tripEndDate, tripDays, setTripDates, updateTripDayPark,
      preferences, updatePreference,
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
