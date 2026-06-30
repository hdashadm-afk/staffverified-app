import { cookies } from 'next/headers'

export type CurrentUser = {
  id: string
  email: string
}

// Reads the sv-token cookie, decodes the JWT payload (no network call),
// and returns the user id + email. Returns null if missing or expired.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('sv-token')?.value
  if (!raw) return null

  let accessToken = ''
  try {
    accessToken = JSON.parse(decodeURIComponent(raw)).access_token ?? ''
  } catch {
    return null
  }
  if (!accessToken) return null

  const parts = accessToken.split('.')
  if (parts.length !== 3) return null

  try {
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    )
    if (payload.exp && Date.now() / 1000 > payload.exp) return null // expired
    return { id: payload.sub, email: payload.email ?? '' }
  } catch {
    return null
  }
}
