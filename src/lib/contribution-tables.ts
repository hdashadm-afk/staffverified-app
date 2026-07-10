// Government contribution tables — Philippines 2025
// Sources: SSS Circular 2019-033, PhilHealth Circular 2024, HDMF Circular 2021-003
// These are platform-maintained reference tables, not per-org config.

// ─── SSS ────────────────────────────────────────────────────────────────────
// 2025 rate: 15% of MSC. Employee share: 4.5%, Employer share: 9.5%, EC: 1%
// MSC brackets based on monthly basic salary ranges.
// Source: SSS Circular 2021-008 (effective Jan 2021), updated schedule.

interface SSSBracket {
  salaryFrom: number
  salaryTo: number
  msc: number          // Monthly Salary Credit
  employeeShare: number
  employerShare: number
  ec: number           // Employer's Compensation (employer pays)
  totalEmployer: number
}

// Simplified brackets — key representative rows (full table has ~55 rows)
// For ranges not listed, use linear interpolation or nearest bracket.
const SSS_BRACKETS_2025: SSSBracket[] = [
  { salaryFrom: 0,      salaryTo: 4249.99,  msc: 4000,  employeeShare: 180,   employerShare: 380,   ec: 10, totalEmployer: 390 },
  { salaryFrom: 4250,   salaryTo: 4749.99,  msc: 4500,  employeeShare: 202.5, employerShare: 427.5, ec: 10, totalEmployer: 437.5 },
  { salaryFrom: 4750,   salaryTo: 5249.99,  msc: 5000,  employeeShare: 225,   employerShare: 475,   ec: 10, totalEmployer: 485 },
  { salaryFrom: 5250,   salaryTo: 5749.99,  msc: 5500,  employeeShare: 247.5, employerShare: 522.5, ec: 10, totalEmployer: 532.5 },
  { salaryFrom: 5750,   salaryTo: 6249.99,  msc: 6000,  employeeShare: 270,   employerShare: 570,   ec: 10, totalEmployer: 580 },
  { salaryFrom: 6250,   salaryTo: 6749.99,  msc: 6500,  employeeShare: 292.5, employerShare: 617.5, ec: 10, totalEmployer: 627.5 },
  { salaryFrom: 6750,   salaryTo: 7249.99,  msc: 7000,  employeeShare: 315,   employerShare: 665,   ec: 10, totalEmployer: 675 },
  { salaryFrom: 7250,   salaryTo: 7749.99,  msc: 7500,  employeeShare: 337.5, employerShare: 712.5, ec: 10, totalEmployer: 722.5 },
  { salaryFrom: 7750,   salaryTo: 8249.99,  msc: 8000,  employeeShare: 360,   employerShare: 760,   ec: 10, totalEmployer: 770 },
  { salaryFrom: 8250,   salaryTo: 8749.99,  msc: 8500,  employeeShare: 382.5, employerShare: 807.5, ec: 10, totalEmployer: 817.5 },
  { salaryFrom: 8750,   salaryTo: 9249.99,  msc: 9000,  employeeShare: 405,   employerShare: 855,   ec: 10, totalEmployer: 865 },
  { salaryFrom: 9250,   salaryTo: 9749.99,  msc: 9500,  employeeShare: 427.5, employerShare: 902.5, ec: 10, totalEmployer: 912.5 },
  { salaryFrom: 9750,   salaryTo: 10249.99, msc: 10000, employeeShare: 450,   employerShare: 950,   ec: 10, totalEmployer: 960 },
  { salaryFrom: 10250,  salaryTo: 10749.99, msc: 10500, employeeShare: 472.5, employerShare: 997.5, ec: 10, totalEmployer: 1007.5 },
  { salaryFrom: 10750,  salaryTo: 11249.99, msc: 11000, employeeShare: 495,   employerShare: 1045,  ec: 10, totalEmployer: 1055 },
  { salaryFrom: 11250,  salaryTo: 11749.99, msc: 11500, employeeShare: 517.5, employerShare: 1092.5,ec: 10, totalEmployer: 1102.5 },
  { salaryFrom: 11750,  salaryTo: 12249.99, msc: 12000, employeeShare: 540,   employerShare: 1140,  ec: 10, totalEmployer: 1150 },
  { salaryFrom: 12250,  salaryTo: 12749.99, msc: 12500, employeeShare: 562.5, employerShare: 1187.5,ec: 10, totalEmployer: 1197.5 },
  { salaryFrom: 12750,  salaryTo: 13249.99, msc: 13000, employeeShare: 585,   employerShare: 1235,  ec: 10, totalEmployer: 1245 },
  { salaryFrom: 13250,  salaryTo: 13749.99, msc: 13500, employeeShare: 607.5, employerShare: 1282.5,ec: 10, totalEmployer: 1292.5 },
  { salaryFrom: 13750,  salaryTo: 14249.99, msc: 14000, employeeShare: 630,   employerShare: 1330,  ec: 10, totalEmployer: 1340 },
  { salaryFrom: 14250,  salaryTo: 14749.99, msc: 14500, employeeShare: 652.5, employerShare: 1377.5,ec: 10, totalEmployer: 1387.5 },
  { salaryFrom: 14750,  salaryTo: 15249.99, msc: 15000, employeeShare: 675,   employerShare: 1425,  ec: 10, totalEmployer: 1435 },
  { salaryFrom: 15250,  salaryTo: 15749.99, msc: 15500, employeeShare: 697.5, employerShare: 1472.5,ec: 10, totalEmployer: 1482.5 },
  { salaryFrom: 15750,  salaryTo: 16249.99, msc: 16000, employeeShare: 720,   employerShare: 1520,  ec: 30, totalEmployer: 1550 },
  { salaryFrom: 16250,  salaryTo: 16749.99, msc: 16500, employeeShare: 742.5, employerShare: 1567.5,ec: 30, totalEmployer: 1597.5 },
  { salaryFrom: 16750,  salaryTo: 17249.99, msc: 17000, employeeShare: 765,   employerShare: 1615,  ec: 30, totalEmployer: 1645 },
  { salaryFrom: 17250,  salaryTo: 17749.99, msc: 17500, employeeShare: 787.5, employerShare: 1662.5,ec: 30, totalEmployer: 1692.5 },
  { salaryFrom: 17750,  salaryTo: 18249.99, msc: 18000, employeeShare: 810,   employerShare: 1710,  ec: 30, totalEmployer: 1740 },
  { salaryFrom: 18250,  salaryTo: 18749.99, msc: 18500, employeeShare: 832.5, employerShare: 1757.5,ec: 30, totalEmployer: 1787.5 },
  { salaryFrom: 18750,  salaryTo: 19249.99, msc: 19000, employeeShare: 855,   employerShare: 1805,  ec: 30, totalEmployer: 1835 },
  { salaryFrom: 19250,  salaryTo: 19749.99, msc: 19500, employeeShare: 877.5, employerShare: 1852.5,ec: 30, totalEmployer: 1882.5 },
  { salaryFrom: 19750,  salaryTo: 20249.99, msc: 20000, employeeShare: 900,   employerShare: 1900,  ec: 30, totalEmployer: 1930 },
  { salaryFrom: 20250,  salaryTo: 20749.99, msc: 20500, employeeShare: 922.5, employerShare: 1947.5,ec: 30, totalEmployer: 1977.5 },
  { salaryFrom: 20750,  salaryTo: 999999,   msc: 20000, employeeShare: 900,   employerShare: 1900,  ec: 30, totalEmployer: 1930 },
  // Max MSC is ₱20,000 for 2025 (SSS Circular 2023-003 pending increase to ₱35,000 — update when implemented)
]

