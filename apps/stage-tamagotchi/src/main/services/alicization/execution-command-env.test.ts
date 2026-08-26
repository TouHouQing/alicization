import { delimiter } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import {
  buildAlicizationExecutionPath,
  locateAlicizationExecutionBinary,
} from './execution-command-env'

describe('execution command env', () => {
  it('appends known GUI fallback roots into the execution PATH', () => {
    const pathValue = buildAlicizationExecutionPath('/usr/bin:/bin', '/Users/tester')
    const entries = pathValue.split(delimiter)

    expect(entries).toContain('/Users/tester/.local/bin')
    expect(entries).toContain('/opt/homebrew/bin')
    expect(entries).toContain('/Applications/Codex.app/Contents/Resources')
    expect(entries).toContain('/Applications/ChatGPT.app/Contents/Resources')
  })

  it('prefers an explicitly configured Codex CLI path from the app environment', async () => {
    const accessImpl = vi.fn(async (candidate: string) => {
      if (candidate === '/Applications/ChatGPT.app/Contents/Resources/codex')
        return
      throw new Error('ENOENT')
    })

    await expect(locateAlicizationExecutionBinary('codex', {
      accessImpl,
      homeDir: '/Users/tester',
      pathValue: '/usr/bin:/bin',
      platform: 'darwin',
      explicitPath: '/Applications/ChatGPT.app/Contents/Resources/codex',
    })).resolves.toBe('/Applications/ChatGPT.app/Contents/Resources/codex')

    expect(accessImpl).toHaveBeenCalledWith('/Applications/ChatGPT.app/Contents/Resources/codex', expect.any(Number))
  })

  it('locates bundled codex and local claude binaries outside inherited PATH', async () => {
    const accessImpl = vi.fn(async (candidate: string) => {
      if (
        candidate === '/Applications/Codex.app/Contents/Resources/codex'
        || candidate === '/Users/tester/.local/bin/claude'
      ) {
        return
      }
      throw new Error('ENOENT')
    })

    await expect(locateAlicizationExecutionBinary('codex', {
      accessImpl,
      homeDir: '/Users/tester',
      pathValue: '/usr/bin:/bin',
      platform: 'darwin',
    })).resolves.toBe('/Applications/Codex.app/Contents/Resources/codex')

    await expect(locateAlicizationExecutionBinary('claude', {
      accessImpl,
      homeDir: '/Users/tester',
      pathValue: '/usr/bin:/bin',
      platform: 'darwin',
    })).resolves.toBe('/Users/tester/.local/bin/claude')
  })

  it('locates Codex installed by nvm when Finder provides a minimal PATH', async () => {
    const accessImpl = vi.fn(async (candidate: string) => {
      if (candidate === '/Users/tester/.nvm/versions/node/v22.22.2/bin/codex')
        return
      throw new Error('ENOENT')
    })

    await expect(locateAlicizationExecutionBinary('codex', {
      accessImpl,
      readdirImpl: vi.fn(async (path: string) => {
        if (path === '/Users/tester/.nvm/versions/node')
          return ['v20.18.1', 'v22.22.2']
        return []
      }),
      homeDir: '/Users/tester',
      pathValue: '/usr/bin:/bin',
      platform: 'darwin',
    })).resolves.toBe('/Users/tester/.nvm/versions/node/v22.22.2/bin/codex')
  })

  it('prefers a user-provided PATH executable over bundled fallback candidates', async () => {
    const accessImpl = vi.fn(async (candidate: string) => {
      if (
        candidate === '/Users/tester/custom-tools/bin/codex'
        || candidate === '/Applications/Codex.app/Contents/Resources/codex'
      ) {
        return
      }
      throw new Error('ENOENT')
    })

    await expect(locateAlicizationExecutionBinary('codex', {
      accessImpl,
      readdirImpl: vi.fn(async () => []),
      homeDir: '/Users/tester',
      pathValue: '/Users/tester/custom-tools/bin:/usr/bin:/bin',
      platform: 'darwin',
    })).resolves.toBe('/Users/tester/custom-tools/bin/codex')
  })

  it('prefers a user-managed nvm Codex over the bundled App binary in Finder', async () => {
    const accessImpl = vi.fn(async (candidate: string) => {
      if (
        candidate === '/Applications/Codex.app/Contents/Resources/codex'
        || candidate === '/Users/tester/.nvm/versions/node/v22.22.2/bin/codex'
      ) {
        return
      }
      throw new Error('ENOENT')
    })

    await expect(locateAlicizationExecutionBinary('codex', {
      accessImpl,
      readdirImpl: vi.fn(async (path: string) => {
        if (path === '/Users/tester/.nvm/versions/node')
          return ['v22.22.2']
        return []
      }),
      homeDir: '/Users/tester',
      pathValue: '/usr/bin:/bin',
      platform: 'darwin',
    })).resolves.toBe('/Users/tester/.nvm/versions/node/v22.22.2/bin/codex')
  })
})
