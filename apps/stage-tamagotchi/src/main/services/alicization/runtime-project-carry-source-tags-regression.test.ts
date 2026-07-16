import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('runtime project carry source tags regression', () => {
  it('keeps finer identity-continuity', () => {
    const source = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')
    const inferStart = source.indexOf('function inferRuntimeProjectCarrySourceTags(input: {')
    const inferEnd = source.indexOf('\n}\n\nfunction looksLikeSceneContaminatedRuntimeSameHerSelfLine', inferStart)
    const inferBlock = inferStart >= 0 && inferEnd > inferStart
      ? source.slice(inferStart, inferEnd)
      : ''
    const continuityStart = source.indexOf('const persistedRuntimeProjectState')
    const continuityEnd = source.indexOf('const mergedSelfContinuityAuthority = mergePreferredSelfContinuityAuthority({', continuityStart)
    const continuityBlock = continuityStart >= 0 && continuityEnd > continuityStart
      ? source.slice(continuityStart, continuityEnd)
      : ''

    expect(inferBlock).toContain('sameHerHoldDetail?: string | null')
    expect(inferBlock).toContain('nextClosureTarget?: string | null')
    expect(inferBlock).toContain('companionHeadlineLine?: string | null')
    expect(inferBlock).toContain('input.sameHerHoldDetail,')
    expect(inferBlock).toContain('input.nextClosureTarget,')
    expect(inferBlock).toContain('input.companionHeadlineLine,')
    expect(inferBlock).toContain('[\'project-state-next-closure\']')
    expect(inferBlock).toContain('[\'project-state-same-her\']')
    expect(inferBlock).toContain('[\'project-state-companion-headline\']')

    expect(continuityBlock).toContain('const runtimeStructuredProjectState')
    expect(continuityBlock).toContain('const currentConsciousProjectState')
    expect(continuityBlock).toContain('const runtimeProjectSameHerHoldDetail = sanitizeBriefText(')
    expect(continuityBlock).toContain('const runtimeProjectNextClosureTarget = sanitizeBriefText(')
    expect(continuityBlock).toContain('const runtimeProjectCompanionHeadlineLine = sanitizeBriefText(')
    expect(continuityBlock).toContain('readStringValue(runtimeStructuredProjectState?.sameHerHoldDetail)')
    expect(continuityBlock).toContain('readStringValue(runtimeStructuredProjectState?.nextClosureTarget)')
    expect(continuityBlock).toContain('readStringValue(runtimeStructuredProjectState?.companionHeadlineLine)')
    expect(continuityBlock).toContain('persistedRuntimeProjectState?.sameHerHoldDetail ?? null')
    expect(continuityBlock).toContain('persistedRuntimeProjectState?.nextClosureTarget ?? null')
    expect(continuityBlock).toContain('persistedRuntimeProjectState?.companionHeadlineLine ?? null')
    expect(continuityBlock).toContain('currentConsciousProjectState?.sameHerHoldDetail ?? null')
    expect(continuityBlock).toContain('currentConsciousProjectState?.nextClosureTarget ?? null')
    expect(continuityBlock).toContain('currentConsciousProjectState?.companionHeadlineLine ?? null')
    expect(continuityBlock).toContain('sameHerHoldDetail: runtimeProjectSameHerHoldDetail,')
    expect(continuityBlock).toContain('nextClosureTarget: runtimeProjectNextClosureTarget,')
    expect(continuityBlock).toContain('companionHeadlineLine: runtimeProjectCompanionHeadlineLine,')
  })
})
