import { describe, expect, it } from 'vitest'

import { validateLifePersonaRevision } from './life-persona-revision-policy'
import { defaultFrontmatter, toSoulContent } from './runtime-soul'

describe('continuous learned persona scope', () => {
  it('allows a small temperament change while preserving name, values and human directives', () => {
    const before = structuredClone(defaultFrontmatter)
    const after = structuredClone(before)
    after.personality.obedience += 0.02
    after.personality.identityKernel!.temperament!.obedience = Number(before.personality.obedience) + 0.02
    expect(() => validateLifePersonaRevision(toSoulContent(before, 'same life'), toSoulContent(after, 'a reviewed expression change'))).not.toThrow()
    after.profile.alicizationName = 'someone else'
    expect(() => validateLifePersonaRevision(toSoulContent(before, 'same life'), toSoulContent(after, 'changed'))).toThrow('identity')
  })
  it('rejects an abrupt temperament jump and a change to stable values', () => {
    const before = structuredClone(defaultFrontmatter)
    const after = structuredClone(before)
    after.personality.obedience = 0.9
    after.personality.identityKernel!.temperament!.obedience = 0.9
    expect(() => validateLifePersonaRevision(toSoulContent(before, 'same life'), toSoulContent(after, 'changed'))).toThrow('bounded')
    after.personality = structuredClone(before.personality)
    after.personality.identityKernel!.valueBias = ['domineering']
    expect(() => validateLifePersonaRevision(toSoulContent(before, 'same life'), toSoulContent(after, 'changed'))).toThrow('stable identity')
  })
})
