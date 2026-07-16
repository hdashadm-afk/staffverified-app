// Weekly payroll cutoff: Thursday -> Wednesday. Payday is the Friday after close.
// JS getDay(): Sun=0 Mon=1 Tue=2 Wed=3 Thu=4 Fri=5 Sat=6

const fmt = (d: Date) => d.toISOString().split('T')[0]

/** Most recent Thursday on or before the given date (start of the cutoff week). */
export function cutoffStart(date: Date = new Date()): string {
  const d = new Date(date)
  const back = (d.getDay() - 4 + 7) % 7 // days since last Thursday
  d.setDate(d.getDate() - back)
  return fmt(d)
}

/** Wednesday that closes the cutoff week (start + 6 days). */
export function cutoffEnd(start: string): string {
  const d = new Date(start + 'T00:00:00')
  d.setDate(d.getDate() + 6)
  return fmt(d)
}

/** Payday = the Friday after the Wednesday close (close + 2 days). */
export function payday(end: string): string {
  const d = new Date(end + 'T00:00:00')
  d.setDate(d.getDate() + 2)
  return fmt(d)
}

/** Convenience: full current cutoff window. */
export function currentCutoff(date: Date = new Date()) {
  const start = cutoffStart(date)
  const end = cutoffEnd(start)
  return { start, end, payday: payday(end) }
}

/** True once today has reached the cutoff's Payroll Date (payday). */
export function isPastPayday(cutoffEndDate: string, today: Date = new Date()): boolean {
  return fmt(today) >= payday(cutoffEndDate)
}
