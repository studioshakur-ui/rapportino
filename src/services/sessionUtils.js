// src/services/sessionUtils.js
import { supabase } from '../lib/supabaseClient';

export async function resetBrowserSession() {
  try {
    // 1) Déconnexion Supabase
    await supabase.auth.signOut();
  } catch (e) {
    console.error('Erreur pendant signOut', e);
  }

  try {
    // 2) Nettoyage du navigateur pour CORE
    localStorage.removeItem('core_crew_role');
    localStorage.removeItem('core_rapportino_cache');
    localStorage.removeItem('core_last_costr');
    // si tu as d’autres clés spécifiques à CORE, tu peux les ajouter ici
  } catch (e) {
    console.error('Erreur pendant le nettoyage du localStorage', e);
  }

  // 3) Reload propre
  window.location.href = '/';
}
