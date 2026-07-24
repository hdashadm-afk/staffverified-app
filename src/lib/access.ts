// Single source of truth for per-role module access.
// Used by the Sidebar (nav visibility) and each page (server-side guard).

// 'station_ops' = the GA (Gas Attendant) — a different person from the
// TL, does the physical pump/tank readings. RLS for shift_logs and
// dipstick_readings already expected this role name (scaffolded ahead
// of the app code); kept the same name here rather than inventing a
// new one.
export type Role = 'ceo' | 'cfo' | 'ops_officer' | 'owner' | 'assistant' | 'tl' | 'station_ops'

export const MODULE_ACCESS: Record<string, Role[]> = {
  '/dashboard':  ['ceo', 'cfo', 'ops_officer', 'owner', 'assistant'],
  '/hours':      ['ceo', 'cfo', 'ops_officer', 'owner', 'assistant'],
  '/permits':    ['ceo', 'ops_officer', 'owner', 'assistant'],
  '/dtr':        ['ceo', 'ops_officer', 'owner', 'assistant', 'tl'],
  '/schedule':   ['ceo', 'ops_officer', 'owner', 'assistant'],
  '/employees':  ['ceo', 'ops_officer', 'owner', 'assistant'],
  '/payroll':    ['ceo', 'cfo', 'ops_officer', 'owner', 'assistant'],
  '/remittance': ['ceo', 'cfo', 'owner'],
  '/nte':           ['ceo', 'ops_officer', 'owner', 'assistant'],
  '/doe':           ['ceo', 'ops_officer', 'owner', 'assistant'],
  '/disciplinary':  ['ceo', 'ops_officer', 'owner', 'assistant'],
  '/feedback':      ['owner', 'ceo'],
  // Matches shift_logs/dipstick_readings RLS: owner, station_ops, tl,
  // ceo can manage; ops_officer can view alongside HQ roles.
  '/shift-log':     ['ceo', 'ops_officer', 'owner', 'tl', 'station_ops'],
}

export function canAccess(path: string, role: string | null | undefined): boolean {
  if (!role) return false
  const allowed = MODULE_ACCESS[path]
  return allowed ? allowed.includes(role as Role) : false
}

// Where a role lands after login / when hitting a page they can't access.
export function landingFor(role: string | null | undefined): string {
  if (role === 'tl') return '/dtr'
  if (role === 'station_ops') return '/shift-log'
  if (role === 'cfo') return '/dashboard'
  return '/dashboard'
}
