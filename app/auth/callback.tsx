import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { Redirect } from 'expo-router';
import { useAuth } from '../../src/AuthContext';

const Colors = {
  primary: '#021541',
  secondaryContainer: '#fed65b',
  surface: '#f9f9f9',
  onSurfaceVariant: '#45464f',
};

export default function AuthCallbackScreen() {
  const { session, completeOAuthSession } = useAuth();
  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const finishAuth = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          await completeOAuthSession(initialUrl);
        }
        setIsComplete(true);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to finish login.');
        setIsComplete(true);
      }
    };

    finishAuth();
  }, [completeOAuthSession]);

  if (session || (isComplete && !errorMessage)) {
    return <Redirect href="/(tabs)" />;
  }

  if (isComplete && errorMessage) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator color={Colors.primary} size="large" />
      <Text style={styles.text}>Finishing Google sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  text: {
    color: Colors.onSurfaceVariant,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 16,
  },
});
