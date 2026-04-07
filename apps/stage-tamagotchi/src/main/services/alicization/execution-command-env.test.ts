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
})
