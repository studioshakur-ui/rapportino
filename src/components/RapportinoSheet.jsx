import { useEffect, useState } from 'react';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function RapportinoSheet({ crewRole }) {
  const [date, setDate] = useState(todayISO);
  const [shift, setShift] = useState('MATTINO');
  const [activity, setActivity] = useState('');
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');

  // Charge depuis localStorage quand date ou crewRole changent
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const key = `rapportino:${crewRole}:${date}`;
    const raw = window.localStorage.getItem(key);

    if (raw) {
      try {
        const saved = JSON.parse(raw);
        setShift(saved.shift || 'MATTINO');
        setActivity(saved.activity || '');
        setHours(saved.hours || '');
        setNotes(saved.notes || '');
      } catch (e) {
        console.error('Erreur lecture rapportino localStorage:', e);
        setShift('MATTINO');
        setActivity('');
        setHours('');
        setNotes('');
      }
    } else {
      setShift('MATTINO');
      setActivity('');
      setHours('');
      setNotes('');
    }
  }, [crewRole, date]);

  // Sauvegarde automatique dans localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const key = `rapportino:${crewRole}:${date}`;
    const payload = {
      date,
      shift,
      activity,
      hours,
      notes
    };
    try {
      window.localStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {
      console.error('Erreur sauvegarde rapportino localStorage:', e);
    }
  }, [crewRole, date, shift, activity, hours, notes]);

  function handleClear() {
    if (typeof window !== 'undefined') {
      const key = `rapportino:${crewRole}:${date}`;
      window.localStorage.removeItem(key);
    }
    setShift('MATTINO');
    setActivity('');
    setHours('');
    setNotes('');
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Rapportino</h2>
          <p className="text-sm text-slate-600">
            Squadra : <span className="font-medium">{crewRole}</span>
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div>
            <label className="block text-xs text-slate-600 mb-1">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-1">Turno</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-sm"
            >
              <option value="MATTINO">Mattino</option>
              <option value="POMERIGGIO">Pomeriggio</option>
              <option value="NOTTE">Notte</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-xs text-slate-600">
            Lavorazioni / attività svolte
          </label>
          <textarea
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            rows={6}
            className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
            placeholder="Décris ici ce que la squadra a fait..."
          />
        </div>

        <div className="space-y-2">
          <div>
            <label className="block text-xs text-slate-600">
              Ore totali squadra
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
              placeholder="Ex: 8"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-600">
              Note / anomalie / materiale
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
              placeholder="Note libres..."
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 text-xs rounded border border-slate-400 text-slate-700 hover:bg-slate-100"
            >
              Effacer rapportino (jour + squadra)
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        ⚠️ Pour l’instant les rapportini sont uniquement enregistrés dans le navigateur
        (localStorage). Aucun enregistrement en base.
      </p>
    </div>
  );
}
