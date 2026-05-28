import type { VRMCore } from '@pixiv/three-vrm-core'

import { VRMExpression } from '@pixiv/three-vrm-core'
import { ref } from 'vue'

import { resolveVrmExpressionAliasCandidates } from './capabilities'

interface EmotionExpressionEntry {
  name: string
  value: number
}

interface EmotionState {
  expression: EmotionExpressionEntry[]
  blendDuration?: number
  affectsMouth?: boolean
}

interface ExpressionLayerState {
  current: Map<string, number>
  target: Map<string, number>
  blendDuration: number
}

type ExpressionBindLike = VRMExpression['binds'][number]

interface RoutedMouthExpressionState {
  mouthBinds: ExpressionBindLike[]
  shadowName: string
}

const internalMouthShadowPrefix = '__airi_internal_mouth__'
const defaultMouthExpressionNames = ['aa', 'ee', 'ih', 'oh', 'ou']

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function createLayerState(defaultBlendDuration: number): ExpressionLayerState {
  return {
    current: new Map(),
    target: new Map(),
    blendDuration: defaultBlendDuration,
  }
}

function normalizeExpressionName(raw: unknown) {
  return typeof raw === 'string' ? raw.trim() : ''
}

function normalizeExpressionIdentity(raw: unknown) {
  return normalizeExpressionName(raw).toLowerCase()
}

function mergeExpressionEntries(entries: EmotionExpressionEntry[]) {
  const mergedEntries = new Map<string, number>()
  entries.forEach((entry) => {
    const normalizedName = normalizeExpressionName(entry.name)
    if (!normalizedName)
      return

    mergedEntries.set(
      normalizedName,
      clamp01((mergedEntries.get(normalizedName) ?? 0) + clamp01(entry.value)),
    )
  })

  return [...mergedEntries.entries()].map(([name, value]) => ({ name, value }))
}

function hasMorphTargetDictionary(
  primitive: unknown,
): primitive is { morphTargetDictionary?: Record<string, number>, uuid?: string } {
  return typeof primitive === 'object' && primitive !== null
}

function isMorphTargetBind(
  bind: ExpressionBindLike,
): bind is ExpressionBindLike & { index: number, primitives: Array<{ morphTargetDictionary?: Record<string, number>, uuid?: string }> } {
  return Number.isInteger((bind as { index?: unknown }).index)
    && Array.isArray((bind as { primitives?: unknown }).primitives)
}

function isLikelyMouthMorphTargetName(name: string) {
  const normalized = name.trim().toLowerCase()
  if (!normalized)
    return false

  return /mouth|lip|viseme|phoneme|jaw/.test(normalized)
    || defaultMouthExpressionNames.includes(normalized)
}

