// src/roleOptions.js

// Tous les rôles gérés par Rapportino
export const ROLE_OPTIONS = [
  { key: 'ELETTRICISTA', label: 'Elettricista' },
  { key: 'CARPENTERIA', label: 'Carpenteria' },
  { key: 'MONTAGGIO', label: 'Montaggio' },
]

// Petit helper pratique (si besoin)
export function getRoleLabel(key) {
  const found = ROLE_OPTIONS.find(r => r.key === key)
  return found ? found.label : key
}
