import { createAuthClient } from 'better-auth/vue'

import { useAuthStore } from '../stores/auth'

export type OAuthProvider = 'google' | 'github'

function resolveServerUrl() {
  const configuredServerUrl = typeof import.meta.env.VITE_SERVER_URL === 'string'
    ? import.meta.env.VITE_SERVER_URL.trim()
    : ''
  const fallbackServerUrl = typeof window !== 'undefined'
    ? window.location.origin
    : ''

  return (configuredServerUrl || fallbackServerUrl).replace(/\/+$/, '')
}

export const SERVER_URL = resolveServerUrl()

export const authClient = createAuthClient({
  baseURL: SERVER_URL,
  credentials: 'include',
})

export async function fetchSession() {
  const { data } = await authClient.getSession()
  if (data) {
    const authStore = useAuthStore()

    authStore.user = data.user
    authStore.session = data.session
    return true
  }

  return false
}

export async function listSessions() {
  return await authClient.listSessions()
}

export async function signOut() {
  await authClient.signOut()

  const authStore = useAuthStore()
  authStore.user = undefined
  authStore.session = undefined
}

export async function signIn(provider: OAuthProvider) {
  return await authClient.signIn.social({
    provider,
    callbackURL: window.location.origin,
  })
}
