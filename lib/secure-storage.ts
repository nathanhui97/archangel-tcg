import * as SecureStore from 'expo-secure-store'

// SecureStore on Android caps values at 2 KB per key. Supabase sessions can
// exceed that (access + refresh tokens + user metadata). We chunk values
// across keys to stay under the limit while keeping the API a drop-in
// replacement for AsyncStorage.

const CHUNK_SIZE = 1800 // safety margin under the 2048 byte limit
const META_SUFFIX = '__chunks'

async function setItemAsync(key: string, value: string): Promise<void> {
  await removeItemAsync(key)

  if (value.length <= CHUNK_SIZE) {
    await SecureStore.setItemAsync(key, value)
    return
  }

  const chunks: string[] = []
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE))
  }

  await SecureStore.setItemAsync(`${key}${META_SUFFIX}`, String(chunks.length))
  await Promise.all(
    chunks.map((chunk, idx) =>
      SecureStore.setItemAsync(`${key}__${idx}`, chunk)
    )
  )
}

async function getItemAsync(key: string): Promise<string | null> {
  const meta = await SecureStore.getItemAsync(`${key}${META_SUFFIX}`)

  if (!meta) {
    return SecureStore.getItemAsync(key)
  }

  const count = parseInt(meta, 10)
  if (!Number.isFinite(count) || count <= 0) return null

  const parts = await Promise.all(
    Array.from({ length: count }, (_, idx) =>
      SecureStore.getItemAsync(`${key}__${idx}`)
    )
  )

  if (parts.some((p) => p === null)) return null
  return parts.join('')
}

async function removeItemAsync(key: string): Promise<void> {
  const meta = await SecureStore.getItemAsync(`${key}${META_SUFFIX}`)

  if (!meta) {
    await SecureStore.deleteItemAsync(key)
    return
  }

  const count = parseInt(meta, 10)
  await Promise.all([
    SecureStore.deleteItemAsync(`${key}${META_SUFFIX}`),
    ...Array.from({ length: count }, (_, idx) =>
      SecureStore.deleteItemAsync(`${key}__${idx}`)
    ),
  ])
}

// Drop-in adapter matching the storage interface Supabase expects.
export const secureStorage = {
  getItem: (key: string) => getItemAsync(key),
  setItem: (key: string, value: string) => setItemAsync(key, value),
  removeItem: (key: string) => removeItemAsync(key),
}
