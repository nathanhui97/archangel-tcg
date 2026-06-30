import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { Session } from '@supabase/supabase-js'

type AuthState = {
  session: Session | null
  loading: boolean
  hasProfile: boolean | null  // null = unknown (still checking)
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasProfile, setHasProfile] = useState<boolean | null>(null)

  async function checkProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      console.warn('Profile check failed:', error.message)
      setHasProfile(null)
      return
    }
    setHasProfile(!!data)
  }

  async function refreshProfile() {
    if (!session) return
    await checkProfile(session.user.id)
  }

  async function signOut() {
    // Clear local auth state synchronously so AuthGate reacts on the very next
    // render. Waiting for the async onAuthStateChange round-trip leaves a gap
    // where the gate still sees the old session and bounces a just-signed-out
    // user back into the app (blank screen after account deletion).
    setSession(null)
    setHasProfile(null)
    // scope:'local' never hits the network — safe even when the user was just
    // deleted server-side (a global revoke would fail on a dead session).
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      if (!data.session) {
        setLoading(false)
        return
      }
      // Validate the stored session against the server. Deleting an account
      // leaves a stale local session whose user no longer exists; without this
      // it resurrects on next launch as a broken "signed-in, no profile" state
      // that dead-ends at profile-setup. A definitive auth error (401/403) means
      // the user is gone → sign out. Network/transient errors are ignored so a
      // genuinely valid session survives being briefly offline.
      const { error } = await supabase.auth.getUser()
      if (!mounted) return
      if (error && (error.status === 401 || error.status === 403)) {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
        setSession(null)
        setHasProfile(null)
        setLoading(false)
        return
      }
      setSession(data.session)
      checkProfile(data.session.user.id).finally(() => {
        if (mounted) setLoading(false)
      })
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return
      setSession(newSession)
      if (newSession) {
        checkProfile(newSession.user.id)
      } else {
        setHasProfile(null)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ session, loading, hasProfile, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
