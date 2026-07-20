// Weekly payroll cutoff: Thursday -> Wednesday. Payday is the Friday after close.
//
// All cutoff/payday dates are calendar dates in Asia/Manila — the business's
// own timezone — no matter where this code runs. The page header renders
// server-side (Vercel, UTC by default) while the DTR nav/table render
// client-side (the user's browser, Manila). Previously both parsed dates in
// whatever timezone happened to be "local" to the runtime and then formatted
// with toISOString() (always UTC) — during Manila's 12am-8am window that's
// still "yesterday" in UTC, so the two sides silently disagreed by a day.
// Anchoring explicitly to Asia/Manila via Intl makes both sides agree.

const MANILA_TZ = 'Asia/Manila'

/** Y/M/D of the given instant, as seen in Asia/Manila — not the runtime's own timezone. */
function manilaParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day') }
}

/**
 * A Date holding the given instant's Manila calendar date at local midnight
 * (in the runtime's own timezone). Safe to run getDay()/setDate() on
 * afterward — it's pure calendar arithmetic from here, no more TZ drift.
 */
function manilaCalendarDate(date: Date): Date {
  const { year, month, day } = manilaParts(date)
  return new Date(year, month - 1, day)
}

/** Parses a "YYYY-MM-DD" string into a local-midnight Date, for calendar arithmetic. */
function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Formats a Date's own (already-correct) calendar fields as "YYYY-MM-DD" — never via toISOString. */
function fmt(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Today's calendar date in Asia/Manila, as "YYYY-MM-DD". */
export function manilaTodayISO(date: Date = new Date()): string {
  return fmt(manilaCalendarDate(date))
}

/** Most recent Thursday on or before the given date (start of the cutoff week), in Manila time. */
export function cutoffStart(date: Date = new Date()): string {
  const d = manilaCalendarDate(date)
  const back = (d.getDay() - 4 + 7) % 7 // days since last Thursday
  d.setDate(d.getDate() - back)
  return fmt(d)
}

/** Wednesday that closes the cutoff week (start + 6 days). */
export function cutoffEnd(start: string): string {
  const d = parseISODate(start)
  d.setDate(d.getDate() + 6)
  return fmt(d)
}

/** Payday = the Friday after the Wednesday close (close + 2 days). */
export function payday(end: string): string {
  const d = parseISODate(end)
  d.setDate(d.getDate() + 2)
  return fmt(d)
}

/** Convenience: full current cutoff window. */
export function currentCutoff(date: Date = new Date()) {
  const start = cutoffStart(date)
  const end = cutoffEnd(start)
  return { start, end, payday: payday(end) }
}

/** "JULY 2-8, 2026" (or cross-month "JULY 30-AUGUST 5, 2026") for payslip/email headers. */
export function formatPayrollCutoff(start: string, end: string): string {
  const s = parseISODate(start)
  const e = parseISODate(end)
  const M = (d: Date) => d.toLocaleDateString('en-US', { month: 'long' }).toUpperCase()
  if (s.getMonth() === e.getMonth()) return `${M(s)} ${s.getDate()}-${e.getDate()}, ${e.getFullYear()}`
  return `${M(s)} ${s.getDate()}-${M(e)} ${e.getDate()}, ${e.getFullYear()}`
}

/** True once today (Manila) has reached the cutoff's Payroll Date (payday). */
export function isPastPayday(cutoffEndDate: string, today: Date = new Date()): boolean {
  return manilaTodayISO(today) >= payday(cutoffEndDate)
}
