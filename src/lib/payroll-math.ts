// Payroll math — Helium Fuels rules (Rojelyn's spec, June 2026)
// All rates are org-configurable; defaults here match Helium.

export interface OrgRates {
  ot_multiplier: number         // default 1.0
  nsd_rate: number              // default 0.10 (10%)
  holiday_regular_multiplier: number  // default 2.0
  holiday_special_multiplier: number  // default 1.3
}

const DEFAULT_RATES: OrgRates = {
  ot_multiplier: 1.0,
  nsd_rate: 0.10,
  holiday_regular_multiplier: 2.0,
  holiday_special_multiplier: 1.3,
}

export function hourlyRate(dailyRate: number): number {
  return dailyRate / 8
}

// OT pay = (daily / 8) × ot_hours × ot_multiplier
export function computeOvertimePay(
  dailyRate: number,
  overtimeHours: number,
  rates: OrgRates = DEFAULT_RATES
): number {
  return hourlyRate(dailyRate) * overtimeHours * rates.ot_multiplier
}

// Night shift differential = (daily / 8) × nsd_hours × nsd_rate
// Night shift window: 10 PM – 6 AM
export function computeNSD(
  dailyRate: number,
  nightShiftHours: number,
  rates: OrgRates = DEFAULT_RATES
): number {
  return hourlyRate(dailyRate) * nightShiftHours * rates.nsd_rate
}

// Holiday pay replaces (not adds to) basic pay for that day
export function computeHolidayPay(
  dailyRate: number,
  isRegular: boolean,
  isSpecial: boolean,
  rates: OrgRates = DEFAULT_RATES
): number {
  if (isRegular) return dailyRate * rates.holiday_regular_multiplier
  if (isSpecial) return dailyRate * rates.holiday_special_multiplier
  return dailyRate
}

// Late/undertime: deduct proportionally from daily rate
export function computeLateUndertimeDeduction(
  dailyRate: number,
  lateMinutes: number,
  undertimeMinutes: number
): number {
  const totalMinutes = lateMinutes + undertimeMinutes
  return (dailyRate / (8 * 60)) * totalMinutes
}

// Parses "HH:MM" or "HH:MM:SS" (as returned by Postgres time columns) into minutes since midnight.
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// Night shift hours from time_in / time_out strings ("HH:MM")
// Returns decimal hours within 22:00–06:00 window
export function computeNightShiftHours(timeIn: string, timeOut: string): number {
  if (!timeIn || !timeOut) return 0

  const inMin = timeToMinutes(timeIn)
  let outMin = timeToMinutes(timeOut)
  if (outMin <= inMin) outMin += 24 * 60 // crosses midnight

  // Night window: 22:00 (1320) – 30:00 (next day 06:00 = 1800)
  const nightStart = 22 * 60      // 1320
  const nightEnd = 30 * 60        // 1800 (06:00 next day)

  let overlap = 0

  // Shift might span midnight; work in 0–48h space
  const overlapStart = Math.max(inMin, nightStart)
  const overlapEnd = Math.min(outMin, nightEnd)
  if (overlapEnd > overlapStart) overlap += overlapEnd - overlapStart

  // Also check second night window if shift is very long (edge case)
  const overlapStart2 = Math.max(inMin, nightStart - 24 * 60)
  const overlapEnd2 = Math.min(outMin, nightEnd - 24 * 60)
  if (overlapEnd2 > overlapStart2 && overlapStart2 >= 0) overlap += overlapEnd2 - overlapStart2

  return Math.max(0, overlap / 60)
}

// Regular hours (capped at 8 per day, not counting OT or holidays)
export function computeRegularHours(timeIn: string, timeOut: string): number {
  if (!timeIn || !timeOut) return 0
  let diff = timeToMinutes(timeOut) - timeToMinutes(timeIn)
  if (diff < 0) diff += 24 * 60
  return Math.min(8, diff / 60)
}

// OT hours = total hours worked beyond 8
export function computeOvertimeHours(timeIn: string, timeOut: string): number {
  if (!timeIn || !timeOut) return 0
  let diff = timeToMinutes(timeOut) - timeToMinutes(timeIn)
  if (diff < 0) diff += 24 * 60
  return Math.max(0, diff / 60 - 8)
}

// Late minutes = minutes after the scheduled shift start the employee clocked in.
// Undertime minutes = minutes before the scheduled shift end the employee clocked out.
// Both are 0 when there's no schedule row for that employee/date (nothing to compare against).
export function computeLateMinutes(timeIn: string, shiftStart: string | null): number {
  if (!timeIn || !shiftStart) return 0
  return Math.max(0, timeToMinutes(timeIn) - timeToMinutes(shiftStart))
}

export function computeUndertimeMinutes(timeOut: string, shiftEnd: string | null): number {
  if (!timeOut || !shiftEnd) return 0
  return Math.max(0, timeToMinutes(shiftEnd) - timeToMinutes(timeOut))
}

// Shared earnings summary — used by both the DTR "estimated earnings" preview
// and actual payslip generation, so the two never disagree.
export interface CutoffEntry {
  regular_hours: number
  overtime_hours: number
  night_shift_hours: number
  late_minutes: number
  undertime_minutes: number
  is_holiday_regular: boolean
  is_holiday_special: boolean
}

export interface CutoffEarnings {
  basicPay: number
  holidayPay: number
  overtimePay: number
  nsdPay: number
  lateUndertimeDeduction: number
  totalEarnings: number
}

export function summarizeCutoffEarnings(
  entries: CutoffEntry[],
  dailyRate: number,
  rates: OrgRates = DEFAULT_RATES
): CutoffEarnings {
  const hourly = hourlyRate(dailyRate)
  let basicPay = 0
  let holidayPay = 0
  let overtimePay = 0
  let nsdPay = 0
  let lateUndertimeDeduction = 0

  for (const e of entries) {
    if (e.is_holiday_regular || e.is_holiday_special) {
      holidayPay += computeHolidayPay(dailyRate, e.is_holiday_regular, e.is_holiday_special, rates)
    } else {
      basicPay += hourly * e.regular_hours
    }
    overtimePay += computeOvertimePay(dailyRate, e.overtime_hours, rates)
    nsdPay += computeNSD(dailyRate, e.night_shift_hours, rates)
    lateUndertimeDeduction += computeLateUndertimeDeduction(dailyRate, e.late_minutes, e.undertime_minutes)
  }

  return {
    basicPay,
    holidayPay,
    overtimePay,
    nsdPay,
    lateUndertimeDeduction,
    totalEarnings: basicPay + holidayPay + overtimePay + nsdPay - lateUndertimeDeduction,
  }
}
