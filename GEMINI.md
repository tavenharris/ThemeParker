# Disney Planner Project Overview

## Project Structure

This is an Expo/React Native application designed to show and plan Disney park ride wait times. The project uses standard Expo Router structure:

*   **`app/`**: Contains the Expo Router file-based routing.
    *   `app/(tabs)/`: Main tabbed interface (e.g., `index.tsx` for parks, `plan.tsx` for the user's plan).
    *   `app/ride/[id].tsx`: Detail screen for a specific ride.
*   **`src/`**: Core logic and integrations.
    *   `src/api.ts`: Handles fetching live wait times from the ThemeParks.wiki API and logging/fetching historical data from Supabase.
    *   `src/supabase.ts`: Supabase client configuration.
    *   `src/PlanContext.tsx`: React Context for managing the user's planned rides state.
*   **`components/`**: Reusable UI components.
*   **`assets/`**: Images, icons, and fonts used in the app.
*   **`seed.js`**: A Node.js script using the `pg` library to populate the database with mock historical data.

## Supabase Setup

Supabase is configured in `src/supabase.ts`. It initializes the `@supabase/supabase-js` client using Expo environment variables:
*   `EXPO_PUBLIC_SUPABASE_URL`
*   `EXPO_PUBLIC_SUPABASE_ANON_KEY`

It employs a `CustomStorageAdapter` utilizing `@react-native-async-storage/async-storage` for persisting authentication sessions across mobile and web platforms.

## Data Logging & Flow

The app fetches live wait times from the ThemeParks API (`https://api.themeparks.wiki/v1/entity/{parkId}/live`). 

When data is fetched, the `logWaitTimesToSupabase` function (in `src/api.ts`) automatically intercepts the successful payload and asynchronously pushes it to a Supabase table named **`wait_times`**.

### Data Pushed to Supabase

The payload inserted into the `wait_times` table contains:
*   **`ride_id`**: The unique identifier for the attraction.
*   **`park_id`**: The ID of the specific Walt Disney World park.
*   **`wait_time`**: The current standby wait time in minutes (`ride.queue.STANDBY.waitTime` or `0`).
*   **`status`**: The operational status of the ride (e.g., 'OPERATING', 'DOWN').

### Historical Data Usage
The application can also read from this `wait_times` table using the `getHistoricalWaitTimes(rideId)` function. It filters for records where `status = 'OPERATING'` and aggregates the wait times to generate hourly averages, creating a historical trend for each ride.
