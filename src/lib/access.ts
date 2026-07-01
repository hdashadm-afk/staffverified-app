// Single source of truth for per-role module access.
// Used by the Sidebar (nav visibility) and each page (server-side guard).

export type Role = 'ceo' | 'cfo' | 'ops_officer' | 'owner' | 'assistant' | 'tl'

export const MODULE_ACCESS: Record<string, Role[]> = {
  '/dashboard':  ['ceo', 'cfo', 'ops_officer', 'owner', 'assistant'],
  '/hours':      ['ceo', 'cfo', 'ops_officer', 'owner', 'assistant'],
  '/permits':    ['ceo', 'ops_officer', 'owner', 'assistant'],
  '/dtr':        ['ceo', 'ops_officer', 'owner', 'assistant', 'tl'],
  '/employees':  ['ceo', 'ops_officer', 'owner', 'assistant'],
  '/payroll':    ['ceo', 'cfo', 'ops_officer', 'owner', 'assistant'],
  '/remittance': ['ceo', 'cfo', 'owner'],
  '/nte':        ['ceo', 'ops_officer', 'owner', 'assistant'],
  '/doe':        ['ceo', 'ops_officer', 'owner', 'assistant'],
  '/feedback':   ['owner', 'ceo'],
}

export function canAccess(path: string, role: string | null | undefined): boolean {
  if (!role) return false
  const allowed = MODULE_ACCESS[path]
  return allowed ? allowed.includes(role as Role) : false
}

// Where a role lands after login / when hitting a page they can't access.
export function landingFor(role: string | null | undefined): string {
  if (role === 'tl') return '/dtr'
  if (role === 'cfo') return '/dashboard'
  return '/dashboard'
}
