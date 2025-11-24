
import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ConnectionIndicator() {
  const [ok, setOk] = useState(true)

  useEffect(() => {
    let alive = true

    const tick = async () => {
      try {
        const { data, error } = await supabase.rpc('ping')
        if (!alive) return
        setOk(!error && data?.ok === true)
      } catch (e) {
        if (!alive) return
        setOk(false)
      }
    }

    tick()
    const id = setInterval(tick, 15000)

    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full ${
          ok ? 'bg-emerald-500' : 'bg-rose-500'
        }`}
      />
      <span className="text-slate-600">
        {ok ? 'Online' : 'Offline'}
      </span>
    </div>
  )
}
