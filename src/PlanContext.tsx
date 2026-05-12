import React, { createContext, useState, useContext, ReactNode } from 'react';
import { RideWaitTime } from './api';

interface PlanContextType {
  plannedRides: RideWaitTime[];
  addRide: (ride: RideWaitTime) => void;
  removeRide: (rideId: string) => void;
  isPlanned: (rideId: string) => boolean;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export const PlanProvider = ({ children }: { children: ReactNode }) => {
  const [plannedRides, setPlannedRides] = useState<RideWaitTime[]>([]);

  const addRide = (ride: RideWaitTime) => {
    setPlannedRides((prev) => {
      if (prev.some(r => r.id === ride.id)) return prev;
      return [...prev, ride];
    });
  };

  const removeRide = (rideId: string) => {
    setPlannedRides((prev) => prev.filter((r) => r.id !== rideId));
  };

  const isPlanned = (rideId: string) => {
    return plannedRides.some((r) => r.id === rideId);
  };

  return (
    <PlanContext.Provider value={{ plannedRides, addRide, removeRide, isPlanned }}>
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
