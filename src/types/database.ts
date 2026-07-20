export type UserRole = 'owner' | 'assistant' | 'ops_officer' | 'ceo' | 'cfo'
export type PermitStatus = 'pending' | 'submitted' | 'overdue' | 'acknowledged'
export type PayrollStatus = 'draft' | 'review' | 'completed'
export type PayrollRunType = 'regular' | '13th_month' | 'bonus' | 'adjustment'
export type Agency = 'SSS' | 'PhilHealth' | 'HDMF' | 'BIR' | 'DOE' | 'DOLE' | 'Other'

// Weekly Payroll Deductions & Adjustments — Employee Profile
export type DeductionType =
  | 'sss' | 'philhealth' | 'pagibig'
  | 'sss_loan' | 'pagibig_loan' | 'coop_loan'
  | 'coop_savings'
  | 'short' | 'salary_adjustment'
  | 'bonus' | 'thirteenth_month_pay'
  | 'tl_allowance' | 'gas_allowance' | 'other_allowance'

export interface Organization {
  id: string
  name: string
  slug: string
  connected_systems: string[]
  ot_multiplier: number
  nsd_rate: number
  holiday_regular_multiplier: number
  holiday_special_multiplier: number
  created_at: string
}

export interface Station {
  id: string
  org_id: string
  name: string
  address: string | null
  created_at: string
}

export interface UserProfile {
  id: string
  org_id: string
  role: UserRole
  full_name: string
  email: string
  created_at: string
}

export interface Employee {
  id: string
  org_id: string
  station_id: string | null
  full_name: string
  email: string | null
  position: string | null
  daily_rate: number
  allowance: number
  regular_hours_per_day: number
  has_sil: boolean
  coop_saving_amount: number
  is_active: boolean
  date_hired: string | null
  employment_type: string
  sss_no: string | null
  philhealth_no: string | null
  pagibig_no: string | null
  tin_no: string | null
  bank_name: string | null
  bank_account_no: string | null
  bank_account_name: string | null
  created_at: string
}

export interface Position {
  id: string
  org_id: string
  name: string
  sort_order: number
  created_at: string
}

export interface EmployeeDeductionSetting {
  id: string
  org_id: string
  employee_id: string
  deduction_type: DeductionType
  can_deduct: boolean
  weekly_amount: number
  created_at: string
  updated_at: string
}

export interface DTREntry {
  id: string
  org_id: string
  employee_id: string
  station_id: string | null
  work_date: string
  time_in: string | null
  time_out: string | null
  regular_hours: number
  overtime_hours: number
  night_shift_hours: number
  overtime_hours_overridden: boolean
  night_shift_hours_overridden: boolean
  late_minutes: number
  undertime_minutes: number
  is_holiday_regular: boolean
  is_holiday_special: boolean
  notes: string | null
  entered_by: string | null
  created_at: string
}

export type DTROverrideField = 'overtime_hours' | 'night_shift_hours'

export interface DTROverrideLogEntry {
  id: string
  org_id: string
  employee_id: string
  work_date: string
  field: DTROverrideField
  old_value: number | null
  new_value: number
  reason: string | null
  changed_by: string | null
  changed_at: string
}

export interface DTRCutoffStatus {
  id: string
  org_id: string
  employee_id: string
  cutoff_start: string
  status: 'draft' | 'finalized'
  reopened_by: string | null
  reopened_at: string | null
  updated_at: string
}

export interface Schedule {
  id: string
  org_id: string
  employee_id: string
  station_id: string | null
  work_date: string
  shift_start: string | null
  shift_end: string | null
  created_at: string
}

export interface PayrollRun {
  id: string
  org_id: string
  station_id: string | null
  cutoff_start: string
  cutoff_end: string
  status: PayrollStatus
  run_type: PayrollRunType
  notes: string | null
  prepared_by: string | null
  created_at: string
  completed_at: string | null
}

export interface Payslip {
  id: string
  org_id: string
  payroll_run_id: string
  employee_id: string
  basic_pay: number
  holiday_pay: number
  sil_pay: number
  overtime_pay: number
  late_undertime_deduction: number
  night_shift_diff: number
  allowances: number
  add_back: number
  add_back_reason: string | null
  total_earnings: number
  sss_contribution: number
  philhealth_contribution: number
  hdmf_contribution: number
  withholding_tax: number
  uniform_deduction: number
  coop_saving: number
  coop_loan: number
  gas_shortage: number
  gas_shortage_note: string | null
  sss_loan: number
  pagibig_loan: number
  salary_adjustment: number
  bonus: number
  thirteenth_month_pay: number
  tl_allowance: number
  gas_allowance: number
  other_allowance: number
  total_deductions: number
  net_pay: number
  variance_amount: number
  variance_reason: string | null
  created_at: string
}

export interface Permit {
  id: string
  org_id: string
  station_id: string | null
  permit_type: string
  agency: string
  description: string | null
  status: PermitStatus
  due_date: string
  submitted_at: string | null
  submitted_by: string | null
  proof_file_path: string | null
  notes: string | null
  parent_permit_id: string | null
  is_recurring: boolean
  recurrence_rule: string | null
  created_at: string
}

export interface ReminderRule {
  id: string
  org_id: string
  permit_id: string | null
  days_before: number
  notify_role: string
  created_at: string
}

export interface NTERecord {
  id: string
  org_id: string
  employee_id: string
  date_issued: string
  incident_date: string
  violation: string
  offense_number: string
  description: string
  issued_by: string
  pdf_url: string | null
  acknowledged: boolean
  created_at: string
}

export interface NTERecordWithEmployee extends NTERecord {
  employees: { full_name: string } | null
}

export type FeedbackSeverity = 'bug' | 'suggestion' | 'question'

export interface FeedbackReport {
  id: string
  org_id: string
  user_id: string | null
  user_name: string
  user_email: string
  page_url: string
  message: string
  severity: FeedbackSeverity
  is_resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  attachment_paths: string[]
  created_at: string
}
