'use client'

import { useState } from 'react'

// One-time setup page — creates user_profiles after auth users are added in Supabase dashboard.
// Visit /setup, paste the user UUID + pick role + station, submit.
// Remove this route before public launch.

const ROLES = ['ceo', 'ops_officer', 'owner', 'assistant', 'tl']
const ORG_ID = '00000000-0000-0000-0000-000000000001' // Helium Fuels

export default function SetupPage() {
  const [uuid, setUuid] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('assistant')
  const [stationId, setStationId] = useState('')
  const [stations, setStations] = useState<{ id: string; name: string }[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const [stationsLoaded, setStationsLoaded] = useState(false)

  async function loadStations() {
    const res = await fetch('/api/setup/stations')
    const data = await res.json()
    setStations(data.stations ?? [])
    setStationsLoaded(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setMsg('')
    const res = await fetch('/api/setup/create-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: uuid.trim(),
        org_id: ORG_ID,
        role,
        full_name: name.trim(),
        email: email.trim(),
        station_id: role === 'tl' && stationId ? stationId : null,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setStatus('done')
      setMsg(`Profile created for ${name}`)
      setUuid(''); setName(''); setEmail(''); setRole('assistant'); setStationId('')
    } else {
      setStatus('error')
      setMsg(data.error ?? 'Unknown error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm w-full max-w-md p-8 space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">StaffVerified — First-time setup</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create user profiles after adding auth users in the Supabase dashboard.<br />
            <span className="text-red-500 font-medium">Remove /setup before going public.</span>
          </p>
        </div>

        {!stationsLoaded && (
          <button
            onClick={loadStations}
            className="w-full border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Load stations first
          </button>
        )}

        {stationsLoaded && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Auth User UUID</label>
              <input
                required
                value={uuid}
                onChange={e => setUuid(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
              <p className="text-xs text-gray-400 mt-0.5">Supabase dashboard → Authentication → Users → copy UUID</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full name</label>
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {role === 'tl' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Station (TL only)</label>
                <select
                  value={stationId}
                  onChange={e => setStationId(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="">— pick station —</option>
                  {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {status === 'loading' ? 'Creating…' : 'Create profile'}
            </button>

            {msg && (
              <p className={`text-sm text-center ${status === 'done' ? 'text-green-600' : 'text-red-600'}`}>
                {msg}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