export function computeSSS(monthlySalary: number): { employee: number; employer: number; ec: number } {
  const bracket = SSS_BRACKETS_2025.find(
    b => monthlySalary >= b.salaryFrom && monthlySalary <= b.salaryTo
  ) ?? SSS_BRACKETS_2025[SSS_BRACKETS_2025.length - 1]

  return {
    employee: bracket.employeeShare,
    employer: bracket.employerShare,
    ec: bracket.ec,
  }
}

// ─── PhilHealth ─────────────────────────────────────────────────────────────
// 2025: 5% of basic monthly salary, split 50/50 employee/employer
// Floor: ₱10,000 monthly salary → ₱250 employee / ₱250 employer
// Ceiling: ₱100,000 monthly salary → ₱2,500 employee / ₱2,500 employer
// Source: PhilHealth Circular 2023-0005

const PHILHEALTH_RATE = 0.05
const PHILHEALTH_FLOOR_SALARY = 10000
const PHILHEALTH_CEILING_SALARY = 100000

export function computePhilHealth(monthlySalary: number): { employee: number; employer: number } {
  const clampedSalary = Math.min(Math.max(monthlySalary, PHILHEALTH_FLOOR_SALARY), PHILHEALTH_CEILING_SALARY)
  const total = clampedSalary * PHILHEALTH_RATE
  const share = Math.round((total / 2) * 100) / 100
  return { employee: share, employer: share }
}

// ─── HDMF / Pag-IBIG ────────────────────────────────────────────────────────
// 2025:
//   Monthly compensation ≤ ₱1,500: employee 1%, employer 2%
//   Monthly compensation > ₱1,500: employee 2%, employer 2%
// Max monthly contribution: ₱100 employee (at ₱5,000 salary ceiling for mandatory)
// Note: voluntary contributions above the ceiling are allowed.
// Source: HDMF Circular 2021-003