export function useVRMEmote(vrm: VRMCore) {
  const currentEmotion = ref<string | null>(null)
  const currentFacialCue = ref<string | null>(null)
  const isTransitioning = ref(false)
  const transitionProgress = ref(0)
  const resetTimeout = ref<number>()

  const expressionManager = vrm.expressionManager
  const supportedExpressionNameMap = new Map<string, string>()
  Object.keys(expressionManager?.expressionMap ?? {})
    .forEach((expressionName) => {
      const normalizedName = normalizeExpressionIdentity(expressionName)
      if (!normalizedName || supportedExpressionNameMap.has(normalizedName))
        return

      supportedExpressionNameMap.set(normalizedName, expressionName)
    })
  const supportedExpressions = new Set(
    [...supportedExpressionNameMap.values()]
      .map(name => normalizeExpressionName(name))
      .filter(Boolean),
  )
  const managedExpressionNames = new Set<string>()
  const routedMouthExpressions = new Map<string, RoutedMouthExpressionState>()
  const mouthExpressionNames = new Set(
    [
      ...(expressionManager?.mouthExpressionNames ?? []),
      ...defaultMouthExpressionNames,
    ]
      .flatMap(name => resolveVrmExpressionAliasCandidates(normalizeExpressionIdentity(name)))
      .filter(Boolean),
  )
  const baseLayerMouthAffectedNames = new Set<string>()
  const facialLayerMouthAffectedNames = new Set<string>()
  const objectIds = new WeakMap<object, string>()
  let nextObjectId = 0

  const baseLayer = createLayerState(0.35)
  const facialLayer = createLayerState(0.18)
  const blinkLayer = createLayerState(0.08)
  const visemeLayer = createLayerState(0.06)

  const emotionStates = new Map<string, EmotionState>([
    ['happy', {
      expression: [{ name: 'happy', value: 0.7 }],
      blendDuration: 0.35,
      affectsMouth: true,
    }],
    ['sad', {
      expression: [{ name: 'sad', value: 0.7 }],
      blendDuration: 0.35,
      affectsMouth: true,
    }],
    ['angry', {
      expression: [{ name: 'angry', value: 0.7 }],
      blendDuration: 0.28,
      affectsMouth: true,
    }],
    ['surprised', {
      expression: [{ name: 'surprised', value: 0.8 }],
      blendDuration: 0.16,
      affectsMouth: true,
    }],
    ['concerned', {
      expression: [{ name: 'sad', value: 0.42 }],
      blendDuration: 0.3,
      affectsMouth: true,
    }],
    ['tired', {
      expression: [{ name: 'relaxed', value: 0.6 }],
      blendDuration: 0.35,
      affectsMouth: false,
    }],
    ['apologetic', {
      expression: [{ name: 'relaxed', value: 0.4 }, { name: 'sad', value: 0.2 }],
      blendDuration: 0.3,
      affectsMouth: true,
    }],
    ['thinking', {
      expression: [{ name: 'relaxed', value: 0.22 }],
      blendDuration: 0.3,
      affectsMouth: false,
    }],
    ['neutral', {
      expression: [{ name: 'neutral', value: 1 }],
      blendDuration: 0.5,
      affectsMouth: false,
    }],
  ])

  let mouthOverrideAlpha = 0
  let visemeActive = false

  function resolveSupportedExpressionName(expressionName: string) {
    const normalizedExpressionName = normalizeExpressionName(expressionName)
    if (!normalizedExpressionName)
      return ''

    if (isInternalMouthShadowExpression(normalizedExpressionName))
      return normalizedExpressionName

    const candidates = resolveVrmExpressionAliasCandidates(normalizedExpressionName)
    for (const candidate of candidates) {
      const resolvedName = supportedExpressionNameMap.get(candidate)
      if (resolvedName)
        return resolvedName
    }

    return supportedExpressions.size === 0
      ? normalizedExpressionName
      : ''
  }

  function resolveSupportedExpressionNames(expressionName: string) {
    const normalizedExpressionName = normalizeExpressionName(expressionName)
    if (!normalizedExpressionName)
      return []

    if (isInternalMouthShadowExpression(normalizedExpressionName))
      return [normalizedExpressionName]

    const resolvedNames = new Set<string>()
    const candidates = resolveVrmExpressionAliasCandidates(normalizedExpressionName)
    candidates.forEach((candidate) => {
      const resolvedName = supportedExpressionNameMap.get(candidate)
      if (resolvedName)
        resolvedNames.add(resolvedName)
    })

    if (resolvedNames.size > 0)
      return [...resolvedNames]

    return supportedExpressions.size === 0
      ? [normalizedExpressionName]
      : []
  }

  function resolveExpression(name: string) {
    const normalizedName = normalizeExpressionName(name)
    if (!normalizedName)
      return null

    if (isInternalMouthShadowExpression(normalizedName))
      return expressionManager?.getExpression(normalizedName) ?? null

    const resolvedName = resolveSupportedExpressionName(normalizedName)
    if (resolvedName)
      return expressionManager?.getExpression(resolvedName) ?? null

    return expressionManager?.getExpression(normalizedName) ?? null
  }

  function resolveObjectId(target: object) {
    const existing = objectIds.get(target)
    if (existing)
      return existing

    nextObjectId += 1
    const created = `obj:${nextObjectId}`
    objectIds.set(target, created)
    return created
  }

  function resolveMorphTargetBindSignature(bind: ExpressionBindLike) {
    if (!isMorphTargetBind(bind))
      return null

    const primitiveIds = bind.primitives
      .map((primitive) => {
        if (!hasMorphTargetDictionary(primitive))
          return null

        return typeof primitive.uuid === 'string' && primitive.uuid
          ? primitive.uuid
          : resolveObjectId(primitive)
      })
      .filter((item): item is string => Boolean(item))
      .sort()

    if (primitiveIds.length === 0)
      return null

    return `${primitiveIds.join('|')}#${bind.index}`
  }

  function resolveMorphTargetBindNames(bind: ExpressionBindLike) {
    if (!isMorphTargetBind(bind))
      return []

    const names = new Set<string>()
    bind.primitives.forEach((primitive) => {
      if (!hasMorphTargetDictionary(primitive) || !primitive.morphTargetDictionary)
        return

      Object.entries(primitive.morphTargetDictionary).forEach(([name, index]) => {
        if (index === bind.index)
          names.add(name)
      })
    })

    return [...names]
  }

  function collectKnownMouthBindSignatures() {
    const signatures = new Set<string>()
    mouthExpressionNames.forEach((name) => {
      const expression = resolveExpression(name)
      if (!expression)
        return

      expression.binds.forEach((bind) => {
        const signature = resolveMorphTargetBindSignature(bind)
        if (signature)
          signatures.add(signature)
      })
    })
    return signatures
  }

  function isMouthRelatedBind(bind: ExpressionBindLike, knownMouthBindSignatures: Set<string>) {
    const signature = resolveMorphTargetBindSignature(bind)
    if (signature && knownMouthBindSignatures.has(signature))
      return true

    return resolveMorphTargetBindNames(bind).some(name => isLikelyMouthMorphTargetName(name))
  }

  function isInternalMouthShadowExpression(name: string) {
    return normalizeExpressionIdentity(name).startsWith(internalMouthShadowPrefix)
  }

  function restoreRoutedMouthExpression(expressionName: string) {
    const normalizedName = normalizeExpressionName(expressionName)
    if (!normalizedName)
      return

    const routed = routedMouthExpressions.get(normalizedName)
    if (!routed)
      return

    const expression = resolveExpression(normalizedName)
    if (expression) {
      routed.mouthBinds.forEach(bind => expression.addBind(bind))
    }

    const shadowExpression = resolveExpression(routed.shadowName)
    if (shadowExpression)
      expressionManager?.unregisterExpression(shadowExpression)

    managedExpressionNames.delete(routed.shadowName)
    routedMouthExpressions.delete(normalizedName)
  }

  function ensureRoutedMouthExpression(expressionName: string, knownMouthBindSignatures: Set<string>) {
    const normalizedName = normalizeExpressionName(expressionName)
    if (!normalizedName || routedMouthExpressions.has(normalizedName))
      return

    const expression = resolveExpression(normalizedName)
    if (!expression)
      return

    const isolatedMouthBinds = expression.binds.filter(bind => isMouthRelatedBind(bind, knownMouthBindSignatures))
    // NOTICE: some VRM custom expressions hide mouth movement in anonymous binds.
    // If we cannot isolate those mouth binds reliably, route the whole expression
    // through the shadow layer so visemes still get exclusive mouth ownership.
    const mouthBinds = isolatedMouthBinds.length > 0
      ? isolatedMouthBinds
      : [...expression.binds]
    if (mouthBinds.length === 0)
      return

    mouthBinds.forEach(bind => expression.deleteBind(bind))

    const shadowName = `${internalMouthShadowPrefix}${normalizedName}`
    const existingShadow = resolveExpression(shadowName)
    if (existingShadow)
      expressionManager?.unregisterExpression(existingShadow)

    const shadowExpression = new VRMExpression(shadowName)
    shadowExpression.isBinary = false
    mouthBinds.forEach(bind => shadowExpression.addBind(bind))
    expressionManager?.registerExpression(shadowExpression)

    managedExpressionNames.add(shadowName)
    routedMouthExpressions.set(normalizedName, {
      mouthBinds,
      shadowName,
    })
  }

  function syncRoutedMouthExpressions() {
    const desired = new Set<string>([
      ...baseLayerMouthAffectedNames,
      ...facialLayerMouthAffectedNames,
    ])

    for (const expressionName of routedMouthExpressions.keys()) {
      if (!desired.has(expressionName))
        restoreRoutedMouthExpression(expressionName)
    }

    const knownMouthBindSignatures = collectKnownMouthBindSignatures()
    desired.forEach(expressionName => ensureRoutedMouthExpression(expressionName, knownMouthBindSignatures))
  }

  function replaceExpressionNameSet(target: Set<string>, names: string[]) {
    target.clear()
    names
      .map(name => resolveSupportedExpressionName(name))
      .filter(Boolean)
      .forEach(name => target.add(name))

    syncRoutedMouthExpressions()
  }

  function clearResetTimeout() {
    if (!resetTimeout.value)
      return

    clearTimeout(resetTimeout.value)
    resetTimeout.value = undefined
  }

  function setLayerTarget(layer: ExpressionLayerState, weights: Record<string, number>, blendDuration?: number) {
    layer.target.clear()
    layer.blendDuration = Math.max(0.05, blendDuration ?? layer.blendDuration)

    Object.entries(weights).forEach(([name, value]) => {
      const normalizedName = resolveSupportedExpressionName(name)
      const normalizedValue = clamp01(value)
      if (!normalizedName || normalizedValue <= 0.001)
        return

      layer.target.set(normalizedName, normalizedValue)
      managedExpressionNames.add(normalizedName)
    })
  }

  function updateLayer(layer: ExpressionLayerState, deltaTime: number) {
    const blendDuration = Math.max(0.05, layer.blendDuration)
    const smoothing = 1 - Math.exp(-deltaTime / blendDuration)
    const nextNames = new Set<string>([
      ...layer.current.keys(),
      ...layer.target.keys(),
    ])

    nextNames.forEach((name) => {
      const currentValue = layer.current.get(name) ?? 0
      const targetValue = layer.target.get(name) ?? 0
      const nextValue = currentValue + (targetValue - currentValue) * smoothing
      if (Math.abs(nextValue) <= 0.001 && targetValue <= 0.001) {
        layer.current.delete(name)
        return
      }
      layer.current.set(name, clamp01(nextValue))
    })
  }

  function toWeightRecord(entries: EmotionExpressionEntry[], intensity = 1) {
    const normalizedIntensity = clamp01(intensity)
    return Object.fromEntries(entries.map(entry => [entry.name, entry.value * normalizedIntensity]))
  }

  function resolveEmotionState(emotionName: string) {
    const normalizedName = normalizeExpressionName(emotionName).toLowerCase()
    const state = emotionStates.get(normalizedName) ?? emotionStates.get('neutral')!
    const filteredExpressions = mergeExpressionEntries(
      state.expression
        .map((entry) => {
          const resolvedExpressionName = resolveSupportedExpressionName(entry.name)
          if (!resolvedExpressionName)
            return null

          return {
            ...entry,
            name: resolvedExpressionName,
          }
        })
        .filter((entry): entry is EmotionExpressionEntry => Boolean(entry)),
    )

    if (filteredExpressions.length > 0) {
      return {
        ...state,
        expression: filteredExpressions,
      }
    }

    const neutral = emotionStates.get('neutral')!
    return {
      ...neutral,
      expression: mergeExpressionEntries(
        neutral.expression
          .map((entry) => {
            const resolvedExpressionName = resolveSupportedExpressionName(entry.name)
            if (!resolvedExpressionName)
              return null

            return {
              ...entry,
              name: resolvedExpressionName,
            }
          })
          .filter((entry): entry is EmotionExpressionEntry => Boolean(entry)),
      ),
    }
  }

  function setEmotion(
    emotionName: string,
    intensity = 1,
    options?: { blendDuration?: number },
  ) {
    clearResetTimeout()

    const state = resolveEmotionState(emotionName)
    currentEmotion.value = normalizeExpressionName(emotionName) || 'neutral'
    isTransitioning.value = true
    transitionProgress.value = 0

    const weights = toWeightRecord(state.expression, intensity)
    setLayerTarget(baseLayer, weights, options?.blendDuration ?? state.blendDuration)
    replaceExpressionNameSet(
      baseLayerMouthAffectedNames,
      state.affectsMouth === true
        ? Object.keys(weights)
        : [],
    )
  }

  function setEmotionWithResetAfter(
    emotionName: string,
    ms: number,
    intensity = 1,
    options?: { blendDuration?: number },
  ) {
    clearResetTimeout()
    setEmotion(emotionName, intensity, options)

    resetTimeout.value = window.setTimeout(() => {
      setEmotion('neutral', 1, options)
      resetTimeout.value = undefined
    }, ms)
  }

  function setFacialCue(expressionName: string | null | undefined, intensity = 1, options?: { affectsMouth?: boolean, blendDuration?: number }) {
    clearResetTimeout()

    const normalizedName = resolveSupportedExpressionName(normalizeExpressionName(expressionName))
    currentFacialCue.value = normalizedName || null

    if (!normalizedName) {
      setLayerTarget(facialLayer, {}, options?.blendDuration)
      replaceExpressionNameSet(facialLayerMouthAffectedNames, [])
      return
    }

    setLayerTarget(facialLayer, { [normalizedName]: clamp01(intensity) }, options?.blendDuration)
    replaceExpressionNameSet(
      facialLayerMouthAffectedNames,
      options?.affectsMouth === true
        ? [normalizedName]
        : [],
    )
  }

  function updateCurrentFacialCueOptions(options?: { affectsMouth?: boolean }) {
    replaceExpressionNameSet(
      facialLayerMouthAffectedNames,
      currentFacialCue.value && options?.affectsMouth === true
        ? [currentFacialCue.value]
        : [],
    )
  }

  function currentFacialCueAffectsMouth() {
    return currentFacialCue.value != null && facialLayerMouthAffectedNames.has(currentFacialCue.value)
  }

  function setVisemeWeights(weights: Record<string, number>, active: boolean) {
    const resolvedWeights: Record<string, number> = {}
    Object.entries(weights).forEach(([name, value]) => {
      const resolvedName = resolveSupportedExpressionName(name)
      if (!resolvedName)
        return

      resolvedWeights[resolvedName] = Math.max(
        clamp01(value),
        resolvedWeights[resolvedName] ?? 0,
      )
    })

    visemeActive = active
    Object.keys(resolvedWeights).forEach(name => managedExpressionNames.add(name))
    setLayerTarget(visemeLayer, resolvedWeights, 0.06)
  }

  function setBlinkWeights(weights: Record<string, number>) {
    const resolvedWeights: Record<string, number> = {}
    Object.entries(weights).forEach(([name, value]) => {
      const normalizedName = normalizeExpressionIdentity(name)
      if (normalizedName === 'blink') {
        const blinkNames = resolveSupportedExpressionNames('blink')
        blinkNames.forEach((blinkName) => {
          resolvedWeights[blinkName] = Math.max(
            clamp01(value),
            resolvedWeights[blinkName] ?? 0,
          )
        })
        return
      }

      const resolvedName = resolveSupportedExpressionName(name)
      if (!resolvedName)
        return

      resolvedWeights[resolvedName] = Math.max(
        clamp01(value),
        resolvedWeights[resolvedName] ?? 0,
      )
    })

    Object.keys(resolvedWeights).forEach(name => managedExpressionNames.add(name))
    setLayerTarget(blinkLayer, resolvedWeights, 0.08)
  }

  function addEmotionState(emotionName: string, state: EmotionState) {
    emotionStates.set(emotionName, state)
  }

  function removeEmotionState(emotionName: string) {
    emotionStates.delete(emotionName)
  }

  function update(deltaTime: number) {
    if (!expressionManager)
      return

    updateLayer(baseLayer, deltaTime)
    updateLayer(facialLayer, deltaTime)
    updateLayer(blinkLayer, deltaTime)
    updateLayer(visemeLayer, deltaTime)

    const visemePeak = Math.max(0, ...Array.from(visemeLayer.current.values()))
    const shouldOverrideMouth = visemeActive || visemePeak > 0.015
    const overrideTarget = shouldOverrideMouth ? 1 : 0
    const overrideSmoothing = 1 - Math.exp(-(shouldOverrideMouth ? 18 : 7) * deltaTime)
    mouthOverrideAlpha += (overrideTarget - mouthOverrideAlpha) * overrideSmoothing
    mouthOverrideAlpha = clamp01(mouthOverrideAlpha)

    const logicalNames = new Set<string>(
      [...managedExpressionNames].filter(name => !isInternalMouthShadowExpression(name)),
    )

    logicalNames.forEach((name) => {
      if (supportedExpressions.size > 0 && !supportedExpressions.has(name))
        return

      const performanceWeight = clamp01(
        (baseLayer.current.get(name) ?? 0)
        + (facialLayer.current.get(name) ?? 0)
        + (blinkLayer.current.get(name) ?? 0),
      )
      const visemeWeight = clamp01(visemeLayer.current.get(name) ?? 0)
      const routed = routedMouthExpressions.get(name)

      if (routed) {
        expressionManager.setValue(name, performanceWeight)
        expressionManager.setValue(routed.shadowName, clamp01(performanceWeight * (1 - mouthOverrideAlpha)))
        return
      }

      expressionManager.setValue(name, clamp01(performanceWeight + visemeWeight))
    })

    transitionProgress.value = clamp01(transitionProgress.value + deltaTime / Math.max(0.05, baseLayer.blendDuration))
    isTransitioning.value = transitionProgress.value < 1
  }

  function dispose() {
    for (const expressionName of routedMouthExpressions.keys())
      restoreRoutedMouthExpression(expressionName)
    clearResetTimeout()
  }

  return {
    currentEmotion,
    currentFacialCue,
    currentFacialCueAffectsMouth,
    isTransitioning,
    setEmotion,
    setEmotionWithResetAfter,
    setFacialCue,
    updateCurrentFacialCueOptions,
    setBlinkWeights,
    setVisemeWeights,
    update,
    addEmotionState,
    removeEmotionState,
    dispose,
  }
}
