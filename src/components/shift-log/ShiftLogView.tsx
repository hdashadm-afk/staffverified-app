'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, Check, Loader2, Lock, ShieldCheck, Unlock } from 'lucide-react'

type Station = { id: string; name: string }
type ShiftLog = {
  id: string
  station_id: string
  shift_date: string
  shift_type: string
  opened_by: string | null
  closed_by: string | null
  status: string
  validated_by: string | null
  validated_at: string | null
}
type Reading = {
  id: string
  tank_label: string
  reading_type: 'beginning' | 'ending' | null
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

// Free text, not a fixed enum — shift patterns vary a lot per station
// (5am-11pm as one long shift at HT/HBani, 6am-6pm at HC/HQ/HD, 3x8hr
// elsewhere). These are just quick-pick starting points, fully editable.
const SHIFT_TYPE_PRESETS = ['5am-11pm', '6am-6pm', '6am-2pm', '2pm-10pm', '10pm-6am']

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
  const [shiftType, setShiftType] = useState('')
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

  // Founder: opening a shift and logging the first Beginning dipstick
  // reading should be one combined step, not "open shift" then
  // separately "add reading" — GA starts their shift by taking the
  // reading, not by clicking an empty "open" button first.
  const [openTankLabel, setOpenTankLabel] = useState('')
  const [openReadingCm, setOpenReadingCm] = useState('')
  const [openTempC, setOpenTempC] = useState('')
  const [openWaterCm, setOpenWaterCm] = useState('')
  const [openPhoto, setOpenPhoto] = useState<File | null>(null)
  const [opening, setOpening] = useState(false)

  async function openShiftWithReading() {
    if (!shiftType.trim()) { setError('Shift is required.'); return }
    if (!openTankLabel || openReadingCm === '') { setError('Tank and reading are required.'); return }
    if (!openPhoto) { setError('Photo of the digital reading (with price showing) is required.'); return }
    setOpening(true)
    setError('')
    const { data: log, error: logErr } = await supabase
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
    if (logErr) { setError(logErr.message); setOpening(false); return }

    const photoPath = `${orgId}/${stationId}/${log.id}/${Date.now()}-${openPhoto.name}`
    const { error: uploadErr } = await supabase.storage.from('dipstick-photos').upload(photoPath, openPhoto)
    if (uploadErr) { setError(uploadErr.message); setOpening(false); return }

    const { error: readingErr } = await supabase.from('dipstick_readings').insert({
      org_id: orgId,
      station_id: stationId,
      reading_date: date,
      reading_type: 'beginning',
      tank_label: openTankLabel,
      reading_cm: Number(openReadingCm),
      temp_c: openTempC === '' ? null : Number(openTempC),
      water_cm: openWaterCm === '' ? null : Number(openWaterCm),
      logged_by: userId,
      shift_log_id: log.id,
      photo_url: photoPath,
    })
    setOpening(false)
    if (readingErr) { setError(readingErr.message); return }

    setOpenTankLabel(''); setOpenReadingCm(''); setOpenTempC(''); setOpenWaterCm(''); setOpenPhoto(null)
    setShiftLog(log)
    load()
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

  // TL reviews and validates the shift's readings — this is what
  // "submits with his other reports" maps to. Flexible on purpose: if
  // there's no TL on duty, the GA (station_ops) can validate too, so
  // the day's report isn't blocked on TL availability.
  async function validateShift() {
    if (!shiftLog) return
    setError('')
    const { error: err } = await supabase
      .from('shift_logs')
      .update({ validated_by: userId, validated_at: new Date().toISOString() })
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
            <div className="text-sm font-semibold text-gray-800">Open shift — Beginning reading</div>
            <div className="flex flex-wrap gap-2">
              {SHIFT_TYPE_PRESETS.map(t => (
                <button key={t} type="button" onClick={() => setShiftType(t)}
                  className={`text-xs rounded-full px-3 py-1 border ${shiftType === t ? 'bg-brand-blue-600 border-brand-blue-600 text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  {t}
                </button>
              ))}
            </div>
            <input
              value={shiftType}
              onChange={e => setShiftType(e.target.value)}
              placeholder="Shift (e.g. 5am-11pm)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input placeholder="Tank (e.g. Diesel)" value={openTankLabel} onChange={e => setOpenTankLabel(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm col-span-2 md:col-span-1 focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
              <input type="number" step="0.01" placeholder="Reading (cm)" value={openReadingCm} onChange={e => setOpenReadingCm(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
              <input type="number" step="0.01" placeholder="Water (cm)" value={openWaterCm} onChange={e => setOpenWaterCm(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
              <input type="number" step="0.1" placeholder="Temp (°C)" value={openTempC} onChange={e => setOpenTempC(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
            </div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50">
                <Camera className="w-4 h-4" />
                {openPhoto ? openPhoto.name : 'Photo of digital display (with price) *'}
                <input type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={e => setOpenPhoto(e.target.files?.[0] ?? null)} />
              </label>
              <button
                onClick={openShiftWithReading}
                disabled={!stationId || opening}
                className="ml-auto inline-flex items-center gap-1.5 bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-50"
              >
                {opening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                Open shift & save reading
              </button>
            </div>
            <p className="text-xs text-gray-400">More tanks? Add their Beginning readings below once the shift is open.</p>
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
              {shiftLog.validated_at && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-brand-blue-700 bg-brand-blue-50 rounded-full px-2 py-0.5">
                  <ShieldCheck className="w-3 h-3" /> Validated {new Date(shiftLog.validated_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {shiftLog.status === 'closed' && !shiftLog.validated_by && canClose && (
                <button
                  onClick={validateShift}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue-600 hover:text-brand-blue-800"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Validate & submit
                </button>
              )}
              {shiftLog.status === 'open' && canClose && (
                <button
                  onClick={closeShift}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <Lock className="w-3.5 h-3.5" /> Close shift
                </button>
              )}
            </div>
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
                      <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
                        {r.tank_label}
                        {r.reading_type && (
                          <span className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-1.5 py-0.5 ${r.reading_type === 'beginning' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                            {r.reading_type}
                          </span>
                        )}
                      </div>
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
  const [readingType, setReadingType] = useState<'beginning' | 'ending'>('beginning')
  const [tankLabel, setTankLabel] = useState('')
  const [readingCm, setReadingCm] = useState('')
  const [tempC, setTempC] = useState('')
  const [waterCm, setWaterCm] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!tankLabel || readingCm === '') { setErr('Tank and reading are required.'); return }
    if (!photo) { setErr('Photo of the digital reading (with price showing) is required.'); return }
    setSaving(true)
    setErr('')
    const photoPath = `${orgId}/${stationId}/${shiftLogId}/${Date.now()}-${photo.name}`
    const { error: uploadErr } = await supabase.storage.from('dipstick-photos').upload(photoPath, photo)
    if (uploadErr) { setErr(uploadErr.message); setSaving(false); return }
    const { error: insertErr } = await supabase.from('dipstick_readings').insert({
      org_id: orgId,
      station_id: stationId,
      reading_date: date,
      reading_type: readingType,
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
      <div className="flex gap-2">
        {(['beginning', 'ending'] as const).map(t => (
          <button key={t} type="button" onClick={() => setReadingType(t)}
            className={`text-xs font-semibold uppercase tracking-wide rounded-full px-3 py-1 border ${readingType === t ? 'bg-brand-blue-600 border-brand-blue-600 text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            {t}
          </button>
        ))}
      </div>
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
          {photo ? photo.name : 'Photo of digital display (with price) *'}
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
