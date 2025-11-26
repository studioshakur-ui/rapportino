import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import LoadingScreen from './components/LoadingScreen';
import Login from './pages/Login';
import RoleSelect from './components/RoleSelect';
import RapportinoPage from './components/RapportinoPage';

const CREW_VALUES = ['ELETTRICISTA', 'CARPENTERIA', 'MONTAGGIO'];

function CoreApp() {
  const { session, profile, loading, error, signOut } = useAuth();
  const [crewRole, setCrewRole] = useState(null);

  // Lire la squadra depuis localStorage au démarrage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = window.localStorage.getItem('core_crew_role');
      if (CREW_VALUES.includes(stored)) {
        setCrewRole(stored);
      }
    } catch (e) {
      console.error('Erreur lecture core_crew_role:', e);
    }
  }, []);

  const handleSelectCrewRole = (role) => {
    setCrewRole(role);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('core_crew_role', role);
      } catch (e) {
        console.error('Erreur écriture core_crew_role:', e);
      }
    }
  };

  const handleChangeCrewRole = () => {
    setCrewRole(null);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('core_crew_role');
      } catch (e) {
        console.error('Erreur suppression core_crew_role:', e);
      }
    }
  };

  const handleLogout = async () => {
    await signOut();
    handleChangeCrewRole();
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Login globalError={error} />;
  }

  if (!profile) {
    return <LoadingScreen message="Chargement du profil..." />;
  }

  if (!crewRole) {
    return <RoleSelect onSelect={handleSelectCrewRole} />;
  }

  return (
    <RapportinoPage
      crewRole={crewRole}
      onChangeCrewRole={handleChangeCrewRole}
      onLogout={handleLogout}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CoreApp />
    </AuthProvider>
  );
}
