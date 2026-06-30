import { Redirect } from 'expo-router'
import { useAuth } from '@/lib/auth'

export default function AppIndex() {
  const { session, hasProfile } = useAuth()
  // Only forward into the tabs when fully authed. Otherwise render nothing and
  // let AuthGate redirect (to landing or profile-setup) — rendering the redirect
  // during a signed-out transition wars with AuthGate and loops the router.
  if (!session || !hasProfile) return null
  return <Redirect href="/(app)/(tabs)/trade" />
}
