import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

type AuthContextType = {
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  completeOAuthSession: (url: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getRedirectUrl = () => Linking.createURL('auth/callback');

const getParamFromUrl = (url: string, key: string) => {
  const parsed = new URL(url);
  const queryValue = parsed.searchParams.get(key);
  if (queryValue) return queryValue;

  const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  return hashParams.get(key);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const completeOAuthSession = useCallback(async (url: string) => {
    const error = getParamFromUrl(url, 'error_description') ?? getParamFromUrl(url, 'error');
    if (error) {
      throw new Error(decodeURIComponent(error));
    }

    const code = getParamFromUrl(url, 'code');
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
      return;
    }

    const accessToken = getParamFromUrl(url, 'access_token');
    const refreshToken = getParamFromUrl(url, 'refresh_token');

    if (accessToken && refreshToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) throw sessionError;
      return;
    }

    throw new Error('Google did not return a usable auth session.');
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = getRedirectUrl();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (!data.url) throw new Error('Supabase did not return a Google login URL.');

    if (Platform.OS === 'web') {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success') {
        await completeOAuthSession(result.url);
      }
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success') {
      await completeOAuthSession(result.url);
    }
  }, [completeOAuthSession]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo(() => ({
    session,
    isLoading,
    signInWithGoogle,
    signOut,
    completeOAuthSession,
  }), [completeOAuthSession, isLoading, session, signInWithGoogle, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
