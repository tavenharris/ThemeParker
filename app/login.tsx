import React, { useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../src/AuthContext';

const Colors = {
  primary: '#021541',
  primaryContainer: '#1a2b56',
  secondary: '#735c00',
  secondaryContainer: '#fed65b',
  secondaryFixed: '#ffe088',
  secondaryFixedDim: '#e9c349',
  surface: '#f9f9f9',
  surfaceContainerLowest: '#ffffff',
  onPrimary: '#ffffff',
  onSurface: '#1a1c1c',
  onSurfaceVariant: '#45464f',
  outline: '#757680',
};

export default function LoginScreen() {
  const { session, isLoading, signInWithGoogle } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  if (!isLoading && session) {
    return <Redirect href="/(tabs)" />;
  }

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      Alert.alert('Google login failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1534450539339-1a787561c64d?q=80&w=1600&auto=format&fit=crop' }}
      style={styles.background}
      resizeMode="cover"
    >
      <LinearGradient colors={['rgba(2,21,65,0.95)', 'rgba(2,21,65,0.70)', 'rgba(115,92,0,0.58)']} style={styles.overlay}>
        <View style={styles.brandMark}>
          <Ionicons name="sparkles" size={28} color={Colors.secondaryContainer} />
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>Enchanted Guide</Text>
          <Text style={styles.title}>Plan the park day before the magic starts.</Text>
          <Text style={styles.subtitle}>Sign in to save trip dates, park assignments, wait-time plans, and itinerary preferences across devices.</Text>
        </View>

        <View style={styles.loginCard}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardBody}>Continue with your Google account connected to Supabase.</Text>

          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin} disabled={isSigningIn || isLoading} activeOpacity={0.85}>
            {isSigningIn || isLoading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <View style={styles.googleGlyph}>
                  <Text style={styles.googleGlyphText}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.termsText}>By continuing, you agree to keep the magic organized responsibly.</Text>
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 42,
  },
  brandMark: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(254, 214, 91, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    marginTop: 'auto',
    marginBottom: 28,
  },
  kicker: {
    color: Colors.secondaryFixedDim,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    color: Colors.onPrimary,
    fontFamily: 'Georgia',
    fontSize: 42,
    fontWeight: '700',
    lineHeight: 48,
    marginBottom: 14,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 520,
  },
  loginCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(254, 214, 91, 0.35)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  cardTitle: {
    color: Colors.primary,
    fontFamily: 'Georgia',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardBody: {
    color: Colors.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  googleButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(117,118,128,0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleGlyph: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(117,118,128,0.2)',
  },
  googleGlyphText: {
    color: '#4285F4',
    fontSize: 18,
    fontWeight: '900',
  },
  googleButtonText: {
    color: Colors.onSurface,
    fontSize: 16,
    fontWeight: '800',
  },
  termsText: {
    color: Colors.outline,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 14,
  },
});
