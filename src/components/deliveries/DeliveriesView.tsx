'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, Camera, Check, ChevronDown, ChevronUp, Loader2, ShieldCheck, Truck } from 'lucide-react'

type Station = { id: string; name: string }
type Delivery = {
  id: string
  station_id: string
  delivery_date: string
  supplier: string
  fuel_type: string
  po_liters: number
  receiver_name: string
  driver_name: string | null
  plate_number: string | null
  is_transfer: boolean
  source_station_id: string | null
  flagged: boolean
  resolved_at: string | null
  resolution_notes: string | null
}
type Drop = {
  id: string
  delivery_id: string
  drop_number: number
  before_cm: number
  after_cm: number
  actual_volume: number
  tank_label: string | null
  before_photo_url: string
  after_photo_url: string
}

// A drop total meaningfully short of the PO liters gets auto-flagged —
// short deliveries are exactly what before/after photo evidence exists
// to catch.
const SHORTFALL_FLAG_PCT = 0.02

export default function DeliveriesView({
  orgId, userId, userName, stations, lockedStationId,
}: {
  orgId: string; userId: string; userName: string
  stations: Station[]; lockedStationId: string | null
}) {
  const supabase = createClient()
  const [stationId, setStationId] = useState(lockedStationId ?? stations[0]?.id ?? '')
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [dropsByDelivery, setDropsByDelivery] = useState<Record<string, Drop[]>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!stationId) return
    setLoading(true)
    setError('')
    const { data } = await supabase
      .from('deliveries')
      .select('*')
      .eq('station_id', stationId)
      .order('delivery_date', { ascending: false })
      .limit(30)
    setDeliveries(data ?? [])
    setLoading(false)
  }, [stationId, supabase])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  async function loadDrops(deliveryId: string) {
    const { data } = await supabase
      .from('delivery_drops')
      .select('*')
      .eq('delivery_id', deliveryId)
      .order('drop_number')
    setDropsByDelivery(prev => ({ ...prev, [deliveryId]: data ?? [] }))
  }

  async function toggleExpand(d: Delivery) {
    if (expanded === d.id) { setExpanded(null); return }
    setExpanded(d.id)
    if (!dropsByDelivery[d.id]) await loadDrops(d.id)
  }

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
        <button onClick={() => setShowNewForm(v => !v)} disabled={!stationId}
          className="ml-auto inline-flex items-center gap-1.5 bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-50">
          <Truck className="w-4 h-4" /> Log delivery
        </button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

      {showNewForm && (
        <NewDeliveryForm
          orgId={orgId} stationId={stationId} userId={userId} stations={stations} supabase={supabase}
          onSaved={() => { setShowNewForm(false); load() }}
        />
      )}

      {loading ? (
        <div className="text-sm text-gray-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : deliveries.length === 0 ? (
        <p className="text-sm text-gray-400">No deliveries logged yet.</p>
      ) : (
        <div className="space-y-3">
          {deliveries.map(d => {
            const drops = dropsByDelivery[d.id] ?? []
            const dropTotal = drops.reduce((sum, r) => sum + Number(r.actual_volume), 0)
            return (
              <div key={d.id} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                <button onClick={() => toggleExpand(d)} className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50">
                  <div>
                    <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
                      {d.is_transfer ? 'Transfer' : d.supplier} — {d.fuel_type}
                      {d.flagged && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide bg-red-50 text-red-700 rounded-full px-2 py-0.5">
                          <AlertTriangle className="w-3 h-3" /> Flagged
                        </span>
                      )}
                      {d.resolved_at && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide bg-green-50 text-green-700 rounded-full px-2 py-0.5">
                          <ShieldCheck className="w-3 h-3" /> Resolved
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {d.delivery_date} · PO {d.po_liters} L · Receiver: {d.receiver_name}
                      {d.is_transfer && d.source_station_id && ` · from ${stations.find(s => s.id === d.source_station_id)?.name ?? 'another station'}`}
                    </div>
                  </div>
                  {expanded === d.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {expanded === d.id && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                    <div className="text-xs text-gray-500">
                      Driver: {d.driver_name ?? '—'} · Plate: {d.plate_number ?? '—'}
                    </div>

                    {drops.length > 0 && (
                      <div className="text-xs text-gray-600">
                        Measured total: <span className="font-medium">{dropTotal.toFixed(1)} L</span> vs PO <span className="font-medium">{d.po_liters} L</span>
                        {dropTotal < d.po_liters * (1 - SHORTFALL_FLAG_PCT) && (
                          <span className="text-red-600"> — {(d.po_liters - dropTotal).toFixed(1)} L short</span>
                        )}
                      </div>
                    )}

                    <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
                      {drops.map(r => (
                        <div key={r.id} className="px-3 py-2 text-xs text-gray-600 flex items-center justify-between">
                          <span>Drop {r.drop_number}{r.tank_label ? ` — ${r.tank_label}` : ''}: {r.before_cm}cm → {r.after_cm}cm ({r.actual_volume} L)</span>
                        </div>
                      ))}
                      {drops.length === 0 && <div className="px-3 py-4 text-center text-xs text-gray-400">No drops logged yet.</div>}
                    </div>

                    <AddDropForm
                      orgId={orgId} stationId={stationId} deliveryId={d.id} userId={userId}
                      nextDropNumber={drops.length + 1} poLiters={d.po_liters} existingTotal={dropTotal}
                      supabase={supabase}
                      onSaved={async () => { await loadDrops(d.id); load() }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function NewDeliveryForm({
  orgId, stationId, userId, stations, supabase, onSaved,
}: {
  orgId: string; stationId: string; userId: string; stations: Station[]
  supabase: ReturnType<typeof createClient>; onSaved: () => void
}) {
  const [isTransfer, setIsTransfer] = useState(false)
  const [sourceStationId, setSourceStationId] = useState('')
  const [supplier, setSupplier] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10))
  const [fuelType, setFuelType] = useState('')
  const [poLiters, setPoLiters] = useState('')
  const [receiverName, setReceiverName] = useState('')
  const [driverName, setDriverName] = useState('')
  const [plateNumber, setPlateNumber] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [platePhoto, setPlatePhoto] = useState<File | null>(null)
  const [calibPhoto, setCalibPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function uploadPhoto(file: File, label: string): Promise<string> {
    const path = `${orgId}/${stationId}/${Date.now()}-${label}-${file.name}`
    const { error } = await supabase.storage.from('delivery-photos').upload(path, file)
    if (error) throw new Error(error.message)
    return path
  }

  async function save() {
    if (!fuelType || poLiters === '' || !receiverName) { setErr('Fuel type, PO liters, and receiver are required.'); return }
    if (!isTransfer && !supplier) { setErr('Supplier is required for a non-transfer delivery.'); return }
    if (isTransfer && !sourceStationId) { setErr('Source station is required for a transfer.'); return }
    if (!platePhoto || !calibPhoto) { setErr('Plate photo and calibration photo are required.'); return }
    setSaving(true)
    setErr('')
    try {
      const platePhotoUrl = await uploadPhoto(platePhoto, 'plate')
      const calibPhotoUrl = await uploadPhoto(calibPhoto, 'calib')
      const { error: insertErr } = await supabase.from('deliveries').insert({
        org_id: orgId,
        station_id: stationId,
        delivery_date: deliveryDate,
        supplier: isTransfer ? (stations.find(s => s.id === sourceStationId)?.name ?? 'Internal Transfer') : supplier,
        fuel_type: fuelType,
        po_liters: Number(poLiters),
        receiver_name: receiverName,
        driver_name: driverName || null,
        plate_number: plateNumber || null,
        license_number: licenseNumber || null,
        plate_photo_url: platePhotoUrl,
        calib_photo_url: calibPhotoUrl,
        is_transfer: isTransfer,
        source_station_id: isTransfer ? sourceStationId : null,
        logged_by: userId,
        flagged: false,
      })
      if (insertErr) throw new Error(insertErr.message)
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save delivery.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-5 py-4 space-y-3">
      <div className="flex gap-2">
        <button type="button" onClick={() => setIsTransfer(false)}
          className={`text-xs font-semibold uppercase tracking-wide rounded-full px-3 py-1 border ${!isTransfer ? 'bg-brand-blue-600 border-brand-blue-600 text-white' : 'border-gray-200 text-gray-500'}`}>
          External delivery
        </button>
        <button type="button" onClick={() => setIsTransfer(true)}
          className={`text-xs font-semibold uppercase tracking-wide rounded-full px-3 py-1 border ${isTransfer ? 'bg-brand-blue-600 border-brand-blue-600 text-white' : 'border-gray-200 text-gray-500'}`}>
          Inter-station transfer
        </button>
      </div>

      {isTransfer ? (
        <select value={sourceStationId} onChange={e => setSourceStationId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600">
          <option value="">— source station —</option>
          {stations.filter(s => s.id !== stationId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      ) : (
        <input placeholder="Supplier" value={supplier} onChange={e => setSupplier(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
        <input placeholder="Fuel type" value={fuelType} onChange={e => setFuelType(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
        <input type="number" step="0.01" placeholder="PO liters" value={poLiters} onChange={e => setPoLiters(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
        <input placeholder="Receiver name" value={receiverName} onChange={e => setReceiverName(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
        <input placeholder="Driver name" value={driverName} onChange={e => setDriverName(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
        <input placeholder="Plate number" value={plateNumber} onChange={e => setPlateNumber(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
        <input placeholder="License number" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50">
          <Camera className="w-4 h-4" />
          {platePhoto ? platePhoto.name : 'Plate photo *'}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setPlatePhoto(e.target.files?.[0] ?? null)} />
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50">
          <Camera className="w-4 h-4" />
          {calibPhoto ? calibPhoto.name : 'Calibration seal photo *'}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setCalibPhoto(e.target.files?.[0] ?? null)} />
        </label>
        <button onClick={save} disabled={saving}
          className="ml-auto inline-flex items-center gap-1.5 bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save delivery
        </button>
      </div>
      {err && <div className="text-xs text-red-600">{err}</div>}
    </div>
  )
}

function AddDropForm({
  orgId, stationId, deliveryId, nextDropNumber, poLiters, existingTotal, supabase, onSaved,
}: {
  orgId: string; stationId: string; deliveryId: string; userId: string
  nextDropNumber: number; poLiters: number; existingTotal: number
  supabase: ReturnType<typeof createClient>; onSaved: () => void
}) {
  const [tankLabel, setTankLabel] = useState('')
  const [beforeCm, setBeforeCm] = useState('')
  const [afterCm, setAfterCm] = useState('')
  const [actualVolume, setActualVolume] = useState('')
  const [beforePhoto, setBeforePhoto] = useState<File | null>(null)
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function uploadPhoto(file: File, label: string): Promise<string> {
    const path = `${orgId}/${stationId}/${deliveryId}/${Date.now()}-${label}-${file.name}`
    const { error } = await supabase.storage.from('delivery-photos').upload(path, file)
    if (error) throw new Error(error.message)
    return path
  }

  async function save() {
    if (beforeCm === '' || afterCm === '' || actualVolume === '') { setErr('Before/after cm and actual volume are required.'); return }
    if (!beforePhoto || !afterPhoto) { setErr('Before and after photos are required.'); return }
    setSaving(true)
    setErr('')
    try {
      const beforePhotoUrl = await uploadPhoto(beforePhoto, 'before')
      const afterPhotoUrl = await uploadPhoto(afterPhoto, 'after')
      const { error: insertErr } = await supabase.from('delivery_drops').insert({
        delivery_id: deliveryId,
        drop_number: nextDropNumber,
        tank_label: tankLabel || null,
        before_cm: Number(beforeCm),
        after_cm: Number(afterCm),
        actual_volume: Number(actualVolume),
        before_photo_url: beforePhotoUrl,
        after_photo_url: afterPhotoUrl,
        drop_time: new Date().toISOString(),
      })
      if (insertErr) throw new Error(insertErr.message)

      // Auto-flag if the running total is meaningfully short of the PO.
      const newTotal = existingTotal + Number(actualVolume)
      if (newTotal < poLiters * (1 - SHORTFALL_FLAG_PCT)) {
        await supabase.from('deliveries').update({ flagged: true }).eq('id', deliveryId)
      }

      setTankLabel(''); setBeforeCm(''); setAfterCm(''); setActualVolume(''); setBeforePhoto(null); setAfterPhoto(null)
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save drop.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 space-y-2">
      <div className="text-xs font-semibold text-gray-700">Add drop {nextDropNumber}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <input placeholder="Tank" value={tankLabel} onChange={e => setTankLabel(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
        <input type="number" step="0.01" placeholder="Before (cm)" value={beforeCm} onChange={e => setBeforeCm(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
        <input type="number" step="0.01" placeholder="After (cm)" value={afterCm} onChange={e => setAfterCm(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
        <input type="number" step="0.01" placeholder="Actual volume (L)" value={actualVolume} onChange={e => setActualVolume(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
      </div>
      <div className="flex items-center gap-2">
        <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-white bg-white">
          <Camera className="w-3.5 h-3.5" />
          {beforePhoto ? beforePhoto.name : 'Before photo *'}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setBeforePhoto(e.target.files?.[0] ?? null)} />
        </label>
        <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-white bg-white">
          <Camera className="w-3.5 h-3.5" />
          {afterPhoto ? afterPhoto.name : 'After photo *'}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setAfterPhoto(e.target.files?.[0] ?? null)} />
        </label>
        <button onClick={save} disabled={saving}
          className="ml-auto inline-flex items-center gap-1.5 bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 disabled:opacity-50">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Save drop
        </button>
      </div>
      {err && <div className="text-xs text-red-600">{err}</div>}
    </div>
  )
}
