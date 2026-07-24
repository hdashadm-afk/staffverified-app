// Reads fuel-ops's (OpsVerified) confirmed Daily Outtake attendance data
// directly from its own Supabase project — read-only reference, matching
// the "surface signals, don't remote-control" principle in
// katiwala-owner-os-'s docs/OWNERS_LENS_MODULE_INTEGRATION.md. Used by
// DTRView to suggest Time In/Out that HR explicitly applies, not to
// auto-write payroll hours.
//
// The anon key below is already public — it's shipped as-is in fuel-ops's
// own client-side bundle (index.html). RLS on smp_daily_outtake is
// permissive-read for anon, same as every other table in that schema, so
// this isn't exposing anything that isn't already exposed.
const OPS_SUPABASE_URL = 'https://wtwgsygwofyqmxgckmjc.supabase.co'
const OPS_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0d2dzeWd3b2Z5cW14Z2NrbWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMDYyOTYsImV4cCI6MjA4ODc4MjI5Nn0.HZw75DHBHTdXe-nWcvq3hiYQdaQq9iKuxOis7YCU75o'

// StaffVerified station name -> fuel-ops station code. Spelled out
// explicitly rather than parsed from the "(...)" suffix — a naive parse
// would silently mismap Camaley ("HC" in the name vs "HCU" in fuel-ops)
// and Bani ("HBani" vs "HBANI").
export const OPS_STATION_CODE: Record<string, string> = {
  'Helium San Juan (HSJ)': 'HSJ',
  'Helium Bolingit (HB)': 'HB',
  'Helium Tandoc (HT)': 'HT',
  'Helium Camaley (HC)': 'HCU',
  'Helium Quibaol (HQ)': 'HQ',
  'Helium Domalandan (HD)': 'HD',
  'Helium Bani (HBani)': 'HBANI',
}

export interface OpsAttendanceEntry {
  staff_name: string
  role?: string
  time_in?: string | null
  time_out?: string | null
  hours?: number | null
  status?: string | null
}

interface OpsOuttakeRow {
  station: string
  date: string
  attendance_json: OpsAttendanceEntry[] | null
}

// One request per station covering the whole visible cutoff — callers
// match per date/employee client-side. Ops being unreachable shouldn't
// block DTR entry, so this fails quiet (empty result) rather than throwing.
export async function fetchOpsOuttakeRange(stationCode: string, startDate: string, endDate: string): Promise<Record<string, OpsAttendanceEntry[]>> {
  const url = `${OPS_SUPABASE_URL}/rest/v1/smp_daily_outtake`
    + `?station=eq.${encodeURIComponent(stationCode)}&date=gte.${startDate}&date=lte.${endDate}`
    + `&select=station,date,attendance_json`
  try {
    const res = await fetch(url, {
      headers: { apikey: OPS_ANON_KEY, Authorization: `Bearer ${OPS_ANON_KEY}` },
    })
    if (!res.ok) return {}
    const rows = (await res.json()) as OpsOuttakeRow[]
    const byDate: Record<string, OpsAttendanceEntry[]> = {}
    for (const row of rows) byDate[row.date] = row.attendance_json ?? []
    return byDate
  } catch {
    return {}
  }
}

// "Genese, Kevin Almonte" -> "kevin" — fuel-ops's smp_attendance.staff_name
// (what Daily Outtake pulls from) is informal/first-name-only, confirmed
// against fuel-ops's own ROLE_DATA config; StaffVerified's full_name is
// "Last, First Middle". Only ever used to SUGGEST a match for HR to
// explicitly apply — never to auto-write payroll hours — so a loose match
// here can't silently misattribute pay.
function firstNameOf(fullName: string): string {
  const afterComma = fullName.includes(',') ? fullName.split(',')[1] : fullName
  return (afterComma || '').trim().split(/\s+/)[0]?.toLowerCase() ?? ''
}

// Returns the single confident match, or null if there's no match or more
// than one (two staff sharing a first name at the same station) — an
// ambiguous case is left for HR to resolve by checking Ops directly rather
// than guessed.
export function matchOpsAttendance(fullName: string, entries: OpsAttendanceEntry[]): OpsAttendanceEntry | null {
  const first = firstNameOf(fullName)
  if (!first) return null
  const matches = entries.filter(e => {
    const name = (e.staff_name || '').trim().toLowerCase()
    return name === first || name.startsWith(first + ' ')
  })
  return matches.length === 1 ? matches[0] : null
}
