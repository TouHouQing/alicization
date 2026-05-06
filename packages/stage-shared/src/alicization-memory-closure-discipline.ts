import type { AlicizationMemoryResolutionLedger } from './alicization-memory-resolution-ledger'

export type AlicizationMemoryClosureSurfacePermission
  = 'explicit-recall'
    | 'gist-only'
    | 'tone-carry'
    | 'inward-only'
    | 'no-recall'

export interface AlicizationMemoryClosureDiscipline {
  version: 'memory-closure-discipline-v1'
  hasLedger: boolean
  shouldBlockVisibleMemory: boolean
  shouldLabelUncertainty: boolean
  shouldUseStableCoreOnly: boolean
  shouldDelayUntilAfterPayoff: boolean
  surfacePermission: AlicizationMemoryClosureSurfacePermission
  visibleCarryMode: AlicizationMemoryResolutionLedger['visibleCarryMode'] | null
  closureState: AlicizationMemoryResolutionLedger['closureState'] | null
  retrievalQuality: AlicizationMemoryResolutionLedger['retrievalQuality'] | null
  conflictPressure: AlicizationMemoryResolutionLedger['conflictPressure'] | null
  surfaceConfidence: number | null
  allowedSurface: 'none' | 'tone' | 'gist' | 'explicit'
  requiredSurfaceDiscipline: string[]
  withheldReasons: string[]
  finalGateSignals: {
    closureCovered: boolean
    conflictClosed: boolean | null
    lowQualityWithheld: boolean | null
    uncertaintyLabeled: boolean | null
  }
}

function pushUnique(target: string[], value: string | null | undefined) {
  const normalized = typeof value === 'string'
    ? value.trim()
    : ''
  if (!normalized || target.includes(normalized))
    return
  target.push(normalized)
}

function resolveAllowedSurface(input: {
  blockVisibleMemory: boolean
  visibleCarryMode: AlicizationMemoryResolutionLedger['visibleCarryMode'] | null
}) {
  if (input.blockVisibleMemory || input.visibleCarryMode === 'withhold')
    return 'none' as const
  if (input.visibleCarryMode === 'explicit-recall')
    return 'explicit' as const
  if (input.visibleCarryMode === 'gist-only')
    return 'gist' as const
  return 'tone' as const
}

