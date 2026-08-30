import { delimiter } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import {
  buildAlicizationExecutionEnv,
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

  it('removes parent Codex control variables before launching a nested execution agent', () => {
    const executionEnv = buildAlicizationExecutionEnv({
      CODEX_CI: '1',
      CODEX_INTERNAL_ORIGINATOR_OVERRIDE: 'Codex Desktop',
      CODEX_PERMISSION_PROFILE: ':danger-full-access',
      CODEX_THREAD_ID: 'parent-thread',
      CODEX_HOME: '/parent/codex-home',
      NODE_ENV: 'test',
      TEST: 'true',
      VITEST: 'true',
      VITEST_MODE: 'RUN',
      VITEST_WORKER_ID: '0',
      PATH: '/usr/bin',
    }, {
      CODEX_HOME: '/isolated/codex-home',
    }, '/Users/tester')

    expect(executionEnv.CODEX_HOME).toBe('/isolated/codex-home')
    expect(executionEnv).not.toHaveProperty('CODEX_CI')
    expect(executionEnv).not.toHaveProperty('CODEX_INTERNAL_ORIGINATOR_OVERRIDE')
    expect(executionEnv).not.toHaveProperty('CODEX_PERMISSION_PROFILE')
    expect(executionEnv).not.toHaveProperty('CODEX_THREAD_ID')
    expect(executionEnv).not.toHaveProperty('NODE_ENV')
    expect(executionEnv).not.toHaveProperty('TEST')
    expect(executionEnv).not.toHaveProperty('VITEST')
    expect(executionEnv).not.toHaveProperty('VITEST_MODE')
    expect(executionEnv).not.toHaveProperty('VITEST_WORKER_ID')
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

  it('chooses the highest verified Codex CLI version when multiple binaries are available', async () => {
    const accessImpl = vi.fn(async (candidate: string) => {
      if (
        candidate === '/Users/tester/custom-tools/bin/codex'
        || candidate === '/Applications/ChatGPT.app/Contents/Resources/codex'
      ) {
        return
      }
      throw new Error('ENOENT')
    })

    const versionImpl = vi.fn(async (candidate: string) => {
      if (candidate === '/Users/tester/custom-tools/bin/codex')
        return 'codex-cli 0.142.0'
      if (candidate === '/Applications/ChatGPT.app/Contents/Resources/codex')
        return 'codex-cli 0.147.0-alpha.1.2'
      throw new Error('version probe failed')
    })

    await expect(locateAlicizationExecutionBinary('codex', {
      accessImpl,
      versionImpl,
      homeDir: '/Users/tester',
      pathValue: '/Users/tester/custom-tools/bin:/usr/bin:/bin',
      platform: 'darwin',
    })).resolves.toBe('/Applications/ChatGPT.app/Contents/Resources/codex')
  })
})
