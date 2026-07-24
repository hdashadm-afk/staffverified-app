// Single source of truth for per-role module access.
// Used by the Sidebar (nav visibility) and each page (server-side guard).

// 'station_ops' = the GA (Gas Attendant), also called Cashier — general
// accountability for the station sits here. roleLabel() below is what
// actually shows in the UI.
// 'ops_officer_delivery' = Delivery Supervisor — also referenced in RLS
// ahead of the app code, same as station_ops was. Founder: delivery/
// transfer reports are covered by TL and the Delivery Supervisor.
export type Role = 'ceo' | 'cfo' | 'ops_officer' | 'owner' | 'assistant' | 'tl' | 'station_ops' | 'ops_officer_delivery'

export function roleLabel(role: string | null | undefined): string {
  if (role === 'station_ops') return 'Cashier'
  if (role === 'tl') return 'Team Lead'
  if (role === 'ops_officer') return 'Ops Officer'
  if (role === 'ops_officer_delivery') return 'Delivery Supervisor'
  return role ? role.replace(/_/g, ' ') : ''
}

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
  // Matches deliveries/delivery_drops RLS: owner, station_ops, tl, ceo
  // manage org-wide; ops_officer_delivery scoped to their own station.
  '/deliveries':    ['ceo', 'ops_officer', 'owner', 'tl', 'station_ops', 'ops_officer_delivery'],
  // Founder: Jeff and Arnold (both ops_officer_delivery) do deliveries,
  // transfers, AND cash pickups alternately — same role covers all
  // three (migration 026). Owners or Casey (accounting officer,
  // 'assistant' role) can also step in when needed (migration 027).
  '/cash-pickups':  ['ceo', 'ops_officer', 'owner', 'station_ops', 'ops_officer_delivery', 'assistant'],
}

export function canAccess(path: string, role: string | null | undefined): boolean {
  if (!role) return false
  const allowed = MODULE_ACCESS[path]
  return allowed ? allowed.includes(role as Role) : false
}

// Where a role lands after login / when hitting a page they can't access.
export function landingFor(role: string | null | undefined): string {
  if (role === 'tl') return '/dtr'
  if (role === 'station_ops') return '/deliveries'
  if (role === 'ops_officer_delivery') return '/deliveries'
  if (role === 'cfo') return '/dashboard'
  return '/dashboard'
}
