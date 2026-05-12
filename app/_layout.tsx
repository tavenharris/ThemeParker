import { Stack } from 'expo-router';
import { PlanProvider } from '../src/PlanContext';
import { AuthProvider } from '../src/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PlanProvider>
          <Stack>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="ride/[id]" options={{ headerShown: false }} />
          </Stack>
        </PlanProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
