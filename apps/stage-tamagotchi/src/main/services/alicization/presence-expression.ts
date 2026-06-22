import type {
  AlicizationPresenceExpressionSnapshot,
  AlicizationRuntimeDigest,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'

export interface BuildAlicizationPresenceExpressionInput {
  now: number
  trigger: AlicizationPresenceExpressionSnapshot['trigger']
  previousState: AlicizationVisualPresenceStateSnapshot | null
  state: AlicizationVisualPresenceStateSnapshot
  generate?: (input: {
    state: AlicizationVisualPresenceStateSnapshot
    previousState: AlicizationVisualPresenceStateSnapshot | null
    trigger: AlicizationPresenceExpressionSnapshot['trigger']
    now: number
  }) => Promise<unknown>
}

export interface PresenceExpressionGuardInput {
  text: string
  groundingText?: string
  confidence?: number
}

interface GroundingFlags {
  sourceRefs: string[]
  stateFingerprint: string
  confidence: number
  reasonTags: string[]
  groundingText: string
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function maxFinite(values: Array<number | null | undefined>) {
  const finiteValues = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  return finiteValues.length > 0 ? Math.max(...finiteValues) : undefined
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function trimPresenceExpressionText(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim()
}

function readGeneratedText(raw: unknown) {
  if (typeof raw === 'string')
    return raw
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return ''
  const candidate = raw as { text?: unknown }
  return typeof candidate.text === 'string' ? candidate.text : ''
}

function readGeneratedConfidence(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const confidence = Number((raw as { confidence?: unknown }).confidence)
  return Number.isFinite(confidence) ? clamp01(confidence) : null
}

function createPresenceExpressionFingerprint(input: {
  state: AlicizationVisualPresenceStateSnapshot
  previousState: AlicizationVisualPresenceStateSnapshot | null
}) {
  return sanitizeText([
    input.state.currentBodyState,
    input.state.continuityMode,
    input.state.currentInwardPreoccupation,
    input.state.currentConsciousFrame?.subject,
    input.state.currentConsciousFrame?.projectState?.sameHerSelfLine,
    input.state.privateThought?.stance,
    input.state.emotionalKernel?.dominantEmotion,
    input.state.initiative?.selectedAction,
    input.previousState ? `prev:${input.previousState.currentBodyState}:${input.previousState.continuityMode}` : 'prev:none',
  ].filter(Boolean).join('|') || 'presence-expression', 180)
}

function extractSourceContribution(
  state: AlicizationVisualPresenceStateSnapshot,
  runtimeDigest: AlicizationRuntimeDigest | null | undefined,
  previousState: AlicizationVisualPresenceStateSnapshot | null,
): GroundingFlags {
  const sourceRefs: string[] = []
  const reasonTags: string[] = []
  const groundingText: string[] = []
  let confidenceAccumulator = 0
  let confidenceSamples = 0

  const pushIf = (
    source: string,
    valid: boolean,
    reason: string,
    value?: number,
    grounding?: unknown,
  ) => {
    if (!valid)
      return
    if (!sourceRefs.includes(source))
      sourceRefs.push(source)
    if (reason)
      reasonTags.push(reason)
    const groundingSnippet = sanitizeText(grounding, 320)
    if (groundingSnippet)
      groundingText.push(`${source}:${groundingSnippet}`)
    if (typeof value === 'number' && Number.isFinite(value)) {
      confidenceAccumulator += clamp01(value)
      confidenceSamples += 1
    }
  }

  const privateThoughtGrounding = [
    state.privateThought?.stance,
    state.privateThought?.thoughtText,
    state.privateThought?.emotionalTension,
    ...(state.privateThought?.rationaleTags ?? []),
  ].filter(Boolean).join(' ')
  pushIf(
    'privateThought',
    Boolean(state.privateThought?.thoughtText),
    'privateThought',
    state.privateThought?.confidence,
    privateThoughtGrounding,
  )
  pushIf(
    'currentInwardPreoccupation',
    Boolean(state.currentInwardPreoccupation),
    'currentInwardPreoccupation',
    state.currentInwardPreoccupation ? 0.62 : undefined,
    state.currentInwardPreoccupation,
  )
  const emotionalKernelGrounding = [
    state.emotionalKernel?.dominantEmotion,
    state.emotionalKernel?.initiativeMode,
    state.emotionalKernel?.memoryRecallMode,
    state.emotionalKernel?.embodimentTone,
    state.emotionalKernel?.why,
    ...(state.emotionalKernel?.reasonTags ?? []),
  ].filter(Boolean).join(' ')
  pushIf(
    'emotionalKernel',
    Boolean(state.emotionalKernel),
    'emotionalKernel',
    state.emotionalKernel?.guardedness,
    emotionalKernelGrounding,
  )
  const initiativeGrounding = [
    state.initiative?.selectedAction,
    state.initiative?.preferredStyle,
    state.initiative?.preferredPresence,
    state.initiative?.why,
    state.initiative?.continuityRestraint,
  ].filter(Boolean).join(' ')
  pushIf(
    'initiative',
    Boolean(state.initiative),
    'initiative',
    state.initiative?.confidence,
    initiativeGrounding,
  )
  const affectiveResidueGrounding = [
    state.affectiveResidue?.dominantResidueKind,
    state.affectiveResidue?.summary,
    state.affectiveResidue?.relationshipCadence?.cadenceMode,
    state.affectiveResidue?.relationshipCadence?.distancePosture,
  ].filter(Boolean).join(' ')
  const affectiveResiduePressure = maxFinite([
    state.affectiveResidue?.afterglowPressure,
    state.affectiveResidue?.repairPressure,
    state.affectiveResidue?.burdenPressure,
    state.affectiveResidue?.trustPressure,
    state.affectiveResidue?.restProtectivePressure,
  ])
  pushIf(
    'affectiveResidue',
    Boolean(state.affectiveResidue?.summary) || Boolean(state.affectiveResidue?.residues?.length),
    'affectiveResidue',
    affectiveResiduePressure,
    affectiveResidueGrounding,
  )
  const activeLoop = runtimeDigest?.activeLoop
  const runtimeDigestGrounding = [
    activeLoop?.phase,
    activeLoop?.dominantChannel,
    activeLoop?.handoffTarget,
    activeLoop?.continuityArcStage,
    activeLoop?.summary,
    runtimeDigest?.summary,
  ].filter(Boolean).join(' ')
  pushIf(
    'runtimeDigest',
    Boolean(activeLoop),
    'runtimeDigest',
    Number(runtimeDigest?.continuityPressure),
    runtimeDigestGrounding,
  )

  const confidence = confidenceSamples > 0 ? clamp01(confidenceAccumulator / confidenceSamples) : 0

  return {
    sourceRefs,
    stateFingerprint: createPresenceExpressionFingerprint({ state, previousState }),
    confidence,
    reasonTags: [...new Set(reasonTags)].slice(0, 8),
    groundingText: groundingText.join(' | '),
  }
}

function isDefaultThinPresenceState(state: AlicizationVisualPresenceStateSnapshot) {
  return !state.privateThought
    && !state.currentInwardPreoccupation
    && !state.emotionalKernel
    && !state.initiative
    && !state.affectiveResidue
    && !state.runtimeDigest?.activeLoop
}

const bannedTemplates = [
  '我在旁边，先不打扰你。',
  '这条线我还记着，先轻一点。',
]

const bannedKeywordPatterns = [
  /\bphase\s*1\b/i,
  /\bproject\b/i,
  /\bmodule\b/i,
  /\bdebug\b/i,
  /\bruntime\b/i,
  /\bvisualPresenceState\b/i,
  /项目|模块|调试|运行时|状态快照|视觉状态/,
]

const hostActionRequestCuePattern = /^(?:请你?|麻烦你?|帮我|你能|你可以|你应该|你需要|能否|可不可以|可以|应该|需要)|帮我/
const hostActionVerbPattern = /打开|关闭|启动|运行|执行|创建|删除|删掉|安装|配置|设置|检查|查看|处理|清理|打印|结束|做/
const directHostActionPattern = /^(?:打开|关闭|启动|运行|执行|创建|删除|删掉|安装|配置|设置|检查|查看|处理|清理|打印|结束)/

function isHostActionText(text: string) {
  const compact = text.replace(/[\s，。！？、,.!?;；:：]/g, '')
  return directHostActionPattern.test(compact)
    || (hostActionRequestCuePattern.test(compact) && hostActionVerbPattern.test(compact))
}

function isBannedText(text: string): string[] {
  const trimmed = trimPresenceExpressionText(text)
  const flags: string[] = []
  if (!trimmed)
    return flags

  const normalized = trimmed.toLowerCase().replace(/\s+/g, '')
  for (const template of bannedTemplates) {
    if (normalized === template.toLowerCase())
      flags.push('banned-template')
  }

  for (const pattern of bannedKeywordPatterns) {
    if (pattern.test(trimmed))
      flags.push('banned-template')
  }

  if (isHostActionText(trimmed))
    flags.push('host-action')

  return [...new Set(flags)]
}

function guardAlicizationPresenceExpressionText(input: PresenceExpressionGuardInput) {
  const text = trimPresenceExpressionText(input.text)
  if (!text)
    return { accepted: false, qualityFlags: ['blank-text'] }
  if (text.length > 80)
    return { accepted: false, qualityFlags: ['text-too-long'] }

  const flags = isBannedText(text)
  if (flags.length > 0)
    return { accepted: false, qualityFlags: flags }

  const groundingText = sanitizeText(input.groundingText, 420)
  const hasGrounding = groundingText.length >= 24
    && /privateThought|emotionalKernel|initiative|currentInwardPreoccupation|affectiveResidue|runtimeDigest/i.test(groundingText)
  if (!hasGrounding)
    return { accepted: false, qualityFlags: ['thin-grounding'] }

  const confidence = clamp01(Number.isFinite(input.confidence) ? Number(input.confidence) : 1)
  if (confidence < 0.55)
    return { accepted: false, qualityFlags: ['low-confidence'] }

  return { accepted: true, qualityFlags: [] }
}

function countGroundingRefs(sourceRefs: string[]) {
  return sourceRefs.length
}

export async function buildAlicizationPresenceExpression(
  input: BuildAlicizationPresenceExpressionInput,
): Promise<AlicizationPresenceExpressionSnapshot | null> {
  const { now, trigger, previousState, state, generate } = input
  if (!generate)
    return null
  if (isDefaultThinPresenceState(state))
    return null

  const grounding = extractSourceContribution(state, state.runtimeDigest, previousState)

  if (countGroundingRefs(grounding.sourceRefs) < 2)
    return null

  if (state.privateThought?.shouldSpeak === true)
    return null

  if (grounding.confidence < 0.55)
    return null

  let rawResult: unknown
  try {
    rawResult = await generate({
      state,
      previousState,
      trigger,
      now,
    })
  }
  catch {
    return null
  }

  const generatedText = readGeneratedText(rawResult)
  const generatedConfidence = readGeneratedConfidence(rawResult)
  if (generatedConfidence != null && generatedConfidence < 0.55)
    return null
  const confidence = grounding.confidence
  const finalText = trimPresenceExpressionText(generatedText)

  const groundedText = finalText

  if (!finalText)
    return null

  const guard = guardAlicizationPresenceExpressionText({
    text: groundedText,
    groundingText: grounding.groundingText,
    confidence,
  })
  if (!guard.accepted)
    return null

  if (confidence < 0.55)
    return null

  const sceneFingerprint = state.currentScene
    ? `${state.currentScene.scenario}:${state.currentScene.workloadKind}:${state.currentScene.beganAt}`
    : 'scene'
  const id = `${trigger}:${sceneFingerprint}:${now}`

  return {
    version: 'presence-expression-v1',
    id,
    text: groundedText,
    trigger,
    display: {
      mode: 'near-body-whisper',
      allowAutoShow: true,
      createdAt: now,
      expiresAt: now + 6_000,
      intensity: confidence >= 0.75 ? 'soft' : 'barely-there',
    },
    grounding: {
      sourceRefs: grounding.sourceRefs,
      reasonTags: grounding.reasonTags,
      stateFingerprint: grounding.stateFingerprint,
      confidence,
    },
    audit: {
      generated: true,
      withheldReason: null,
      qualityFlags: guard.qualityFlags,
    },
  }
}

export { guardAlicizationPresenceExpressionText }
