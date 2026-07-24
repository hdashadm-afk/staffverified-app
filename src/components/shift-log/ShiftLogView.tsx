'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, Check, Loader2, Lock, Unlock } from 'lucide-react'

type Station = { id: string; name: string }
type ShiftLog = {
  id: string
  station_id: string
  shift_date: string
  shift_type: string
  opened_by: string | null
  closed_by: string | null
  status: string
}
type Reading = {
  id: string
  tank_label: string
  reading_cm: number
  temp_c: number | null
  water_cm: number | null
  photo_url: string | null
  logged_by: string | null
  created_at: string
}
type Turnover = {
  id: string
  notes: string | null
  incoming_by: string | null
  handoff_time: string
}

const SHIFT_TYPES = ['5am-3pm', '3pm-11pm', '11pm-5am', 'Day', 'Other']

export default function ShiftLogView({
  orgId,
  userId,
  userName,
  role,
  stations,
  lockedStationId,
  today,
}: {
  orgId: string
  userId: string
  userName: string
  role: string
  stations: Station[]
  lockedStationId: string | null
  today: string
}) {
  const supabase = createClient()
  const canManage = role === 'tl' || role === 'station_ops' || role === 'owner' || role === 'ceo'
  const canClose = role === 'tl' || role === 'station_ops'

  const [stationId, setStationId] = useState(lockedStationId ?? stations[0]?.id ?? '')
  const [date, setDate] = useState(today)
  const [shiftType, setShiftType] = useState(SHIFT_TYPES[0])
  const [shiftLog, setShiftLog] = useState<ShiftLog | null>(null)
  const [readings, setReadings] = useState<Reading[]>([])
  const [turnovers, setTurnovers] = useState<Turnover[]>([])
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!stationId) return
    setLoading(true)
    setError('')
    const { data: log } = await supabase
      .from('shift_logs')
      .select('*')
      .eq('station_id', stationId)
      .eq('shift_date', date)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setShiftLog(log ?? null)

    if (log) {
      const [{ data: r }, { data: t }] = await Promise.all([
        supabase
          .from('dipstick_readings')
          .select('*')
          .eq('shift_log_id', log.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('shift_turnovers')
          .select('*')
          .eq('shift_log_id', log.id)
          .order('handoff_time', { ascending: false }),
      ])
      setReadings(r ?? [])
      setTurnovers(t ?? [])
    } else {
      setReadings([])
      setTurnovers([])
    }
    setLoading(false)
  }, [stationId, date, supabase])

  useEffect(() => {
    // Station/date are user-switchable here (unlike DTR's server-props
    // pattern), so this view re-fetches client-side on change rather
    // than via router.refresh().
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  // Signed URLs for any photo-backed readings (bucket is private).
  useEffect(() => {
    const withPhotos = readings.filter(r => r.photo_url && !photoUrls[r.photo_url])
    if (withPhotos.length === 0) return
    ;(async () => {
      const entries = await Promise.all(
        withPhotos.map(async r => {
          const { data } = await supabase.storage
            .from('dipstick-photos')
            .createSignedUrl(r.photo_url as string, 3600)
          return [r.photo_url as string, data?.signedUrl ?? ''] as const
        })
      )
      setPhotoUrls(prev => ({ ...prev, ...Object.fromEntries(entries) }))
    })()
  }, [readings, supabase, photoUrls])

  async function openShift() {
    setError('')
    const { data, error: err } = await supabase
      .from('shift_logs')
      .insert({
        org_id: orgId,
        station_id: stationId,
        shift_date: date,
        shift_type: shiftType,
        opened_by: userId,
        status: 'open',
      })
      .select()
      .single()
    if (err) { setError(err.message); return }
    setShiftLog(data)
  }

  async function closeShift() {
    if (!shiftLog) return
    setError('')
    const { error: err } = await supabase
      .from('shift_logs')
      .update({ status: 'closed', closed_by: userId })
      .eq('id', shiftLog.id)
    if (err) { setError(err.message); return }
    load()
  }

  const stationName = stations.find(s => s.id === stationId)?.name ?? ''

  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-400">Logged in as {userName}</p>
      <div className="flex flex-wrap items-center gap-3">
        {lockedStationId ? (
          <span className="text-sm font-medium text-gray-700">{stationName}</span>
        ) : (
          <select
            value={stationId}
            onChange={e => setStationId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
          >
            {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
        />
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

      {loading ? (
        <div className="text-sm text-gray-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : !shiftLog ? (
        canManage ? (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-5 py-5 space-y-3">
            <div className="text-sm font-semibold text-gray-800">No shift open for this date</div>
            <div className="flex items-center gap-3">
              <select
                value={shiftType}
                onChange={e => setShiftType(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
              >
                {SHIFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button
                onClick={openShift}
                disabled={!stationId}
                className="inline-flex items-center gap-1.5 bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-50"
              >
                <Unlock className="w-4 h-4" /> Open shift
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No shift open for this date.</p>
        )
      ) : (
        <>
          <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${shiftLog.status === 'open' ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-200'}`}>
            <div className="text-sm">
              <span className="font-medium text-gray-800">{shiftLog.shift_type}</span>
              <span className="text-gray-500"> — {shiftLog.status === 'open' ? 'Open' : 'Closed'}</span>
            </div>
            {shiftLog.status === 'open' && canClose && (
              <button
                onClick={closeShift}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                <Lock className="w-3.5 h-3.5" /> Close shift
              </button>
            )}
          </div>

          {canManage && shiftLog.status === 'open' && (
            <ReadingForm
              orgId={orgId}
              stationId={stationId}
              userId={userId}
              date={date}
              shiftLogId={shiftLog.id}
              supabase={supabase}
              onSaved={load}
            />
          )}

          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-800">Readings today</div>
            {readings.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">No readings logged yet.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {readings.map(r => (
                  <div key={r.id} className="px-5 py-3 flex items-center gap-4">
                    {r.photo_url && photoUrls[r.photo_url] && (
                      <a href={photoUrls[r.photo_url]} target="_blank" rel="noreferrer">
                        <img src={photoUrls[r.photo_url]} alt={r.tank_label} className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                      </a>
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">{r.tank_label}</div>
                      <div className="text-xs text-gray-500">
                        {r.reading_cm} cm
                        {r.water_cm != null && ` · water ${r.water_cm} cm`}
                        {r.temp_c != null && ` · ${r.temp_c}°C`}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">{new Date(r.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {canManage && shiftLog.status === 'open' && (
            <TurnoverNoteForm
              orgId={orgId}
              stationId={stationId}
              userId={userId}
              shiftLogId={shiftLog.id}
              supabase={supabase}
              onSaved={load}
            />
          )}

          {turnovers.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-800">Handoff notes</div>
              <div className="divide-y divide-gray-50">
                {turnovers.map(t => (
                  <div key={t.id} className="px-5 py-3">
                    <div className="text-sm text-gray-700">{t.notes}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{new Date(t.handoff_time).toLocaleString('en-PH')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ReadingForm({
  orgId, stationId, userId, date, shiftLogId, supabase, onSaved,
}: {
  orgId: string; stationId: string; userId: string; date: string; shiftLogId: string
  supabase: ReturnType<typeof createClient>; onSaved: () => void
}) {
  const [tankLabel, setTankLabel] = useState('')
  const [readingCm, setReadingCm] = useState('')
  const [tempC, setTempC] = useState('')
  const [waterCm, setWaterCm] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!tankLabel || readingCm === '') { setErr('Tank and reading are required.'); return }
    setSaving(true)
    setErr('')
    let photoPath: string | null = null
    if (photo) {
      photoPath = `${orgId}/${stationId}/${shiftLogId}/${Date.now()}-${photo.name}`
      const { error: uploadErr } = await supabase.storage.from('dipstick-photos').upload(photoPath, photo)
      if (uploadErr) { setErr(uploadErr.message); setSaving(false); return }
    }
    const { error: insertErr } = await supabase.from('dipstick_readings').insert({
      org_id: orgId,
      station_id: stationId,
      reading_date: date,
      tank_label: tankLabel,
      reading_cm: Number(readingCm),
      temp_c: tempC === '' ? null : Number(tempC),
      water_cm: waterCm === '' ? null : Number(waterCm),
      logged_by: userId,
      shift_log_id: shiftLogId,
      photo_url: photoPath,
    })
    setSaving(false)
    if (insertErr) { setErr(insertErr.message); return }
    setTankLabel(''); setReadingCm(''); setTempC(''); setWaterCm(''); setPhoto(null)
    onSaved()
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-5 py-4 space-y-3">
      <div className="text-sm font-semibold text-gray-800">Add reading</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <input placeholder="Tank (e.g. Diesel)" value={tankLabel} onChange={e => setTankLabel(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm col-span-2 md:col-span-1 focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
        <input type="number" step="0.01" placeholder="Reading (cm)" value={readingCm} onChange={e => setReadingCm(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
        <input type="number" step="0.01" placeholder="Water (cm)" value={waterCm} onChange={e => setWaterCm(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
        <input type="number" step="0.1" placeholder="Temp (°C)" value={tempC} onChange={e => setTempC(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
      </div>
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50">
          <Camera className="w-4 h-4" />
          {photo ? photo.name : 'Attach photo'}
          <input type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => setPhoto(e.target.files?.[0] ?? null)} />
        </label>
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-1.5 bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save reading
        </button>
      </div>
      {err && <div className="text-xs text-red-600">{err}</div>}
    </div>
  )
}

function TurnoverNoteForm({
  orgId, stationId, userId, shiftLogId, supabase, onSaved,
}: {
  orgId: string; stationId: string; userId: string; shiftLogId: string
  supabase: ReturnType<typeof createClient>; onSaved: () => void
}) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!notes.trim()) return
    setSaving(true)
    setErr('')
    const { error: insertErr } = await supabase.from('shift_turnovers').insert({
      org_id: orgId,
      station_id: stationId,
      shift_log_id: shiftLogId,
      incoming_by: userId,
      notes: notes.trim(),
      handoff_time: new Date().toISOString(),
    })
    setSaving(false)
    if (insertErr) { setErr(insertErr.message); return }
    setNotes('')
    onSaved()
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-5 py-4 space-y-3">
      <div className="text-sm font-semibold text-gray-800">Add handoff note</div>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={3}
        placeholder="Anything the next person on shift should know…"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600 resize-none"
      />
      <button onClick={save} disabled={saving || !notes.trim()}
        className="inline-flex items-center gap-1.5 bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Save note
      </button>
      {err && <div className="text-xs text-red-600">{err}</div>}
    </div>
  )
}
