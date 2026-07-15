import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase/client';
import { fetchProfileWithEntreprise } from '../services/profileService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    try {
      const data = await fetchProfileWithEntreprise(userId);
      setProfile(data);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mounted) return;
      setSession(initialSession);
      await loadProfile(initialSession?.user?.id);
      if (mounted) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setLoading(true);
      setSession(newSession);
      await loadProfile(newSession?.user?.id);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const entreprise = profile?.entreprise ?? null;
  const isSuperAdmin = profile?.role === 'super_admin';

  const isSubscriptionActive = useMemo(() => {
    if (isSuperAdmin) return true;
    if (!entreprise) return false;
    if (entreprise.statut_abonnement !== 'actif') return false;
    if (entreprise.date_expiration_abonnement) {
      return new Date(entreprise.date_expiration_abonnement) > new Date();
    }
    return true;
  }, [entreprise, isSuperAdmin]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      entreprise,
      loading,
      isSuperAdmin,
      isSubscriptionActive,
      refreshProfile: () => loadProfile(session?.user?.id),
    }),
    [session, profile, entreprise, loading, isSuperAdmin, isSubscriptionActive, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé à l’intérieur de <AuthProvider>');
  return context;
}
