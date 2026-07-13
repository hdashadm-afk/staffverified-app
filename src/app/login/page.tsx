'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

const SUPABASE_URL = 'https://ttytducwrldmgdqskyym.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eXRkdWN3cmxkbWdkcXNreXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2OTQzNTYsImV4cCI6MjA5ODI3MDM1Nn0.rOkOMks7pRgA3pE0Hp_sORxwJlr_uLKyPptDpgnzJDs'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(
        SUPABASE_URL + '/auth/v1/token?grant_type=password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': ANON_KEY,
          },
          body: JSON.stringify({ email, password }),
        }
      )
      const data = await res.json()

      if (!res.ok) {
        setError(data.error_description ?? data.message ?? 'Login failed')
        setLoading(false)
        return
      }

      // Store just the access + refresh tokens in a single small cookie.
      // Server reads this and injects it as a Bearer token for RLS.
      const token = JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
      })
      document.cookie = `sv-token=${encodeURIComponent(token)}; path=/; max-age=2592000; SameSite=Lax`
      window.location.href = '/'
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-surface px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md border border-gray-100 p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={56} />
          <div className="text-2xl font-bold text-gray-900 tracking-tight mt-3">
            Staff<span className="text-brand-blue-600">Verified</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">Staff &amp; Admin for gas stations</div>
          <div className="mt-2 h-1 w-16 rounded-full bg-brand-blue-600" />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
              placeholder="..."
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-blue-600 hover:bg-brand-blue-700 text-white font-medium rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
