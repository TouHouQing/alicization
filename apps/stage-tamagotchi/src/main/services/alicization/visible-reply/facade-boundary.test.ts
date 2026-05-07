import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

const root = join(__dirname, '..')
const allowedDirectImporters = new Set([
  'visible-reply/closure-orchestrator.ts',
  'visible-reply/facade.ts',
  'visible-reply/facade-boundary.test.ts',
  'visible-reply/second-pass-rewrite.ts',
])

function listTsFiles(dir: string): string[] {
  const result: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      if (entry === 'node_modules')
        continue
      result.push(...listTsFiles(full))
      continue
    }
    if (entry.endsWith('.ts'))
      result.push(full)
  }
  return result
}

describe('visible reply facade boundary', () => {
  it('does not keep the legacy root compatibility export surface', () => {
    expect(existsSync(join(root, 'main-chat-visible-reply-execution.ts'))).toBe(false)
  })

  it('keeps production runtime imports behind visible-reply/facade', () => {
    const forbidden = /from ['"](?:\.\.?\/)*visible-reply\/(?:authority-orchestrator|closure-orchestrator|critic|realization-engine|runtime-surface-authority|second-pass-rewrite|semantic-judge)['"]/u
    const offenders = listTsFiles(root)
      .filter(file => !file.endsWith('.test.ts'))
      .map(file => ({
        file,
        relative: relative(root, file),
        content: readFileSync(file, 'utf8'),
      }))
      .filter(item => !allowedDirectImporters.has(item.relative))
      .filter(item => forbidden.test(item.content))
      .map(item => item.relative)

    expect(offenders).toEqual([])
  })
})
