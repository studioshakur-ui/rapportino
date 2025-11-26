import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Init auth + profile
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const currentSession = data.session;
        setSession(currentSession || null);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id, mounted);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error('Erreur init auth:', err);
        setError('Erreur de connexion. Merci de vous reconnecter.');
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await fetchProfile(newSession.user.id, true);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId, mounted = true) {
    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && status !== 406) throw error;

      if (!data) {
        // Créer un profil de base si inexistant
        const { data: userData, error: getUserError } = await supabase.auth.getUser();
        if (getUserError) throw getUserError;

        const authUser = userData.user;
        const email = authUser?.email ?? '';
        const displayName =
          authUser?.user_metadata?.full_name ||
          authUser?.user_metadata?.name ||
          email;

        const { data: inserted, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email,
            display_name: displayName,
            app_role: 'CAPO'
          })
          .select('*')
          .single();

        if (insertError) throw insertError;
        if (mounted) setProfile(inserted);
      } else {
        if (mounted) setProfile(data);
      }
    } catch (err) {
      console.error('Erreur chargement profil:', err);
      if (mounted) setError('Impossible de charger votre profil. Merci de vous reconnecter.');

      // On force la déconnexion pour éviter les blocages
      try {
        await supabase.auth.signOut();
      } catch (signOutErr) {
        console.error('Erreur pendant signOut:', signOutErr);
      }

      if (mounted) {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const value = {
    session,
    user,
    profile,
    loading,
    error,
    signOut,
    refreshProfile: () => user && fetchProfile(user.id)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}
