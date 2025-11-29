// src/AppShell.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from './auth/AuthProvider';
import LoadingScreen from './components/LoadingScreen';
import RoleSelect from './components/RoleSelect';
import RapportinoPage from './components/RapportinoPage';

// Valeurs possibles de crew_role
const CREW_VALUES = ['ELETTRICISTA', 'CARPENTERIA', 'MONTAGGIO'];

export default function AppShell() {
  const { profile, loading, signOut } = useAuth();
  const [crewRole, setCrewRole] = useState(null);

  // Lecture du tipo squadra depuis localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = window.localStorage.getItem('core_crew_role');
      if (stored && CREW_VALUES.includes(stored)) {
        setCrewRole(stored);
      }
    } catch (e) {
      console.error('Errore lettura core_crew_role:', e);
    }
  }, []);

  const handleSelectCrewRole = (role) => {
    setCrewRole(role);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('core_crew_role', role);
      } catch (e) {
        console.error('Errore scrittura core_crew_role:', e);
      }
    }
  };

  const handleChangeCrewRole = () => {
    setCrewRole(null);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('core_crew_role');
      } catch (e) {
        console.error('Errore rimozione core_crew_role:', e);
      }
    }
  };

  const handleLogout = async () => {
    await signOut();
    handleChangeCrewRole();
  };

  if (loading || !profile) {
    return <LoadingScreen message="Caricamento del profilo..." />;
  }

  // Pas encore de tipo squadra choisi → écran de sélection
  if (!crewRole) {
    return <RoleSelect onSelect={handleSelectCrewRole} />;
  }

  // Shell CAPO : on délègue l'UI principale à RapportinoPage
  return (
    <RapportinoPage
      crewRole={crewRole}
      onChangeCrewRole={handleChangeCrewRole}
      onLogout={handleLogout}
    />
  );
}
