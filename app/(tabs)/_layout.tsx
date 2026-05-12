import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/AuthContext';
import { ActivityIndicator, View, Image, Text, StyleSheet } from 'react-native';

const Colors = {
  primary: '#021541',
  secondaryContainer: '#fed65b',
  onSecondaryContainer: '#745c00',
  surface: '#f9f9f9',
  onSurfaceVariant: '#45464f',
  surfaceBright: '#ffffff',
};

function TopHeader() {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerLeft}>
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCZhZBWsSg0PbPi3hW5UhLczusSLg1nsWfNYGF_TYyYPSgOrvV2_iwgswDZzKo5vCHUIIcFyQ41uTgmgcgmMFHlAeTwp1IoMajyLH4Qp832POCs85Qbclhr8bqL1J0txYyFV1lDlHwJOcW37XrmE20yIPW_w3bnXHGlbC48dphbe_BbtFmwsig-kjXpqwOYCLnp8SAJ8n1VxRVtLN8RvVORs2hvM6w8NhXq1ymKOWnKMrPF9xx-UI-o-W8nM7rI3oyDuYf3FFQ7LUbp' }} 
            style={styles.avatar} 
          />
        </View>
        <Text style={styles.headerTitle}>Theme Parker</Text>
      </View>
      <Ionicons name="map-outline" size={28} color={Colors.primary} />
    </View>
  );
}

export default function TabLayout() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.surface }}>
      <TopHeader />
      <Tabs screenOptions={{ 
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.onSurfaceVariant,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(255,255,255,0.9)',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#021541',
          shadowOpacity: 0.1,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -4 },
          paddingTop: 8,
          height: 85,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
          fontFamily: 'Georgia', // Using a built-in serif font for MVP
        },
        animation: 'shift',
      }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Rides',
            tabBarIcon: ({ color, focused }) => (
              <View style={focused ? styles.activeTabIcon : styles.inactiveTabIcon}>
                <Ionicons name="sparkles" size={24} color={color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="plan"
          options={{
            title: 'Itinerary',
            tabBarIcon: ({ color, focused }) => (
              <View style={focused ? styles.activeTabIcon : styles.inactiveTabIcon}>
                <Ionicons name="calendar" size={24} color={color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, focused }) => (
              <View style={focused ? styles.activeTabIcon : styles.inactiveTabIcon}>
                <Ionicons name="person-circle" size={24} color={color} />
              </View>
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50, // Safe area approx
    paddingBottom: 15,
    backgroundColor: Colors.surfaceBright,
    shadowColor: '#021541',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    zIndex: 50,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    height: 40,
    width: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ffe088',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'Georgia', // Approximating Playfair Display
  },
  activeTabIcon: {
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
  },
  inactiveTabIcon: {
    paddingHorizontal: 20,
    paddingVertical: 6,
  }
});
