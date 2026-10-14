import { access, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { platform } from 'node:process'

import { expect, it } from 'vitest'

import { resolveOwnedArtifactDirectory } from './owned-artifact-path'

it('rejects an existing junction before creating any directories through it', async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-owned-junction-'))
  const outside = join(root, 'outside')
  const redirected = join(root, 'redirected')
  try {
    await mkdir(outside)
    await symlink(outside, redirected, platform === 'win32' ? 'junction' : 'dir')
    await expect(resolveOwnedArtifactDirectory(join(redirected, 'new', 'workspace'))).rejects.toThrow('redirected')
    await expect(access(join(outside, 'new'))).rejects.toThrow()
  }
  finally { await rm(root, { recursive: true, force: true }) }
})
