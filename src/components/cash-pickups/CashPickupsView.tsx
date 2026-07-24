'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, Camera, Check, Loader2, ShieldCheck } from 'lucide-react'

type Station = { id: string; name: string }
type Pickup = {
  id: string
  amount: number
  picked_up_by: string
  evidence_url: string | null
  remarks: string | null
  flagged: boolean
  resolved_at: string | null
  resolution_notes: string | null
  pickup_time: string
}

export default function CashPickupsView({
  orgId, userId, userName, stations, lockedStationId,
}: {
  orgId: string; userId: string; userName: string
  stations: Station[]; lockedStationId: string | null
}) {
  const supabase = createClient()
  const [stationId, setStationId] = useState(lockedStationId ?? stations[0]?.id ?? '')
  const [pickups, setPickups] = useState<Pickup[]>([])
  const [evidenceUrls, setEvidenceUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!stationId) return
    setLoading(true)
    setError('')
    const { data } = await supabase
      .from('cash_pickups')
      .select('*')
      .eq('station_id', stationId)
      .order('pickup_time', { ascending: false })
      .limit(30)
    setPickups(data ?? [])
    setLoading(false)
  }, [stationId, supabase])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  useEffect(() => {
    const withEvidence = pickups.filter(p => p.evidence_url && !evidenceUrls[p.evidence_url])
    if (withEvidence.length === 0) return
    ;(async () => {
      const entries = await Promise.all(
        withEvidence.map(async p => {
          const { data } = await supabase.storage.from('cash-pickup-evidence').createSignedUrl(p.evidence_url as string, 3600)
          return [p.evidence_url as string, data?.signedUrl ?? ''] as const
        })
      )
      setEvidenceUrls(prev => ({ ...prev, ...Object.fromEntries(entries) }))
    })()
  }, [pickups, supabase, evidenceUrls])

  const stationName = stations.find(s => s.id === stationId)?.name ?? ''

  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-400">Logged in as {userName}</p>
      <div className="flex flex-wrap items-center gap-3">
        {lockedStationId ? (
          <span className="text-sm font-medium text-gray-700">{stationName}</span>
        ) : (
          <select value={stationId} onChange={e => setStationId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600">
            {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

      <NewPickupForm orgId={orgId} stationId={stationId} userId={userId} supabase={supabase} onSaved={load} />

      {loading ? (
        <div className="text-sm text-gray-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : pickups.length === 0 ? (
        <p className="text-sm text-gray-400">No pickups logged yet.</p>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm divide-y divide-gray-50">
          {pickups.map(p => (
            <div key={p.id} className="px-5 py-3 flex items-center gap-4">
              {p.evidence_url && evidenceUrls[p.evidence_url] && (
                <a href={evidenceUrls[p.evidence_url]} target="_blank" rel="noreferrer">
                  <img src={evidenceUrls[p.evidence_url]} alt="Evidence" className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                </a>
              )}
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
                  ₱{Number(p.amount).toLocaleString()} — {p.picked_up_by}
                  {p.flagged && !p.resolved_at && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide bg-red-50 text-red-700 rounded-full px-2 py-0.5">
                      <AlertTriangle className="w-3 h-3" /> Flagged
                    </span>
                  )}
                  {p.resolved_at && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide bg-green-50 text-green-700 rounded-full px-2 py-0.5">
                      <ShieldCheck className="w-3 h-3" /> Resolved
                    </span>
                  )}
                </div>
                {p.remarks && <div className="text-xs text-gray-500">{p.remarks}</div>}
              </div>
              <div className="text-xs text-gray-400">{new Date(p.pickup_time).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NewPickupForm({
  orgId, stationId, userId, supabase, onSaved,
}: {
  orgId: string; stationId: string; userId: string
  supabase: ReturnType<typeof createClient>; onSaved: () => void
}) {
  const [amount, setAmount] = useState('')
  const [pickedUpBy, setPickedUpBy] = useState('')
  const [remarks, setRemarks] = useState('')
  const [evidence, setEvidence] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (amount === '' || !pickedUpBy.trim()) { setErr('Amount and who picked it up are required.'); return }
    setSaving(true)
    setErr('')
    try {
      let evidenceUrl: string | null = null
      if (evidence) {
        const path = `${orgId}/${stationId}/${Date.now()}-${evidence.name}`
        const { error: uploadErr } = await supabase.storage.from('cash-pickup-evidence').upload(path, evidence)
        if (uploadErr) throw new Error(uploadErr.message)
        evidenceUrl = path
      }
      const { error: insertErr } = await supabase.from('cash_pickups').insert({
        org_id: orgId,
        station_id: stationId,
        amount: Number(amount),
        picked_up_by: pickedUpBy.trim(),
        evidence_url: evidenceUrl,
        remarks: remarks.trim() || null,
        logged_by: userId,
        flagged: false,
        pickup_time: new Date().toISOString(),
      })
      if (insertErr) throw new Error(insertErr.message)
      setAmount(''); setPickedUpBy(''); setRemarks(''); setEvidence(null)
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save pickup.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-5 py-4 space-y-3">
      <div className="text-sm font-semibold text-gray-800">Log pickup</div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <input type="number" step="0.01" placeholder="Amount (₱)" value={amount} onChange={e => setAmount(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
        <input placeholder="Picked up by" value={pickedUpBy} onChange={e => setPickedUpBy(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm col-span-2 md:col-span-1 focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
        <input placeholder="Remarks (optional)" value={remarks} onChange={e => setRemarks(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm col-span-2 focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
      </div>
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50">
          <Camera className="w-4 h-4" />
          {evidence ? evidence.name : 'Evidence photo (optional)'}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setEvidence(e.target.files?.[0] ?? null)} />
        </label>
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-1.5 bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save pickup
        </button>
      </div>
      {err && <div className="text-xs text-red-600">{err}</div>}
    </div>
  )
}