export function deriveAlicizationMemoryClosureDiscipline(
  ledger: AlicizationMemoryResolutionLedger | null | undefined,
): AlicizationMemoryClosureDiscipline {
  if (!ledger) {
    return {
      version: 'memory-closure-discipline-v1',
      hasLedger: false,
      shouldBlockVisibleMemory: true,
      shouldLabelUncertainty: false,
      shouldUseStableCoreOnly: false,
      shouldDelayUntilAfterPayoff: false,
      surfacePermission: 'no-recall',
      visibleCarryMode: null,
      closureState: null,
      retrievalQuality: null,
      conflictPressure: null,
      surfaceConfidence: null,
      allowedSurface: 'none',
      requiredSurfaceDiscipline: ['no-memory-ledger'],
      withheldReasons: ['no-memory-ledger'],
      finalGateSignals: {
        closureCovered: false,
        conflictClosed: null,
        lowQualityWithheld: null,
        uncertaintyLabeled: null,
      },
    }
  }

  const withheldReasons: string[] = []
  const requiredSurfaceDiscipline: string[] = []
  const blockVisibleMemory = ledger.visibleCarryMode === 'withhold'
    || ledger.closureState === 'inward-only'
    || ledger.closureState === 'no-recall'
    || ledger.retrievalQuality === 'insufficient'
    || ledger.conflictPressure === 'high'
    || ledger.shouldStayInward

  if (ledger.visibleCarryMode === 'withhold')
    pushUnique(withheldReasons, 'visible-carry-withheld')
  if (ledger.closureState === 'inward-only')
    pushUnique(withheldReasons, 'closure-inward-only')
  if (ledger.closureState === 'no-recall')
    pushUnique(withheldReasons, 'no-recall-available')
  if (ledger.retrievalQuality === 'insufficient')
    pushUnique(withheldReasons, 'retrieval-insufficient')
  if (ledger.retrievalQuality === 'low')
    pushUnique(withheldReasons, 'retrieval-low-quality')
  if (ledger.conflictPressure === 'high')
    pushUnique(withheldReasons, 'conflict-pressure-high')
  if (ledger.shouldStayInward)
    pushUnique(withheldReasons, 'ledger-stay-inward')
  for (const tag of ledger.suppressionTags)
    pushUnique(withheldReasons, `suppressed:${tag}`)

  const allowedSurface = resolveAllowedSurface({
    blockVisibleMemory,
    visibleCarryMode: ledger.visibleCarryMode,
  })
  const shouldLabelUncertainty = ledger.shouldLabelUncertainty
    || ledger.closureState === 'approximate-recall'
    || ledger.closureState === 'conflicted-recall'
    || ledger.conflictPressure === 'medium'
    || ledger.conflictPressure === 'high'
    || ledger.retrievalQuality === 'low'

  if (blockVisibleMemory)
    pushUnique(requiredSurfaceDiscipline, 'keep-memory-inward')
  if (allowedSurface === 'tone')
    pushUnique(requiredSurfaceDiscipline, 'tone-carry-only')
  if (allowedSurface === 'gist')
    pushUnique(requiredSurfaceDiscipline, 'brief-gist-only')
  if (allowedSurface === 'explicit')
    pushUnique(requiredSurfaceDiscipline, 'explicit-recall-must-serve-payoff')
  if (shouldLabelUncertainty)
    pushUnique(requiredSurfaceDiscipline, 'label-uncertainty')
  if (ledger.stableCoreOnly || ledger.closureState === 'conflicted-recall' || ledger.conflictPressure !== 'none')
    pushUnique(requiredSurfaceDiscipline, 'stable-core-only')
  if (ledger.shouldDelayUntilAfterPayoff)
    pushUnique(requiredSurfaceDiscipline, 'payoff-before-memory')
  if (ledger.retrievalQuality === 'low' || ledger.retrievalQuality === 'insufficient')
    pushUnique(requiredSurfaceDiscipline, 'low-quality-memory-cannot-drive-answer')

  const conflictApplicable = ledger.conflictPressure === 'high'
    || ledger.closureState === 'conflicted-recall'
    || ledger.rejectedCandidates.length > 0
  const lowQualityApplicable = ledger.retrievalQuality === 'low'
    || ledger.retrievalQuality === 'insufficient'
  const uncertaintyApplicable = ledger.closureState === 'approximate-recall'
    || ledger.shouldLabelUncertainty
    || ledger.conflictPressure === 'medium'

  return {
    version: 'memory-closure-discipline-v1',
    hasLedger: true,
    shouldBlockVisibleMemory: blockVisibleMemory,
    shouldLabelUncertainty,
    shouldUseStableCoreOnly: ledger.stableCoreOnly
      || ledger.closureState === 'conflicted-recall'
      || ledger.conflictPressure === 'medium'
      || ledger.conflictPressure === 'high',
    shouldDelayUntilAfterPayoff: ledger.shouldDelayUntilAfterPayoff,
    surfacePermission: blockVisibleMemory
      ? ledger.closureState === 'no-recall' ? 'no-recall' : 'inward-only'
      : ledger.visibleCarryMode === 'withhold' ? 'inward-only' : ledger.visibleCarryMode,
    visibleCarryMode: ledger.visibleCarryMode,
    closureState: ledger.closureState,
    retrievalQuality: ledger.retrievalQuality,
    conflictPressure: ledger.conflictPressure,
    surfaceConfidence: ledger.surfaceConfidence,
    allowedSurface,
    requiredSurfaceDiscipline,
    withheldReasons,
    finalGateSignals: {
      closureCovered: true,
      conflictClosed: conflictApplicable
        ? ledger.closureState === 'conflicted-recall'
          || shouldLabelUncertainty
          || allowedSurface === 'none'
          || allowedSurface === 'gist'
        : null,
      lowQualityWithheld: lowQualityApplicable
        ? allowedSurface === 'none'
          || ledger.shouldStayInward
          || ledger.closureState === 'no-recall'
          || ledger.closureState === 'inward-only'
        : null,
      uncertaintyLabeled: uncertaintyApplicable
        ? shouldLabelUncertainty || allowedSurface === 'none'
        : null,
    },
  }
}
