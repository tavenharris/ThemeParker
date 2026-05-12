# Disney Planner 🏰

Disney Planner is a free, open-source touring plans application for Walt Disney World. It helps guests maximize their magic by tracking live wait times and organizing their park itineraries without the premium price tag of traditional planning services.

## ✨ Features

- **Live Wait Times**: Real-time data for all Walt Disney World parks (Magic Kingdom, EPCOT, Hollywood Studios, and Animal Kingdom).
- **Historical Insights**: Tracks wait time trends to help you choose the best time to ride.
- **Smart Itineraries**: Plan your rides, shows, and breaks in a unified timeline.
- **Trip Management**: Create multi-day trips and assign specific parks to each day.
- **Cross-Platform**: Built with Expo and React Native for a seamless experience on iOS and Android.

## 🛠 Tech Stack

- **Frontend**: React Native with [Expo](https://expo.dev/) (Router, Haptics, Symbols)
- **Backend**: [Supabase](https://supabase.com/) for authentication and data persistence
- **API**: ThemeParks.wiki for real-time attraction data
- **State Management**: React Context (Auth, Planning)

## 🚀 Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- [Expo Go](https://expo.dev/go) app on your mobile device or an emulator (Android Studio / Xcode)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd disney_planner
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file (if applicable) or configure your `src/supabase.ts` with your Supabase credentials.

4. **Seed Database (Optional)**
   If you want to populate your Supabase instance with mock historical data:
   ```bash
   node seed.js
   ```

### Running the App

Start the Expo development server:

```bash
npx expo start
```

- Scan the QR code with your phone to open in **Expo Go**.
- Press **i** for iOS simulator.
- Press **a** for Android emulator.

## 📁 Project Structure

- `app/`: Expo Router file-based navigation and screens.
- `src/`: Core logic, API integrations, and Supabase client.
- `components/`: Reusable UI components.
- `assets/`: Icons, images, and brand assets.

## 🤝 Contributing

Contributions are welcome! Whether it's fixing a bug, adding a feature, or improving documentation, feel free to open an issue or submit a pull request.

---

*Disclaimer: This app is not affiliated with, authorized, maintained, sponsored, or endorsed by The Walt Disney Company or any of its affiliates or subsidiaries.*
