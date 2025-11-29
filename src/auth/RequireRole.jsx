// src/auth/RequireRole.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import LoadingScreen from '../components/LoadingScreen';

/**
 * Composant de garde de route basé sur les rôles applicatifs.
 *
 * allow: tableau de rôles autorisés, ex:
 *   - ['CAPO']
 *   - ['UFFICIO', 'DIREZIONE']
 */
export default function RequireRole({ allow, children }) {
  const { loading, session, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    // Pas de session → vers login
    if (!session) {
      navigate('/login', { replace: true });
      return;
    }

    // On attend que le profil soit chargé
    if (!profile) return;

    // Vérification du rôle
    if (allow && allow.length > 0 && !allow.includes(profile.app_role)) {
      if (profile.app_role === 'UFFICIO') {
        navigate('/ufficio', { replace: true });
      } else if (profile.app_role === 'DIREZIONE') {
        navigate('/direction', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [loading, session, profile, allow, navigate]);

  // Phase de chargement initial ou profil pas encore là
  if (loading || !session || !profile) {
    return <LoadingScreen message="Caricamento..." />;
  }

  // Rôle non autorisé → on est en train de rediriger
  if (allow && allow.length > 0 && !allow.includes(profile.app_role)) {
    return <LoadingScreen message="Reindirizzamento..." />;
  }

  // Tout est OK → on rend l'UI protégée
  return <>{children}</>;
}
