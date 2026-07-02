import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

const BUCKET = 'pull-photos' // reused; private, owner-write to their own folder

/** Upload binder-page photos to the user's folder; returns the storage paths. */
async function uploadBinderPhotos(userId: string, binderId: string, uris: string[]): Promise<string[]> {
  const paths: string[] = []
  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i]
    const ext = (uri.split('?')[0].split('.').pop() || 'jpg').toLowerCase()
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    const path = `${userId}/binder-${binderId}/${Date.now()}-${i}.${ext}`
    const arraybuffer = await fetch(uri).then((r) => r.arrayBuffer())
    const { error } = await supabase.storage.from(BUCKET).upload(path, arraybuffer, { contentType, upsert: true })
    if (error) throw new Error(`photo upload → ${error.message}`)
    paths.push(path)
  }
  return paths
}

/** Submit a binder for verification (private photos → a pending review row). */
export async function submitBinderVerification(
  userId: string,
  binderId: string,
  uris: string[],
  note: string
): Promise<void> {
  const photo_paths = await uploadBinderPhotos(userId, binderId, uris)
  const { error } = await supabase.from('binder_verifications').insert({
    binder_id: binderId,
    user_id: userId,
    photo_paths,
    note: note.trim() || null,
  })
  if (error) throw new Error(`submit verification → ${error.message}`)
}

/** Whether a binder has a pending (submitted, not-yet-reviewed) verification. */
export function useBinderVerificationStatus(binderId: string | undefined) {
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!binderId) {
      setPending(false)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('binder_verifications')
      .select('id')
      .eq('binder_id', binderId)
      .eq('status', 'pending')
      .limit(1)
    setPending((data?.length ?? 0) > 0)
    setLoading(false)
  }, [binderId])

  useEffect(() => {
    load()
  }, [load])

  return { pending, loading, refresh: load }
}
