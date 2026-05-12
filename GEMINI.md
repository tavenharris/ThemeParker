# Disney Planner Project Overview

## Project Structure

This is an Expo/React Native application designed to show and plan Disney park ride wait times. The project uses standard Expo Router structure:

*   **`app/`**: Contains the Expo Router file-based routing.
    *   `app/(tabs)/`: Main tabbed interface (e.g., `index.tsx` for parks, `plan.tsx` for the user's plan).
    *   `app/ride/[id].tsx`: Detail screen for a specific ride.
*   **`src/`**: Core logic and integrations.
    *   `src/api.ts`: Handles fetching live wait times from the ThemeParks.wiki API and logging/fetching historical data from Supabase.
    *   `src/supabase.ts`: Supabase client configuration.
    *   `src/PlanContext.tsx`: React Context for managing the user's planned rides, breaks, and trip schedule.
    *   `src/AuthContext.tsx`: Authentication state and user profile management.
*   **`components/`**: Reusable UI components.
*   **`assets/`**: Images, icons, and fonts used in the app.
*   **`seed.js`**: A Node.js script to populate the database with mock historical data.

## Supabase Schema

The application uses Supabase for authentication, user profiles, and trip data persistence.

### Tables

#### `profiles`
Stores user-specific metadata linked to Supabase Auth.
- `id` (uuid, primary key): References `auth.users`.
- `email` (text): User's email address.
- `full_name` (text): User's display name.
- `avatar_url` (text): URL to user's profile image.
- `username` (text): Unique username.

#### `trips`
Main trip containers for users.
- `id` (uuid, primary key): Unique trip ID.
- `user_id` (uuid): References `profiles.id`.
- `start_date` (date): First day of the trip.
- `end_date` (date): Last day of the trip.
- `name` (text): Name of the trip (e.g., "Family Vacation").

#### `trip_days`
Maps specific dates within a trip to a Disney park.
- `id` (uuid, primary key): Unique ID.
- `trip_id` (uuid): References `trips.id`.
- `date` (date): The specific calendar date.
- `park_id` (text): The ID of the park (e.g., Magic Kingdom).
- *Unique constraint*: `(trip_id, date)`

#### `planned_rides`
Rides added to a user's itinerary for a specific day.
- `id` (uuid, primary key): Unique ID.
- `trip_id` (uuid): References `trips.id`.
- `ride_id` (text): The API identifier for the attraction.
- `ride_name` (text): Display name of the ride.
- `date` (date): The date this ride is planned for.
- `showtime_hour` (float): Optional specific time for shows.

#### `planned_breaks`
User-defined breaks (Lunch, Rest, etc.) in the itinerary.
- `id` (uuid, primary key): Unique ID.
- `trip_id` (uuid): References `trips.id`.
- `name` (text): Name/Type of break.
- `start_time_hour` (float): Time the break starts.
- `duration_hours` (float): How long the break lasts.
- `date` (date): The date this break is planned for.

#### `wait_times`
Historical log of ride wait times fetched from the API.
- `id` (bigint, primary key): Unique log ID.
- `ride_id` (text): Attraction identifier.
- `park_id` (text): Park identifier.
- `wait_time` (int): Standby wait in minutes.
- `status` (text): Operational status (e.g., 'OPERATING').
- `created_at` (timestamp): Time the data was recorded.

## Data Logging & Flow

The app fetches live wait times from the ThemeParks API. 

1. **Active Logging**: When a user views a park, wait times are pushed to `wait_times`.
2. **Background Sync**: While the "Wait Times" screen is open, the app fetches and logs data for ALL four Walt Disney World parks every 5 minutes to build a comprehensive historical dataset.
3. **Historical Analysis**: The `getHistoricalWaitTimes` function aggregates this data to provide hourly averages for the AI optimizer.
