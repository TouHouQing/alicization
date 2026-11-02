export interface AuthorizedBrowserTab {
  id: string
  title: string
  origin: string
  location: string
}

export type AuthorizedBrowserCommand
  = { cardId: string, action: 'status' | 'revoke' | 'takeover' | 'managed' }
    | { cardId: string, action: 'inspect', endpoint: string }
    | { cardId: string, action: 'grant', inspectionId: string, tabId: string, origins: string[] }
    | { cardId: string, action: 'confirm-closed', confirmedClosed: true }

export interface AuthorizedBrowserState {
  mode: 'managed' | 'authorized'
  status: 'managed' | 'connected' | 'disconnected' | 'stopping' | 'release-unknown'
  reason: string | null
  target: AuthorizedBrowserTab | null
  origins: string[]
  inspection?: { id: string, expiresAt: number, tabs: AuthorizedBrowserTab[] }
}
