import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isSupabaseConfigured();

  const fetchProfile = useCallback(async (userId, userMetadata = {}) => {
    if (!isConfigured || !userId) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) console.warn('Gagal mengambil data profil:', error.message);

      if (data) {
        setProfile(data);
        return data;
      }

      // Fallback profile untuk user baru
      const fallbackProfile = {
        id: userId,
        full_name: userMetadata?.full_name || '',
        role: 'satpam',
        employee_id: '',
        shift: '',
        phone: '',
        is_active: true,
        profile_completed: false
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('profiles')
        .insert(fallbackProfile)
        .select()
        .maybeSingle();

      if (insertError) {
        const { data: retryProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (retryProfile) {
          setProfile(retryProfile);
          return retryProfile;
        }
      }

      const finalProfile = insertedData || fallbackProfile;
      setProfile(finalProfile);
      return finalProfile;
    } catch (err) {
      console.error('Error saat fetchProfile:', err);
      return null;
    }
  }, [isConfigured]);

  useEffect(() => {
    if (!isConfigured) {
      const mockProfile = {
        id: 'local-mock-001',
        full_name: 'Admin Demo',
        email: 'admin@perusahaan.com',
        role: 'admin',
        employee_id: 'EMP-001',
        shift: 'Pagi',
        phone: '081234567890',
        is_active: true,
        profile_completed: true
      };
      setUser({ id: 'local-mock-001', email: 'admin@perusahaan.com' });
      setProfile(mockProfile);
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user || null);
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id, currentSession.user.user_metadata).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user || null);
      if (currentSession?.user) {
        await fetchProfile(currentSession.user.id, currentSession.user.user_metadata);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isConfigured, fetchProfile]);

  const signUp = async ({ email, password, fullName }) => {
    if (!isConfigured) return { data: { user: { email } }, error: null };
    return supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
  };

  const signIn = async ({ email, password }) => {
    if (!isConfigured) return { data: { user: { email } }, error: null };
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (data?.user) await fetchProfile(data.user.id, data.user.user_metadata);
    return { data, error };
  };

  const signOut = async () => {
    if (isConfigured) await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const updateUserProfile = async (updates) => {
    if (!isConfigured) {
      setProfile(prev => ({ ...prev, ...updates }));
      return { data: { ...profile, ...updates }, error: null };
    }
    if (!user) return { data: null, error: new Error('User belum terautentikasi') };

    const { role, ...safeUpdates } = updates;
    const { data, error } = await supabase
      .from('profiles')
      .update(safeUpdates)
      .eq('id', user.id)
      .select()
      .maybeSingle();

    if (!error && data) setProfile(data);
    return { data, error };
  };

  const updateUserEmail = async (newEmail) => {
    if (!isConfigured) return { data: {}, error: null };
    return supabase.auth.updateUser(
      { email: newEmail.trim() },
      { emailRedirectTo: `${window.location.origin}/auth/callback` }
    );
  };

  const resetPassword = async (email) => {
    if (!isConfigured) return { data: {}, error: null };
    return supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`
    });
  };

  const updatePassword = async (newPassword) => {
    if (!isConfigured) return { data: {}, error: null };
    return supabase.auth.updateUser({ password: newPassword });
  };

  const refreshProfile = async () => {
    if (user) return await fetchProfile(user.id, user?.user_metadata);
    return null;
  };

  // Role helpers
  const isAdmin = profile?.role === 'admin';
  const isSatpam = profile?.role === 'satpam';
  const isStaff = isAdmin || isSatpam;

  return (
    <AuthContext.Provider value={{
      session, user, profile, loading, isConfigured,
      isAdmin, isSatpam, isStaff,
      signUp, signIn, signOut,
      updateUserProfile, updateUserEmail,
      resetPassword, updatePassword, refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
