import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'desktop-execution-life-loop-bridge',
    file: './desktop-execution-life-loop-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that desktop execution callback returns can continue from the next start cycle into dream carry, long-horizon self-carry, and later hover-first initiative instead of stopping at execution closure alone',
      'expect.objectContaining({ entry: \'execution-callback-long-horizon-self-carry\' })',
      'expect.objectContaining({ entry: \'execution-callback-afterglow-later-hover-first-initiative\' })',
    ],
  },
  {
    entry: 'long-horizon-self-carry-into-noisy-desktop-pressure',
    file: './long-horizon-project-awareness-audit.test.ts',
    snippets: [
      'durable self-carry now has dedicated same-her project proof plus repair-first continuity pressure distilled from noisier desktop carry, including proactive-visible embodiment carry, while fully sustained noisy-desktop closure still remains open',
      'noisy-desktop-repair-first-chain-durable-pressure',
      'quick-reply-project-self-brief-lines',
    ],
  },
  {
    entry: 'noisy-desktop-life-loop-unity',
    file: './noisy-desktop-life-loop-unity-audit.test.ts',
    snippets: [
      'keeps one explicit long-run proof fragment that personality, memory, initiative, and embodiment still compress back into one same Phase 1 digital-life line under noisy desktop drift instead of splitting into proof islands',
      'expect.objectContaining({ entry: \'personality-active-memory-handoff-unity\' })',
      'expect.objectContaining({ entry: \'memory-ledger-emotional-closure-unity\' })',
      'expect.objectContaining({ entry: \'initiative-noisy-desktop-same-life-thread\' })',
      'expect.objectContaining({ entry: \'embodiment-noisy-desktop-cross-modal-thread\' })',
    ],
  },
] as const

describe('desktop execution noisy life-loop unity bridge audit', () => {
  it('keeps one explicit compact cold proof that the desktop execution callback line can continue through next start, dream carry, long-horizon self-carry, and later noisy-desktop subsystem unity instead of stopping before personality, memory, initiative, and embodiment reconverge', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'desktop-execution-life-loop-bridge' }),
      expect.objectContaining({ entry: 'long-horizon-self-carry-into-noisy-desktop-pressure' }),
      expect.objectContaining({ entry: 'noisy-desktop-life-loop-unity' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the execution-to-noisy-desktop unity claim to current execution life-loop, long-horizon, and subsystem-unity audits instead of only broader noisy-desktop or long-run prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the desktop execution noisy life-loop unity bridge as repo truth while keeping fully sustained noisy-desktop closure explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'noisy-desktop-life-loop-unity-hardening')?.proof).toContain('desktop-execution-noisy-life-loop-unity-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-life-loop-unity-hardening')?.responsibility).toContain('desktop execution noisy life-loop unity bridge')

    expect(matrixSource).toContain('desktop-execution-noisy-life-loop-unity-bridge-audit.test.ts')
    expect(matrixSource).toContain('desktop execution noisy life-loop unity bridge')
    expect(auditSource).toContain('desktop execution noisy life-loop unity bridge now also ties execution callback continuity through next-start, next-dream carry, long-horizon self-carry, and later noisy-desktop subsystem unity')
    expect(auditSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
  })
})
