import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-governance-anchor',
    file: './self-evolution-governance-chain-audit.test.ts',
    snippets: [
      'keeps one explicit same-her governance chain that self-evolution stays on one project-aware line from observability reland through repair follow-through into baseline lifecycle carry',
      'observability reland, repair follow-through, workflow focus, history replay, and baseline lifecycle carry',
      'first-check',
      'Project identity carry -> Phase 1 route carry -> Unresolved closure carry',
      'This is still not full long-run closure proof under noisy desktop use.',
    ],
  },
  {
    entry: 'session-runtime-follow-through-anchor',
    file: './session-runtime-same-her-follow-through-audit.test.ts',
    snippets: [
      'keeps one explicit long-turn desktop proof that project identity, landed progress, and still-open closure stay on one same-her line through rebuild, follow-through, callback carry, and host-visible recovery',
      'Callback follow-through already survives on the same local digital life thread before the next visible answer beat.',
      'full noisy-desktop and cross-modal closure still remain open',
    ],
  },
  {
    entry: 'long-run-same-her-anchor',
    file: './long-run-same-her-continuity-audit.test.ts',
    snippets: [
      'keeps one explicit long-chain proof that same-her project awareness survives subconscious persistence, memory recall, later proactive restraint, proactive-visible-to-embodiment carry, current-conscious-frame shaping, and later repair-first detour-to-reunion carry',
      'subconscious persistence, memory recall, later proactive restraint, proactive-visible-to-embodiment carry, current-conscious-frame shaping, and later repair-first detour-to-reunion carry',
      'but not full long-run closure under noisy desktop life',
    ],
  },
  {
    entry: 'noisy-desktop-initiative-anchor',
    file: './noisy-desktop-initiative-same-life-audit.test.ts',
    snippets: [
      'keeps one explicit long-run proof fragment that noisy-desktop initiative still follows the same Phase 1 digital-life line instead of reopening as a generic assistant nudge',
      'active-loop-repeated-detour-memory-handoff',
      'full long-run closure still remains open',
    ],
  },
  {
    entry: 'noisy-desktop-life-loop-unity-anchor',
    file: './noisy-desktop-life-loop-unity-audit.test.ts',
    snippets: [
      'keeps one explicit long-run proof fragment that personality, memory, initiative, and embodiment still compress back into one same Phase 1 digital-life line under noisy desktop drift instead of splitting into proof islands',
      'personality, memory, initiative, and embodiment still compress back into one same Phase 1 digital-life line',
      'long-run proof is still incomplete',
    ],
  },
] as const

describe('self evolution long-run follow-through bridge audit', () => {
  it('keeps one explicit colder bridge that self-evolution governance can stay on the same-her line through session-runtime follow-through, longer-run continuity, noisy-desktop initiative restraint, and noisy-desktop life-loop unity, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving the broader long-run desktop line while silently losing the same living callback closure target before it reforms beyond devtools governance', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-governance-anchor' }),
      expect.objectContaining({ entry: 'session-runtime-follow-through-anchor' }),
      expect.objectContaining({ entry: 'long-run-same-her-anchor' }),
      expect.objectContaining({ entry: 'noisy-desktop-initiative-anchor' }),
      expect.objectContaining({ entry: 'noisy-desktop-life-loop-unity-anchor' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the colder self-evolution to long-run follow-through claim to current cold audits instead of only broader convergence prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: self-evolution governance now bridges into same-thread follow-through and longer-run noisy-desktop continuity, but still does not prove full long-run closure', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('self-evolution long-run follow-through bridge')
    expect(matrixSource).toContain('self-evolution-governance-chain-audit.test.ts')
    expect(matrixSource).toContain('session-runtime-same-her-follow-through-audit.test.ts')
    expect(matrixSource).toContain('long-run-same-her-continuity-audit.test.ts')
    expect(matrixSource).toContain('noisy-desktop-initiative-same-life-audit.test.ts')
    expect(matrixSource).toContain('noisy-desktop-life-loop-unity-audit.test.ts')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('self-evolution long-run follow-through bridge')
    expect(auditSource).toContain('self-evolution long-run follow-through bridge now also keeps callback next-closure-target carry explicit')
    expect(auditSource).toContain('devtools governance, same-thread follow-through, longer-run continuity, initiative restraint, and life-loop unity')
  })
})