export function computeHDMF(monthlySalary: number): { employee: number; employer: number } {
  if (monthlySalary <= 1500) {
    return {
      employee: Math.min(monthlySalary * 0.01, 100),
      employer: monthlySalary * 0.02,
    }
  }
  return {
    employee: Math.min(monthlySalary * 0.02, 100),
    employer: Math.min(monthlySalary * 0.02, 100),
  }
}

// ─── Convenience: compute all three from a cutoff's total pay ───────────────
// monthlySalary = weekly cutoff basic pay × 52/12 (weekly → monthly equivalent).
// Cutoffs here are weekly (Thu–Wed, see cutoff.ts), not semi-monthly.
const WEEKS_PER_MONTH = 52 / 12

export interface StatutoryContributions {
  sss_employee: number
  sss_employer: number
  sss_ec: number
  philhealth_employee: number
  philhealth_employer: number
  hdmf_employee: number
  hdmf_employer: number
}

export function computeAllContributions(
  cutoffBasicPay: number,
  isFirstCutoff: boolean // SSS/PhilHealth deducted on FIRST cutoff only per month
): StatutoryContributions {
  const monthlySalary = cutoffBasicPay * WEEKS_PER_MONTH

  const sss = computeSSS(monthlySalary)
  const ph = computePhilHealth(monthlySalary)
  const hdmf = computeHDMF(monthlySalary)

  // SSS and PhilHealth are monthly contributions — deduct full amount on first cutoff
  // HDMF is typically deducted on second cutoff but can vary; default to first cutoff here
  if (isFirstCutoff) {
    return {
      sss_employee: sss.employee,
      sss_employer: sss.employer,
      sss_ec: sss.ec,
      philhealth_employee: ph.employee,
      philhealth_employer: ph.employer,
      hdmf_employee: hdmf.employee,
      hdmf_employer: hdmf.employer,
    }
  }

  return {
    sss_employee: 0,
    sss_employer: 0,
    sss_ec: 0,
    philhealth_employee: 0,
    philhealth_employer: 0,
    hdmf_employee: 0,
    hdmf_employer: 0,
  }
}

// ─── BIR Withholding Tax ────────────────────────────────────────────────────
// TRAIN law (RA 10963) revised annual income tax table, effective Jan 1 2023
// (Sec. 24(A)(2)(a), NIRC as amended). This is the authoritative table BIR
// publishes — the daily/weekly/semi-monthly/monthly withholding tables are
// all just this annual table pro-rated, so we annualize each cutoff's
// taxable pay, tax it here, then de-annualize rather than hand-transcribing
// a separate weekly bracket table (lower risk of a peso-level transcription
// error).
// Source: BIR Revenue Regulations No. 11-2018, as amended for 2023 rates.

interface AnnualTaxBracket {
  over: number
  taxOn: number      // fixed tax at the bracket floor
  rate: number        // marginal rate on the excess over `over`
}

const ANNUAL_TAX_BRACKETS: AnnualTaxBracket[] = [
  { over: 0,          taxOn: 0,         rate: 0 },
  { over: 250000,     taxOn: 0,         rate: 0.15 },
  { over: 400000,     taxOn: 22500,     rate: 0.20 },
  { over: 800000,     taxOn: 102500,    rate: 0.25 },
  { over: 2000000,    taxOn: 402500,    rate: 0.30 },
  { over: 8000000,    taxOn: 2202500,   rate: 0.35 },
]

/** Annual income tax due on a given annual taxable compensation. */
export function computeAnnualWithholdingTax(annualTaxableIncome: number): number {
  const bracket = [...ANNUAL_TAX_BRACKETS]
    .reverse()
    .find(b => annualTaxableIncome > b.over) ?? ANNUAL_TAX_BRACKETS[0]
  return bracket.taxOn + (annualTaxableIncome - bracket.over) * bracket.rate
}

/**
 * Withholding tax for one weekly cutoff.
 * cutoffTaxableIncome = gross taxable pay for the cutoff (basic + OT + holiday
 * + NSD) minus employee-share statutory contributions deducted that cutoff —
 * SSS/PhilHealth/Pag-IBIG are pre-tax. Non-statutory deductions (coop savings,
 * uniform, loans) are post-tax and must NOT be subtracted here.
 */
export function computeWeeklyWithholdingTax(cutoffTaxableIncome: number): number {
  const annualTaxableIncome = cutoffTaxableIncome * 52
  const annualTax = computeAnnualWithholdingTax(annualTaxableIncome)
  return annualTax / 52
}
