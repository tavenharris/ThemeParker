import { Stack } from 'expo-router';
import { PlanProvider } from '../src/PlanContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PlanProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </PlanProvider>
    </SafeAreaProvider>
  );
}
