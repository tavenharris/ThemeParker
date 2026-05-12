import { Platform } from 'react-native';
import { supabase } from './supabase';

export interface Park {
  id: string;
  name: string;
}

export const WDW_PARKS: Park[] = [
  { id: '75ea578a-adc8-4116-a54d-dccb60765ef9', name: 'Magic Kingdom Park' },
  { id: '47f90d2c-e191-4239-a466-5892ef59a88b', name: 'EPCOT' },
  { id: '288747d1-8b4f-4a64-867e-ea7c9b27bad8', name: "Disney's Hollywood Studios" },
  { id: '1c84a229-8862-4648-9c71-378ddd2c7693', name: "Disney's Animal Kingdom Theme Park" },
];

export interface Showtime {
  type: string;
  startTime: string;
  endTime: string;
}

export interface RideWaitTime {
  id: string;
  name: string;
  entityType: string;
  status: string;
  queue?: {
    STANDBY?: {
      waitTime: number;
    };
    SINGLE_RIDER?: {
      waitTime: number;
    };
    RETURN_TIME?: {
      state: string;
      returnStart: string;
      returnEnd: string;
    };
  };
  showtimes?: Showtime[];
}

const getApiUrl = (parkId: string) => {
  const url = `https://api.themeparks.wiki/v1/entity/${parkId}/live`;
  // Use a reliable CORS proxy for Web. 
  // We'll use corsproxy.io as it's often more reliable than allorigins for this specific API.
  return Platform.OS === 'web' ? `https://corsproxy.io/?${encodeURIComponent(url)}` : url;
};

const logWaitTimesToSupabase = async (parkId: string, rides: RideWaitTime[]) => {
  const logs = rides
    .filter(r => r.entityType === 'ATTRACTION')
    .map(ride => ({
      ride_id: ride.id,
      park_id: parkId,
      wait_time: ride.queue?.STANDBY?.waitTime || 0,
      status: ride.status,
    }));

  if (logs.length === 0) {
    return;
  }

  try {
    const { data, error } = await supabase
      .from('wait_times')
      .insert(logs)
      .select('id');
    
    if (error) {
      if (error.code === '42501') {
        console.error(`[Supabase] RLS Policy Violation for ${parkId}. Please ensure 'wait_times' table has INSERT policies enabled for public access.`);
      } else {
        console.error(`[Supabase] Insert Error [${parkId}]:`, error.message);
      }
    } else {
      console.log(`[Supabase] Successfully logged ${data?.length} wait times for ${parkId}`);
    }
  } catch (err) {
    console.error('[Supabase] Catch error:', err);
  }
};

/**
 * Fetches and logs wait times for ALL parks to Supabase.
 * This helps build a comprehensive historical dataset regardless of which park the user is viewing.
 */
export const logAllParksToSupabase = async () => {
  console.log('[Sync] Starting background sync for all parks...');
  for (const park of WDW_PARKS) {
    try {
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await fetch(getApiUrl(park.id));
      if (response.ok) {
        const data = await response.json();
        const items = data.liveData?.filter((item: RideWaitTime) => item.entityType === 'ATTRACTION') || [];
        await logWaitTimesToSupabase(park.id, items);
      } else {
        console.error(`[Sync] API response not OK for ${park.name}: ${response.status}`);
      }
    } catch (err) {
      console.error(`[Sync] Failed to background sync ${park.name}:`, err);
    }
  }
  console.log('[Sync] Background sync complete.');
};

export interface HourlyAverage {
  hour: number;
  averageWait: number;
}

export const getHistoricalWaitTimes = async (rideId: string): Promise<HourlyAverage[]> => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('wait_times')
      .select('wait_time, created_at')
      .eq('ride_id', rideId)
      .eq('status', 'OPERATING')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const hourlyWaits: Record<number, number[]> = {};

    data.forEach((row) => {
      const date = new Date(row.created_at);
      const hour = date.getHours(); 
      if (!hourlyWaits[hour]) hourlyWaits[hour] = [];
      hourlyWaits[hour].push(row.wait_time);
    });

    const averages: HourlyAverage[] = Object.keys(hourlyWaits).map(hourStr => {
      const hour = parseInt(hourStr, 10);
      const waits = hourlyWaits[hour];
      const avg = waits.reduce((a, b) => a + b, 0) / waits.length;
      return { hour, averageWait: Math.round(avg) };
    });

    return averages.sort((a, b) => a.hour - b.hour);
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return [];
  }
};

export const fetchWaitTimes = async (parkId: string): Promise<RideWaitTime[]> => {
  try {
    const response = await fetch(getApiUrl(parkId));
    if (!response.ok) {
      throw new Error(`Error fetching wait times: ${response.statusText}`);
    }
    const data = await response.json();
    const items = data.liveData?.filter((item: RideWaitTime) => item.entityType === 'ATTRACTION' || item.entityType === 'SHOW') || [];
    
    // Log to our database for historical tracking (using await to ensure it completes)
    await logWaitTimesToSupabase(parkId, items);
    
    return items;
  } catch (error) {
    console.error('fetchWaitTimes error:', error);
    return [];
  }
};

