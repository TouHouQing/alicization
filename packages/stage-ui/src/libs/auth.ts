import { createAuthClient } from 'better-auth/vue'

export type OAuthProvider = 'google' | 'github'

function isHttpServerUrl(value: string) {
  if (!value)
    return false

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  }
  catch {
    return false
  }
}

function resolveServerUrl() {
  const configuredServerUrlRaw = typeof import.meta.env.VITE_SERVER_URL === 'string'
    ? import.meta.env.VITE_SERVER_URL.trim()
    : ''
  const configuredServerUrl = isHttpServerUrl(configuredServerUrlRaw)
    ? configuredServerUrlRaw
    : ''

  if (configuredServerUrl)
    return configuredServerUrl.replace(/\/+$/, '')

  const fallbackServerUrl = typeof window !== 'undefined' && isHttpServerUrl(window.location.origin)
    ? window.location.origin
    : ''

  return (configuredServerUrl || fallbackServerUrl).replace(/\/+$/, '')
}

export const SERVER_URL = resolveServerUrl()
export const canUseRemoteAuth = isHttpServerUrl(SERVER_URL)

let authClient: ReturnType<typeof createAuthClient> | null = null

function getAuthClient() {
  if (!canUseRemoteAuth)
    return null

  authClient ??= createAuthClient({
    baseURL: SERVER_URL,
    credentials: 'include',
  })

  return authClient
}

async function getAuthStore() {
  const { useAuthStore } = await import('../stores/auth')
  return useAuthStore()
}

export async function fetchSession() {
  const client = getAuthClient()
  if (!client)
    return false

  const { data } = await client.getSession()
  if (data) {
    const authStore = await getAuthStore()

    authStore.user = data.user
    authStore.session = data.session
    return true
  }

  return false
}

export async function listSessions() {
  const client = getAuthClient()
  if (!client)
    return { data: null, error: null }

  return await client.listSessions()
}

export async function signOut() {
  const client = getAuthClient()
  if (client)
    await client.signOut()

  const authStore = await getAuthStore()
  authStore.user = undefined
  authStore.session = undefined
}

export async function signIn(provider: OAuthProvider) {
  const client = getAuthClient()
  if (!client || typeof window === 'undefined' || !isHttpServerUrl(window.location.origin)) {
    throw new Error('Sign-in is unavailable outside HTTP(S) environments.')
  }

  return await client.signIn.social({
    provider,
    callbackURL: window.location.origin,
  })
}
