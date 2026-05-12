import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
};

type AuthContextType = {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  completeOAuthSession: (url: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const newProfile = {
          id: userId,
          email: userData.user.email,
          full_name: userData.user.user_metadata.full_name || userData.user.user_metadata.name,
          avatar_url: userData.user.user_metadata.avatar_url,
        };
        const { data: created, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();
        
        if (!createError) setProfile(created);
      }
    } else if (!error) {
      setProfile(data);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        fetchProfile(data.session.user.id);
      }
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        fetchProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!session?.user) return;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id);

    if (error) throw error;
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  };

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
    profile,
    isLoading,
    signInWithGoogle,
    signOut,
    completeOAuthSession,
    updateProfile,
  }), [completeOAuthSession, isLoading, profile, session, signInWithGoogle, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
