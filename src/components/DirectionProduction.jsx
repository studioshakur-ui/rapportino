import React, { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'

export default function DirectionProduction({
  archivio,
  objectives,
  setObjectives,
  onBack,
}) {
  const [totalTarget, setTotalTarget] = useState(60000)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const productionDaily = useMemo(() => {
    const items = Object.values(archivio)
      .filter(x => x?.rapportino?.totaleProdotto)
      .map(x => ({
        date: x.data,
        metri: Number(x.rapportino.totaleProdotto || 0),
        commessa: x.rapportino.commessa || '',
        capo: x.capo,
        role: x.role,
      }))
      .sort((a,b) => a.date.localeCompare(b.date))

    return items
  }, [archivio])

  const filtered = productionDaily.filter(d => {
    if (startDate && d.date < startDate) return false
    if (endDate && d.date > endDate) return false
    return true
  })

  const chartData = useMemo(() => {
    let cumReal = 0
    const days = filtered.map((d, i) => {
      cumReal += d.metri
      const cumTarget = ((i + 1) / Math.max(filtered.length, 1)) * totalTarget
      const delta = cumReal - cumTarget
      return {
        date: d.date.slice(5),
        realDaily: d.metri,
        realCum: Math.round(cumReal),
        targetCum: Math.round(cumTarget),
        delta: Math.round(delta),
      }
    })
    return days
  }, [filtered, totalTarget])

  const realCumLast = chartData.at(-1)?.realCum || 0
  const targetCumLast = chartData.at(-1)?.targetCum || 0
  const avancePct = totalTarget ? (realCumLast / totalTarget) * 100 : 0
  const retard = realCumLast - targetCumLast

  const eta = useMemo(() => {
    if (chartData.length < 3) return null
    const avg = realCumLast / chartData.length
    if (avg <= 0) return null
    const remaining = totalTarget - realCumLast
    const daysNeeded = Math.ceil(remaining / avg)
    const lastDate = filtered.at(-1)?.date
    if (!lastDate) return null
    const dt = new Date(lastDate)
    dt.setDate(dt.getDate() + daysNeeded)
    return dt.toISOString().slice(0,10)
  }, [chartData, filtered, totalTarget, realCumLast])

  const saveObjective = () => {
    if (!totalTarget || !startDate || !endDate) return alert('Compila tutti i campi')
    const newObj = {
      id: Date.now(),
      totalTarget,
      startDate,
      endDate,
      createdAt: new Date().toISOString(),
    }
    setObjectives([newObj, ...objectives])
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-xs text-slate-500 hover:text-slate-800">
              ← Home
            </button>
            <h1 className="text-lg font-semibold">Produzione / Obiettivi</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full px-4 py-4 flex flex-col gap-4">
        {/* input obiettivo */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <label className="flex flex-col gap-1">
            Obiettivo totale (m)
            <input
              type="number"
              className="border rounded px-2 py-1"
              value={totalTarget}
              onChange={e => setTotalTarget(Number(e.target.value))}
            />
          </label>
          <label className="flex flex-col gap-1">
            Data inizio
            <input
              type="date"
              className="border rounded px-2 py-1"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            Data fine
            <input
              type="date"
              className="border rounded px-2 py-1"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </label>
          <div className="flex items-end">
            <button
              onClick={saveObjective}
              className="w-full px-3 py-2 rounded bg-indigo-700 text-white hover:bg-indigo-800"
            >
              Salva obiettivo
            </button>
          </div>
        </div>

        {/* KPI */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="text-slate-500">Avanzamento</div>
            <div className="font-semibold text-lg">
              {realCumLast} / {totalTarget} m ({avancePct.toFixed(1)}%)
            </div>
          </div>
          <div>
            <div className="text-slate-500">Delta</div>
            <div className={`font-semibold text-lg ${retard >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {retard >= 0 ? '+' : ''}{retard} m
            </div>
          </div>
          <div>
            <div className="text-slate-500">Produzione media</div>
            <div className="font-semibold text-lg">
              {(chartData.length ? (realCumLast / chartData.length) : 0).toFixed(1)} m/giorno
            </div>
          </div>
          <div>
            <div className="text-slate-500">Fine stimata (ETA)</div>
            <div className="font-semibold text-lg">
              {eta || '—'}
            </div>
          </div>
        </div>

        {/* chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="text-sm font-semibold mb-2">
            Produzione cumulata vs Obiettivo
          </div>
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="targetCum" name="Obiettivo cumulato" strokeWidth={2} />
                <Line type="monotone" dataKey="realCum" name="Produzione reale cumulata" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* liste objectifs */}
        {objectives.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-xs">
            <div className="font-semibold mb-2">Obiettivi salvati</div>
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-2 py-1 text-left">Target</th>
                  <th className="px-2 py-1 text-left">Start</th>
                  <th className="px-2 py-1 text-left">End</th>
                  <th className="px-2 py-1 text-left">Creato</th>
                </tr>
              </thead>
              <tbody>
                {objectives.map(o => (
                  <tr key={o.id} className="border-t">
                    <td className="px-2 py-1">{o.totalTarget} m</td>
                    <td className="px-2 py-1">{o.startDate}</td>
                    <td className="px-2 py-1">{o.endDate}</td>
                    <td className="px-2 py-1">{o.createdAt.slice(0,10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
