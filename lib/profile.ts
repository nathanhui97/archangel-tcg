import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'
import type { Profile } from '@/types'

export function useMyProfile() {
  const { session } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!session) return
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
    setProfile(data as Profile | null)
    setLoading(false)
  }, [session])

  useEffect(() => {
    load()
  }, [load])

  return { profile, loading, refresh: load }
}

export async function updateProfile(
  updates: Partial<Pick<Profile, 'willing_to_ship' | 'lat' | 'lng' | 'city' | 'games'>>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')
  const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)
  if (error) throw new Error(error.message)
}

/** Permanently delete the signed-in user's account and all their data. */
export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account')
  if (error) throw new Error(error.message)
  // The auth user (and its server-side session) is gone now. A normal global
  // sign-out would POST to revoke a session that no longer exists and fail,
  // leaving a dead-but-present session that loops the AuthGate. Clear it
  // LOCALLY only so the teardown is clean and deterministic.
  await supabase.auth.signOut({ scope: 'local' })
}
