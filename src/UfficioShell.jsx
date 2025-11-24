import React, { useEffect, useState } from 'react'
import UfficioList from './components/UfficioList'
import UfficioDetail from './components/UfficioDetail'
import ConnectionIndicator from './components/ConnectionIndicator'
import { useAuth } from './auth/AuthProvider'
import { listArchivio } from './services/api'

export default function UfficioShell() {
  const { user, profile, signOut } = useAuth()
  const [view, setView] = useState('list')
  const [selectedKey, setSelectedKey] = useState(null)
  const [archivio, setArchivio] = useState({})

  useEffect(() => {
    const run = async () => {
      const list = await listArchivio()
      const obj = list.reduce((acc,r)=>({ ...acc, [r.id]: r }), {})
      setArchivio(obj)
    }
    run()
  }, [])

  if (view === 'detail' && selectedKey) {
    return (
      <>
        <div className="no-print bg-white border-b shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="text-xs text-slate-600">
              Logged as <b>{profile?.full_name}</b> (UFFICIO)
            </div>
            <div className="flex items-center gap-3">
              <ConnectionIndicator />
              <button onClick={signOut} className="text-xs px-2 py-1 border rounded">
                Logout
              </button>
            </div>
          </div>
        </div>

        <UfficioDetail
          archivio={archivio}
          setArchivio={setArchivio}
          ufficioUser={profile?.full_name || user.email}
          reportKey={selectedKey}
          onBack={() => setView('list')}
        />
      </>
    )
  }

  return (
    <>
      <div className="no-print bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            Logged as <b>{profile?.full_name}</b> (UFFICIO)
          </div>
          <div className="flex items-center gap-3">
            <ConnectionIndicator />
            <button onClick={signOut} className="text-xs px-2 py-1 border rounded">
              Logout
            </button>
          </div>
        </div>
      </div>

      <UfficioList
        archivio={archivio}
        ufficioUser={profile?.full_name || user.email}
        onBack={() => {}}
        onSelect={(key) => {
          setSelectedKey(key)
          setView('detail')
        }}
      />
    </>
  )
}
