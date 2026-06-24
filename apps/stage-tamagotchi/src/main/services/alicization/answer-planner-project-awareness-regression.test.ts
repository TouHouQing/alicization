import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('answer planner project awareness regression', () => {
  it('keeps governingProject selection specialized so richer same-her closure lines outrank compact project shells', () => {
    const source = readFileSync(new URL('./answer-planner.ts', import.meta.url), 'utf8')

    expect(source).toContain('function projectStateLineScore(value: unknown) {')
    expect(source).toContain('if (text.includes(\'same digital life\'))')
    expect(source).toContain('if (text.includes(\'phase 1\'))')
    expect(source).toContain('if (text.includes(\'same-her\') || text.includes(\'same her\') || text.includes(\'one living\') || text.includes(\'same living\'))')
    expect(source).toContain('if (text.includes(\'closure seam explicit\'))')
    expect(source).toContain('if (text === \'same digital life | keep the closure seam explicit\')')
    expect(source).toContain('function isThinProjectAwarenessShell(value: unknown) {')
    expect(source).toContain('text.includes(\'detached project shell\') || text.includes(\'generic project shell\')')
    expect(source).toContain('const strongerCompanionHeadline = sanitizeText(consciousProjectState?.companionHeadlineLine, 320)')
    expect(source).toContain('const preferredAwarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({')
    expect(source).toContain('const weakPreferredAwarenessLead = looksLikeWeakProjectAwarenessLead(preferredAwarenessLine)')
    expect(source).toContain('strongerCompanionHeadline && weakPreferredAwarenessLead')
    expect(source).toContain('sameHerSelfLine')
  })
})
