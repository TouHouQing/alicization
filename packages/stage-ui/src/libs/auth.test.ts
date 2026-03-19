import { beforeEach, describe, expect, it, vi } from 'vitest'

const createAuthClient = vi.fn(() => ({
  getSession: vi.fn().mockResolvedValue({ data: null }),
  listSessions: vi.fn().mockResolvedValue({ data: [] }),
  signOut: vi.fn().mockResolvedValue(undefined),
  signIn: {
    social: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('better-auth/vue', () => ({
  createAuthClient,
}))

describe('stage-ui auth client bootstrap', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    createAuthClient.mockClear()
  })

  it('does not initialize Better Auth under file origins', async () => {
    vi.stubGlobal('window', {
      location: {
        origin: 'file://',
      },
    })

    const auth = await import('./auth')

    expect(auth.SERVER_URL).toBe('')
    expect(auth.canUseRemoteAuth).toBe(false)
    expect(createAuthClient).not.toHaveBeenCalled()
    await expect(auth.fetchSession()).resolves.toBe(false)
    await expect(auth.signIn('github')).rejects.toThrow('Sign-in is unavailable outside HTTP(S) environments.')
    expect(createAuthClient).not.toHaveBeenCalled()
  })

  it('lazily initializes Better Auth under HTTP origins', async () => {
    const getSession = vi.fn().mockResolvedValue({ data: null })
    createAuthClient.mockReturnValue({
      getSession,
      listSessions: vi.fn().mockResolvedValue({ data: [] }),
      signOut: vi.fn().mockResolvedValue(undefined),
      signIn: {
        social: vi.fn().mockResolvedValue(undefined),
      },
    })

    vi.stubGlobal('window', {
      location: {
        origin: 'https://alicization.test',
      },
    })

    const auth = await import('./auth')

    expect(auth.SERVER_URL).toBe('https://alicization.test')
    expect(auth.canUseRemoteAuth).toBe(true)
    expect(createAuthClient).not.toHaveBeenCalled()

    await expect(auth.fetchSession()).resolves.toBe(false)

    expect(createAuthClient).toHaveBeenCalledTimes(1)
    expect(createAuthClient).toHaveBeenCalledWith({
      baseURL: 'https://alicization.test',
      credentials: 'include',
    })

    await auth.fetchSession()

    expect(createAuthClient).toHaveBeenCalledTimes(1)
    expect(getSession).toHaveBeenCalledTimes(2)
  })
})
