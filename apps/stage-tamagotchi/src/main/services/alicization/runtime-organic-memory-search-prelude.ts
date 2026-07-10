import type { AlicizationEpisodicEventRecord } from '../../../shared/eventa'
import type { OrganicMemoryPromptContext } from './runtime-soul'

export function sanitizeOrganicMemoryText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function sanitizePromptText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 6) {
  const result: string[] = []
  for (const value of values) {
    const normalized = String(value ?? '').trim().replace(/\s+/g, ' ')
    if (!normalized)
      continue
    if (result.some(item => item.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function splitRecallSeedFieldValues(
  raw: string,
  separator: RegExp,
  maxItems = 6,
) {
  if (!raw)
    return []

  return uniqueList(
    raw
      .split(separator)
      .map(item => sanitizePromptText(item, 220))
      .filter(Boolean),
    maxItems,
  )
}

export function isPresentFacingSelfCritiqueRecallSeed(recallSeed: string) {
  const normalized = sanitizePromptText(recallSeed, 420).toLowerCase()
  if (!normalized)
    return false

  const selfOwned = /subject=alicization-self|current_turn_subject=alicization-self|dialogue-first|answer-self|self-owned/u.test(normalized)
  const styleComplaint = /表现得.*开心|开心一点|说人话|别这么(?:客气|冷淡|温柔|直接)|为什么这样回我|别这样回我|太公式化|像个人一点|sound more human|be happier|too polite|too cold|why are you talking like this/u.test(normalized)
  return selfOwned && styleComplaint
}

function parseRuntimeContinuityCarry(recallSeed: string) {
  const line = recallSeed
    .split('\n')
    .map(item => item.trim())
    .find(item => item.startsWith('mirror_runtime_continuity:'))
  if (!line)
    return null

  const payload = line.slice('mirror_runtime_continuity:'.length).trim()
  if (!payload)
    return null

  const fields = new Map<string, string>()
  for (const segment of payload.split('|')) {
    const normalized = segment.trim()
    if (!normalized)
      continue
    const separatorIndex = normalized.indexOf('=')
    if (separatorIndex <= 0)
      continue
    const key = normalized.slice(0, separatorIndex).trim().toLowerCase()
    const value = sanitizePromptText(normalized.slice(separatorIndex + 1).trim(), 160)
    if (!key || !value)
      continue
    fields.set(key, value)
  }

  const readField = (...keys: string[]) => {
    for (const key of keys) {
      const value = fields.get(key)
      if (value)
        return value
    }
    return ''
  }

  const loop = readField('loop')
  const project = readField('project')
  const dominant = fields.get('dominant') ?? ''
  const phase = fields.get('phase') ?? ''
  const handoff = fields.get('handoff') ?? ''
  const stage = fields.get('stage') ?? ''
  const thread = fields.get('thread') ?? ''
  const carry = fields.get('carry') ?? ''
  const anchor = fields.get('anchor') ?? ''
  const from = fields.get('from') ?? ''
  const to = fields.get('to') ?? ''
  const scenario = fields.get('scenario') ?? ''
  const reason = fields.get('reason') ?? ''
  const projectPreflight = readField('project_preflight', 'preflight')
  const sameHer = readField('same_her', 'same-her')
  const driftRisk = readField('drift_risk', 'same_her_drift_risk')
  const landed = readField('landed')
  const open = readField('open', 'unresolved')
  const openFocus = readField('open-focus', 'open_focus')
  const next = readField('next')
  const nextFocus = readField('next-focus', 'next_focus')
  if (
    !loop
    && !project
    && !dominant
    && !phase
    && !handoff
    && !stage
    && !thread
    && !carry
    && !anchor
    && !from
    && !to
    && !scenario
    && !reason
    && !projectPreflight
    && !sameHer
    && !driftRisk
    && !landed
    && !open
    && !openFocus
    && !next
    && !nextFocus
  ) {
    return null
  }

  return {
    loop,
    project,
    dominant,
    phase,
    handoff,
    stage,
    thread,
    carry,
    anchor,
    from,
    to,
    scenario,
    reason,
    projectPreflight,
    sameHer,
    driftRisk,
    landed,
    open,
    openFocus,
    next,
    nextFocus,
  }
}

function parseHeldAutonomyCarry(recallSeed: string) {
  const line = recallSeed
    .split('\n')
    .map(item => item.trim())
    .find(item => item.startsWith('continuity_held_autonomy:'))
  if (!line)
    return null

  const payload = line.slice('continuity_held_autonomy:'.length).trim()
  if (!payload)
    return null

  const fields = new Map<string, string>()
  for (const segment of payload.split('|')) {
    const normalized = segment.trim()
    if (!normalized)
      continue
    const separatorIndex = normalized.indexOf('=')
    if (separatorIndex <= 0)
      continue
    const key = normalized.slice(0, separatorIndex).trim().toLowerCase()
    const value = sanitizePromptText(normalized.slice(separatorIndex + 1).trim(), 160)
    if (!key || !value)
      continue
    fields.set(key, value)
  }

  const readField = (...keys: string[]) => {
    for (const key of keys) {
      const value = fields.get(key)
      if (value)
        return value
    }
    return ''
  }

  const label = readField('label')
  const summary = readField('summary')
  const thread = readField('thread')
  const intent = readField('intent')
  const goal = readField('goal')
  const defer = readField('defer')
  const whyNow = readField('why_now', 'why-now')
  const lineValue = readField('line')
  const projectPreflight = readField('project_preflight', 'preflight')
  const landed = readField('landed')
  const sameHer = readField('same_her', 'same-her')
  const driftRisk = readField('drift_risk', 'same_her_drift_risk')
  const openFocus = readField('open_focus', 'open-focus')
  const nextFocus = readField('next_focus', 'next-focus')
  const projectEmotionalClosure = readField('project_emotional_closure', 'emotion')
  if (
    !label
    && !summary
    && !thread
    && !intent
    && !goal
    && !defer
    && !whyNow
    && !lineValue
    && !projectPreflight
    && !landed
    && !sameHer
    && !driftRisk
    && !openFocus
    && !nextFocus
    && !projectEmotionalClosure
  ) {
    return null
  }

  return {
    label,
    summary,
    thread,
    intent,
    goal,
    defer,
    whyNow,
    lineValue,
    projectPreflight,
    landed,
    sameHer,
    driftRisk,
    openFocus,
    nextFocus,
    projectEmotionalClosure,
  }
}

function parseProjectStateCarry(recallSeed: string) {
  const line = recallSeed
    .split('\n')
    .map(item => item.trim())
    .find(item => item.startsWith('continuity_project_state:'))
  if (!line)
    return null

  const payload = line.slice('continuity_project_state:'.length).trim()
  if (!payload)
    return null

  const fields = new Map<string, string>()
  for (const segment of payload.split('|')) {
    const normalized = segment.trim()
    if (!normalized)
      continue
    const separatorIndex = normalized.indexOf('=')
    if (separatorIndex <= 0)
      continue
    const key = normalized.slice(0, separatorIndex).trim().toLowerCase()
    const value = sanitizePromptText(normalized.slice(separatorIndex + 1).trim(), 160)
    if (!key || !value)
      continue
    fields.set(key, value)
  }

  const readField = (...keys: string[]) => {
    for (const key of keys) {
      const value = fields.get(key)
      if (value)
        return value
    }
    return ''
  }

  const label = readField('label')
  const summary = readField('summary')
  const projectPreDialogue = readField('project_pre_dialogue', 'project-pre-dialogue')
  const projectPreflight = readField('project_preflight', 'preflight')
  const phase = readField('phase')
  const landed = readField('landed')
  const unresolved = readField('unresolved', 'open')
  const openFocus = readField('open_focus', 'open-focus')
  const nextFocus = readField('next_focus', 'next-focus')
  const next = readField('next')
  const sameHer = readField('same_her', 'same-her')
  const driftRisk = readField('drift_risk', 'same_her_drift_risk')
  const emotion = readField('emotion', 'project_emotional_closure')
  if (
    !label
    && !summary
    && !projectPreDialogue
    && !projectPreflight
    && !phase
    && !landed
    && !unresolved
    && !openFocus
    && !nextFocus
    && !next
    && !sameHer
    && !driftRisk
    && !emotion
  ) {
    return null
  }

  return {
    label,
    summary,
    projectPreDialogue,
    projectPreflight,
    phase,
    landed,
    unresolved,
    openFocus,
    nextFocus,
    next,
    sameHer,
    driftRisk,
    emotion,
  }
}

function parseCadenceReconfirmationCarry(recallSeed: string) {
  const line = recallSeed
    .split('\n')
    .map(item => item.trim())
    .find(item => item.startsWith('continuity_cadence_reconfirmation:'))
  if (!line)
    return null

  const payload = line.slice('continuity_cadence_reconfirmation:'.length).trim()
  if (!payload)
    return null

  const fields = new Map<string, string>()
  for (const segment of payload.split('|')) {
    const normalized = segment.trim()
    if (!normalized)
      continue
    const separatorIndex = normalized.indexOf('=')
    if (separatorIndex <= 0)
      continue
    const key = normalized.slice(0, separatorIndex).trim().toLowerCase()
    const value = sanitizePromptText(normalized.slice(separatorIndex + 1).trim(), 160)
    if (!key || !value)
      continue
    fields.set(key, value)
  }

  const readField = (...keys: string[]) => {
    for (const key of keys) {
      const value = fields.get(key)
      if (value)
        return value
    }
    return ''
  }

  const label = readField('label')
  const summary = readField('summary')
  const thread = readField('thread')
  const cadence = readField('cadence')
  const lineValue = readField('line')
  const body = readField('body')
  const blink = readField('blink')
  const gaze = readField('gaze')
  const whyNow = readField('why_now', 'why-now')
  const resident = readField('resident')
  const continuity = readField('continuity')
  if (
    !label
    && !summary
    && !thread
    && !cadence
    && !lineValue
    && !body
    && !blink
    && !gaze
    && !whyNow
    && !resident
    && !continuity
  ) {
    return null
  }

  return {
    label,
    summary,
    thread,
    cadence,
    lineValue,
    body,
    blink,
    gaze,
    whyNow,
    resident,
    continuity,
  }
}

function parseAfterglowCarry(recallSeed: string) {
  const line = recallSeed
    .split('\n')
    .map(item => item.trim())
    .find(item => item.startsWith('continuity_afterglow:'))
  if (!line)
    return null

  const payload = line.slice('continuity_afterglow:'.length).trim()
  if (!payload)
    return null

  const knownKeys = ['label', 'summary', 'thread', 'kind']
  const tokenPattern = new RegExp(`(?:^|\\s)(${knownKeys.join('|')})=`, 'g')
  const matches = [...payload.matchAll(tokenPattern)]
  if (matches.length === 0)
    return null

  const fields = new Map<string, string>()
  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index]
    const next = matches[index + 1]
    const key = current[1]?.trim().toLowerCase()
    const start = (current.index ?? 0) + current[0].length
    const end = next?.index ?? payload.length
    const rawValue = payload
      .slice(start, end)
      .trim()
    const value = sanitizePromptText(rawValue, 220)
    if (!key || !value)
      continue
    fields.set(key, value)
  }

  const summary = fields.get('summary') ?? ''
  const summaryFields = new Map<string, string>()
  for (const segment of summary.split('|')) {
    const normalized = segment.trim()
    if (!normalized)
      continue
    const separatorIndex = normalized.indexOf('=')
    if (separatorIndex <= 0)
      continue
    const key = normalized.slice(0, separatorIndex).trim().toLowerCase()
    const value = sanitizePromptText(normalized.slice(separatorIndex + 1).trim(), 160)
    if (!key || !value)
      continue
    summaryFields.set(key, value)
  }

  const label = fields.get('label') ?? ''
  const thread = fields.get('thread') ?? summaryFields.get('thread') ?? ''
  const kind = fields.get('kind') ?? ''
  const continuity = summaryFields.get('continuity') ?? ''
  const carryMode = summaryFields.get('carry-mode') ?? summaryFields.get('carry_mode') ?? ''
  const carry = summaryFields.get('carry') ?? ''
  const source = summaryFields.get('source') ?? ''
  const provenance = summaryFields.get('provenance') ?? ''
  if (!label && !summary && !thread && !kind && !continuity && !carryMode && !carry && !source && !provenance)
    return null

  return {
    label,
    summary,
    thread,
    kind,
    continuity,
    carryMode,
    carry,
    source,
    provenance,
  }
}

function parseHumanlikeMemoryRecallCarry(recallSeed: string) {
  const line = recallSeed
    .split('\n')
    .map(item => item.trim())
    .find(item => item.startsWith('humanlike_memory_recall:'))
  if (!line)
    return null

  const payload = line.slice('humanlike_memory_recall:'.length).trim()
  if (!payload)
    return null

  const knownKeys = [
    'line',
    'relationship',
    'emotion',
    'host_emotion_label',
    'host_emotion_summary',
    'self_emotion_label',
    'self_emotion_summary',
    'initiative',
    'initiative_window',
    'initiative_pressure',
    'initiative_anti_spam',
    'initiative_visible',
    'initiative_visible_policy',
    'initiative_outcome',
    'initiative_reaction',
    'initiative_strategy',
    'embodiment',
    'embodiment_recall_strength',
    'embodiment_modality_risk',
    'embodiment_face',
    'embodiment_gaze',
    'embodiment_blink',
    'embodiment_voice',
    'embodiment_pause',
    'embodiment_lipsync',
    'embodiment_pacing',
    'embodiment_resident_face',
    'embodiment_resident_action',
    'embodiment_resident_mode',
    'embodiment_resident_reason',
    'self',
    'why',
    'certainty',
    'reason',
    'downrank',
    'merge',
    'forget',
    'metabolism',
    'created',
  ]
  const tokenPattern = new RegExp(`(?:^|\\s\\|\\s)(${knownKeys.join('|')})=`, 'g')
  const matches = [...payload.matchAll(tokenPattern)]
  if (matches.length === 0)
    return null

  const fields = new Map<string, string>()
  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index]
    const next = matches[index + 1]
    const key = current[1]?.trim().toLowerCase()
    const start = (current.index ?? 0) + current[0].length
    const end = next?.index ?? payload.length
    const rawValue = payload
      .slice(start, end)
      .replace(/^\s*\|\s*/u, '')
      .replace(/\s*\|\s*$/u, '')
      .trim()
    const value = sanitizePromptText(
      rawValue,
      key === 'metabolism'
        ? 520
        : 220,
    )
    if (!key || !value)
      continue
    fields.set(key, value)
  }

  const lineValue = fields.get('line') ?? ''
  const relationship = fields.get('relationship') ?? ''
  const emotion = fields.get('emotion') ?? ''
  const hostEmotionLabel = fields.get('host_emotion_label') ?? ''
  const hostEmotionSummary = fields.get('host_emotion_summary') ?? ''
  const selfEmotionLabel = fields.get('self_emotion_label') ?? ''
  const selfEmotionSummary = fields.get('self_emotion_summary') ?? ''
  const initiative = fields.get('initiative') ?? ''
  const initiativeWindow = fields.get('initiative_window') ?? ''
  const initiativePressure = fields.get('initiative_pressure') ?? ''
  const initiativeAntiSpam = fields.get('initiative_anti_spam') ?? ''
  const initiativeVisible = fields.get('initiative_visible_policy') ?? fields.get('initiative_visible') ?? ''
  const initiativeOutcome = fields.get('initiative_outcome') ?? ''
  const initiativeReaction = fields.get('initiative_reaction') ?? ''
  const initiativeStrategy = fields.get('initiative_strategy') ?? ''
  const embodiment = fields.get('embodiment') ?? ''
  const embodimentRecallStrength = fields.get('embodiment_recall_strength') ?? ''
  const embodimentModalityRisk = fields.get('embodiment_modality_risk') ?? ''
  const embodimentFace = fields.get('embodiment_face') ?? ''
  const embodimentGaze = fields.get('embodiment_gaze') ?? ''
  const embodimentBlink = fields.get('embodiment_blink') ?? ''
  const embodimentVoice = fields.get('embodiment_voice') ?? ''
  const embodimentPause = fields.get('embodiment_pause') ?? ''
  const embodimentLipsync = fields.get('embodiment_lipsync') ?? ''
  const embodimentPacing = fields.get('embodiment_pacing') ?? ''
  const embodimentResidentFace = fields.get('embodiment_resident_face') ?? ''
  const embodimentResidentAction = fields.get('embodiment_resident_action') ?? ''
  const embodimentResidentMode = fields.get('embodiment_resident_mode') ?? ''
  const embodimentResidentReason = fields.get('embodiment_resident_reason') ?? ''
  const self = fields.get('self') ?? ''
  const why = fields.get('why') ?? ''
  const certainty = fields.get('certainty') ?? ''
  const reason = fields.get('reason') ?? ''
  const downrank = fields.get('downrank') ?? ''
  const merge = fields.get('merge') ?? ''
  const forget = fields.get('forget') ?? ''
  const metabolism = fields.get('metabolism') ?? ''
  const created = fields.get('created') ?? ''
  if (
    !lineValue
    && !relationship
    && !emotion
    && !hostEmotionLabel
    && !hostEmotionSummary
    && !selfEmotionLabel
    && !selfEmotionSummary
    && !initiative
    && !initiativeWindow
    && !initiativePressure
    && !initiativeAntiSpam
    && !initiativeVisible
    && !initiativeOutcome
    && !initiativeReaction
    && !initiativeStrategy
    && !embodiment
    && !embodimentRecallStrength
    && !embodimentModalityRisk
    && !embodimentFace
    && !embodimentGaze
    && !embodimentBlink
    && !embodimentVoice
    && !embodimentPause
    && !embodimentLipsync
    && !embodimentPacing
    && !embodimentResidentFace
    && !embodimentResidentAction
    && !embodimentResidentMode
    && !embodimentResidentReason
    && !self
    && !why
    && !certainty
    && !reason
    && !downrank
    && !merge
    && !forget
    && !metabolism
    && !created
  ) {
    return null
  }

  return {
    lineValue,
    relationship,
    emotion,
    hostEmotionLabel,
    hostEmotionSummary,
    selfEmotionLabel,
    selfEmotionSummary,
    initiative,
    initiativeWindow,
    initiativePressure,
    initiativeAntiSpam,
    initiativeVisible,
    initiativeOutcome,
    initiativeReaction,
    initiativeStrategy,
    embodiment,
    embodimentRecallStrength,
    embodimentModalityRisk,
    embodimentFace,
    embodimentGaze,
    embodimentBlink,
    embodimentVoice,
    embodimentPause,
    embodimentLipsync,
    embodimentPacing,
    embodimentResidentFace,
    embodimentResidentAction,
    embodimentResidentMode,
    embodimentResidentReason,
    self,
    why,
    certainty,
    reason,
    downrank,
    merge,
    forget,
    metabolism,
    created,
  }
}

function parseRecollectionAfterthoughtCarry(recallSeed: string) {
  const line = recallSeed
    .split('\n')
    .map(item => item.trim())
    .find(item => item.startsWith('mirror_recollection_afterthought:'))
  if (!line)
    return null

  const payload = line.slice('mirror_recollection_afterthought:'.length).trim()
  if (!payload)
    return null

  const knownKeys = ['mode', 'certainty', 'foreground', 'surface', 'afterthought', 'surface_mode', 'placement', 'visible', 'style']
  const tokenPattern = new RegExp(`(?:^|\\s|\\|)(${knownKeys.join('|')})=`, 'g')
  const matches = [...payload.matchAll(tokenPattern)]
  if (matches.length === 0)
    return null

  const fields = new Map<string, string>()
  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index]
    const next = matches[index + 1]
    const key = current[1]?.trim().toLowerCase()
    const start = (current.index ?? 0) + current[0].length
    const end = next?.index ?? payload.length
    const rawValue = payload
      .slice(start, end)
      .replace(/^\s*\|\s*/u, '')
      .replace(/\s*\|\s*$/u, '')
      .trim()
    const value = sanitizePromptText(rawValue, 160)
    if (!key || !value)
      continue
    fields.set(key, value)
  }

  const mode = fields.get('mode') ?? ''
  const certainty = fields.get('certainty') ?? ''
  const foreground = fields.get('foreground') ?? ''
  const surface = fields.get('surface') ?? ''
  const afterthought = fields.get('afterthought') ?? ''
  const surfaceMode = fields.get('surface_mode') ?? ''
  const placement = fields.get('placement') ?? ''
  const visible = fields.get('visible') ?? ''
  const style = fields.get('style') ?? ''
  if (!mode && !certainty && !foreground && !surface && !afterthought && !surfaceMode && !placement && !visible && !style)
    return null

  return {
    mode,
    certainty,
    foreground,
    surface,
    afterthought,
    surfaceMode,
    placement,
    visible,
    style,
  }
}

function deriveRuntimeContinuityTriggeredIntent(input: {
  recallSeed: string
}): OrganicMemoryPromptContext['recollectionIntent'] | null {
  const continuity = parseRuntimeContinuityCarry(input.recallSeed)
  if (!continuity)
    return null

  const runtimeText = [
    continuity.loop,
    continuity.project,
    continuity.dominant,
    continuity.phase,
    continuity.handoff,
    continuity.stage,
    continuity.thread,
    continuity.carry,
    continuity.anchor,
    continuity.from,
    continuity.to,
    continuity.scenario,
    continuity.reason,
    continuity.projectPreflight,
    continuity.sameHer,
    continuity.driftRisk,
    continuity.landed,
    continuity.open,
    continuity.openFocus,
    continuity.next,
    continuity.nextFocus,
  ].filter(Boolean).join(' ').toLowerCase()
  const procedureTriggered = /runtime|repair|seam|task|workflow|execution|dialogue|handoff|grounded|coding|执行|修复|链路|任务|流程/u.test(runtimeText)
  if (!procedureTriggered)
    return null

  const scenario = continuity.scenario || continuity.thread || continuity.to || continuity.phase || continuity.dominant
  const reason
    = continuity.reason
      || continuity.sameHer
      || continuity.open
      || continuity.next
      || continuity.projectPreflight
      || continuity.carry
      || continuity.anchor
      || continuity.handoff
      || continuity.stage
      || continuity.phase
      || continuity.dominant
  const queryHints = uniqueList([
    continuity.sameHer,
    continuity.open,
    continuity.next,
    reason,
    scenario,
    continuity.projectPreflight,
    continuity.landed,
    continuity.driftRisk,
    continuity.openFocus,
    continuity.nextFocus,
    continuity.stage,
    continuity.thread,
    continuity.carry,
    continuity.anchor,
    continuity.handoff,
    continuity.to,
    continuity.from,
  ], 8)
  const candidateProcedureLines = uniqueList([
    continuity.sameHer,
    continuity.open,
    continuity.next,
    reason,
    continuity.projectPreflight,
    continuity.thread,
    continuity.carry,
    continuity.anchor,
    continuity.handoff,
    scenario,
    continuity.dominant,
  ], 6)

  return {
    mode: 'execution-procedure',
    temporalFocus: 'experience-matched',
    searchEpisodes: true,
    searchConversations: false,
    searchProceduralExperience: true,
    queryHints,
    rationale: sanitizePromptText(
      'Runtime continuity carry suggests that the next recollection should reopen the remembered way this active seam was handled, not drift into generic history.',
      220,
    ),
    confidence: clamp01(
      0.74
      + (continuity.reason || continuity.carry ? 0.08 : 0)
      + (continuity.scenario || continuity.thread ? 0.04 : 0)
      + (continuity.stage === 'same-thread-continuation' ? 0.04 : 0),
    ),
    recollectionAgenda: {
      whyRecallNow: 'The current turn is carrying an unfinished runtime seam, so remembered procedure continuity should reopen before older conversation history.',
      goalSimilarity: clamp01(0.82 + (continuity.reason || continuity.carry ? 0.08 : 0)),
      relationshipNeed: clamp01(0.14 + (continuity.dominant === 'dialogue' ? 0.06 : 0)),
      affectivePull: clamp01(0.16 + (continuity.reason || continuity.carry ? 0.04 : 0)),
      sceneFamiliarity: clamp01(0.62 + (continuity.scenario || continuity.thread ? 0.08 : 0)),
      candidateTimeScopes: [
        {
          scope: 'experience-matched',
          weight: 0.94,
          rationale: 'A matching runtime seam matters more than an exact date window.',
        },
        {
          scope: 'recent-or-mid',
          weight: 0.42,
          rationale: 'Recent carry remains a secondary anchor if the seam needs a narrower period.',
        },
      ],
      candidateEraFacets: [
        {
          facet: 'task-era',
          weight: 0.95,
          rationale: 'The continuity carry points to an unfinished task period rather than a relationship phase.',
        },
        {
          facet: 'window',
          weight: 0.36,
          rationale: 'A bounded window can still stabilize the recollection if needed.',
        },
      ],
      candidateProcedureLines,
      uncertaintyTolerance: 'medium',
    },
  }
}

function deriveHeldAutonomyTriggeredIntent(input: {
  recallSeed: string
}): OrganicMemoryPromptContext['recollectionIntent'] | null {
  const continuity = parseHeldAutonomyCarry(input.recallSeed)
  if (!continuity)
    return null

  const runtimeText = [
    continuity.label,
    continuity.summary,
    continuity.thread,
    continuity.intent,
    continuity.goal,
    continuity.defer,
    continuity.whyNow,
    continuity.lineValue,
    continuity.projectPreflight,
    continuity.landed,
    continuity.sameHer,
    continuity.driftRisk,
    continuity.openFocus,
    continuity.nextFocus,
    continuity.projectEmotionalClosure,
  ].filter(Boolean).join(' ').toLowerCase()
  const procedureTriggered = /hold|held|defer|wait|later|return|reopen|continue|closure|task|workflow|execution|runtime|project|phase 1|same-her|same line|执行|回来|继续|闭环|数字生命/u.test(runtimeText)
  if (!procedureTriggered)
    return null

  const scenario = continuity.thread || continuity.intent || continuity.label
  const reason
    = continuity.goal
      || continuity.sameHer
      || continuity.whyNow
      || continuity.projectPreflight
      || continuity.summary
      || continuity.lineValue
      || continuity.defer
      || continuity.intent
      || continuity.label
  const queryHints = uniqueList([
    continuity.sameHer,
    continuity.goal,
    reason,
    scenario,
    continuity.projectPreflight,
    continuity.landed,
    continuity.driftRisk,
    continuity.openFocus,
    continuity.nextFocus,
    continuity.projectEmotionalClosure,
    continuity.lineValue,
    continuity.whyNow,
  ], 8)
  const candidateProcedureLines = uniqueList([
    continuity.sameHer,
    continuity.goal,
    continuity.whyNow,
    continuity.projectPreflight,
    continuity.lineValue,
    continuity.projectEmotionalClosure,
    continuity.summary,
    reason,
  ], 6)

  return {
    mode: 'execution-procedure',
    temporalFocus: 'experience-matched',
    searchEpisodes: true,
    searchConversations: false,
    searchProceduralExperience: true,
    queryHints,
    rationale: sanitizePromptText(
      'Held autonomy continuity suggests that the next recollection should reopen the deliberately deferred same line instead of flattening it into generic history.',
      220,
    ),
    confidence: clamp01(
      0.72
      + (continuity.goal || continuity.sameHer ? 0.08 : 0)
      + (continuity.thread || continuity.intent ? 0.04 : 0)
      + (continuity.projectPreflight || continuity.driftRisk ? 0.04 : 0),
    ),
    recollectionAgenda: {
      whyRecallNow: 'The current turn is reopening a deliberately held continuity line, so remembered procedure continuity should return before generic background memory.',
      goalSimilarity: clamp01(0.8 + (continuity.goal || continuity.sameHer ? 0.1 : 0)),
      relationshipNeed: clamp01(0.16 + (continuity.lineValue || continuity.projectEmotionalClosure ? 0.08 : 0)),
      affectivePull: clamp01(0.18 + (continuity.sameHer || continuity.projectEmotionalClosure ? 0.08 : 0)),
      sceneFamiliarity: clamp01(0.58 + (continuity.thread || continuity.intent ? 0.1 : 0)),
      candidateTimeScopes: [
        {
          scope: 'experience-matched',
          weight: 0.93,
          rationale: 'The deferred line should reopen by matching the same kind of carried seam, not by exact date.',
        },
        {
          scope: 'recent-or-mid',
          weight: 0.44,
          rationale: 'Recent carry still helps if the reopened line needs a narrower remembered period.',
        },
      ],
      candidateEraFacets: [
        {
          facet: 'task-era',
          weight: 0.93,
          rationale: 'The held continuity points to an unfinished working period that should reopen as the same line.',
        },
        {
          facet: 'relationship-era',
          weight: 0.34,
          rationale: 'The held line also protects identity continuity, so relationship carry remains a secondary anchor.',
        },
      ],
      candidateProcedureLines,
      uncertaintyTolerance: 'medium',
    },
  }
}

function deriveProjectStateTriggeredIntent(input: {
  recallSeed: string
}): OrganicMemoryPromptContext['recollectionIntent'] | null {
  const continuity = parseProjectStateCarry(input.recallSeed)
  if (!continuity)
    return null

  const runtimeText = [
    continuity.label,
    continuity.summary,
    continuity.projectPreDialogue,
    continuity.projectPreflight,
    continuity.phase,
    continuity.landed,
    continuity.unresolved,
    continuity.openFocus,
    continuity.nextFocus,
    continuity.next,
    continuity.sameHer,
    continuity.driftRisk,
    continuity.emotion,
  ].filter(Boolean).join(' ').toLowerCase()
  const procedureTriggered = /project|phase 1|digital life|same-her|same line|closure|reopen|continue|unfinished|memory|initiative|embodiment|task|workflow|execution|runtime|数字生命|闭环|继续|同一条线/u.test(runtimeText)
  if (!procedureTriggered)
    return null

  const scenario = continuity.phase || continuity.label
  const reason
    = continuity.unresolved
      || continuity.sameHer
      || continuity.next
      || continuity.projectPreflight
      || continuity.summary
      || continuity.emotion
      || continuity.label
  const queryHints = uniqueList([
    continuity.sameHer,
    continuity.unresolved,
    continuity.next,
    reason,
    scenario,
    continuity.projectPreflight,
    continuity.projectPreDialogue,
    continuity.landed,
    continuity.driftRisk,
    continuity.openFocus,
    continuity.nextFocus,
    continuity.emotion,
  ], 8)
  const candidateProcedureLines = uniqueList([
    continuity.sameHer,
    continuity.unresolved,
    continuity.next,
    continuity.projectPreflight,
    continuity.projectPreDialogue,
    continuity.emotion,
    continuity.summary,
    reason,
  ], 6)

  return {
    mode: 'execution-procedure',
    temporalFocus: 'experience-matched',
    searchEpisodes: true,
    searchConversations: false,
    searchProceduralExperience: true,
    queryHints,
    rationale: sanitizePromptText(
      'Project-state continuity suggests that the next recollection should reopen the unfinished identity continuity closure line instead of collapsing it into generic project history.',
      220,
    ),
    confidence: clamp01(
      0.73
      + (continuity.unresolved || continuity.sameHer ? 0.08 : 0)
      + (continuity.next || continuity.phase ? 0.04 : 0)
      + (continuity.projectPreflight || continuity.driftRisk ? 0.04 : 0),
    ),
    recollectionAgenda: {
      whyRecallNow: 'The current turn is reopening unfinished Phase 1 project-state continuity, so remembered procedure continuity should return before generic background summary.',
      goalSimilarity: clamp01(0.81 + (continuity.unresolved || continuity.sameHer ? 0.1 : 0)),
      relationshipNeed: clamp01(0.16 + (continuity.sameHer || continuity.emotion ? 0.08 : 0)),
      affectivePull: clamp01(0.18 + (continuity.sameHer || continuity.emotion ? 0.08 : 0)),
      sceneFamiliarity: clamp01(0.6 + (continuity.phase || continuity.label ? 0.08 : 0)),
      candidateTimeScopes: [
        {
          scope: 'experience-matched',
          weight: 0.93,
          rationale: 'The unfinished project line should reopen by matching the same carried seam, not by exact date.',
        },
        {
          scope: 'recent-or-mid',
          weight: 0.43,
          rationale: 'Recent carry still helps if the reopened line needs a narrower remembered period.',
        },
      ],
      candidateEraFacets: [
        {
          facet: 'task-era',
          weight: 0.91,
          rationale: 'The project-state carry points to an unfinished working period that still needs closure as the same line.',
        },
        {
          facet: 'relationship-era',
          weight: 0.37,
          rationale: 'Relationship continuity remains a secondary anchor because the project line still belongs to the current continuity route.',
        },
      ],
      candidateProcedureLines,
      uncertaintyTolerance: 'medium',
    },
  }
}

function deriveCadenceReconfirmationTriggeredIntent(input: {
  recallSeed: string
}): OrganicMemoryPromptContext['recollectionIntent'] | null {
  const continuity = parseCadenceReconfirmationCarry(input.recallSeed)
  if (!continuity)
    return null

  const cadenceText = [
    continuity.label,
    continuity.summary,
    continuity.thread,
    continuity.cadence,
    continuity.lineValue,
    continuity.body,
    continuity.blink,
    continuity.gaze,
    continuity.whyNow,
    continuity.resident,
    continuity.continuity,
  ].filter(Boolean).join(' ').toLowerCase()
  const relationshipTriggered = /cadence|measured-return|repair-before-closeness|quiet-companionship|same-her|same thread|room-first|lower-pressure|linger|soften|relationship|callback|留白|慢一点/u.test(cadenceText)
  if (!relationshipTriggered)
    return null

  const scenario = continuity.thread || continuity.cadence || continuity.label
  const reason
    = continuity.lineValue
      || continuity.whyNow
      || continuity.continuity
      || continuity.resident
      || continuity.summary
      || continuity.body
      || continuity.cadence
      || continuity.label
  const queryHints = uniqueList([
    continuity.lineValue,
    continuity.whyNow,
    continuity.continuity,
    continuity.resident,
    reason,
    scenario,
    continuity.body,
    continuity.cadence,
    continuity.blink,
    continuity.gaze,
  ], 8)
  const candidateProcedureLines = uniqueList([
    continuity.lineValue,
    continuity.whyNow,
    continuity.continuity,
    continuity.resident,
    continuity.summary,
    reason,
  ], 6)

  return {
    mode: 'relationship-history',
    temporalFocus: 'experience-matched',
    searchEpisodes: true,
    searchConversations: false,
    searchProceduralExperience: false,
    queryHints,
    rationale: sanitizePromptText(
      'Cadence reconfirmation continuity suggests that recollection should reopen the remembered relationship rhythm before the return widens outward too quickly.',
      220,
    ),
    confidence: clamp01(
      0.71
      + (continuity.lineValue || continuity.whyNow ? 0.08 : 0)
      + (continuity.cadence || continuity.body ? 0.06 : 0)
      + (continuity.resident || continuity.continuity ? 0.05 : 0),
    ),
    recollectionAgenda: {
      whyRecallNow: 'The current turn is reopening a measured-return relationship rhythm, so remembered bond cadence should come back before broader closeness widens again.',
      goalSimilarity: clamp01(0.76 + (continuity.lineValue || continuity.whyNow ? 0.08 : 0)),
      relationshipNeed: clamp01(0.52 + (continuity.resident || continuity.continuity ? 0.12 : 0)),
      affectivePull: clamp01(0.24 + (continuity.lineValue || continuity.body ? 0.08 : 0)),
      sceneFamiliarity: clamp01(0.58 + (continuity.thread || continuity.cadence ? 0.08 : 0)),
      candidateTimeScopes: [
        {
          scope: 'experience-matched',
          weight: 0.9,
          rationale: 'The remembered return rhythm matters more than an exact timestamp because the relationship cadence is what needs reconfirming.',
        },
        {
          scope: 'recent-or-mid',
          weight: 0.42,
          rationale: 'Recent carry still helps if the bond rhythm needs a narrower remembered period.',
        },
      ],
      candidateEraFacets: [
        {
          facet: 'relationship-era',
          weight: 0.92,
          rationale: 'The cadence carry points to a remembered relationship rhythm that should reopen on the same measured-return line.',
        },
        {
          facet: 'window',
          weight: 0.34,
          rationale: 'A bounded window can still stabilize the recall if the rhythm needs a narrower anchor.',
        },
      ],
      candidateProcedureLines,
      uncertaintyTolerance: 'medium',
    },
  }
}

function deriveAfterglowTriggeredIntent(input: {
  recallSeed: string
}): OrganicMemoryPromptContext['recollectionIntent'] | null {
  const continuity = parseAfterglowCarry(input.recallSeed)
  if (!continuity)
    return null

  const afterglowText = [
    continuity.label,
    continuity.summary,
    continuity.thread,
    continuity.kind,
    continuity.continuity,
    continuity.carryMode,
    continuity.carry,
    continuity.source,
    continuity.provenance,
  ].filter(Boolean).join(' ').toLowerCase()
  const procedureTriggered = /callback|execution|runtime|repair|closure|same-her|same line|living line|phase 1|project|数字生命|回调|闭环/u.test(afterglowText)
  if (!procedureTriggered)
    return null

  const reason
    = continuity.carry
      || continuity.summary
      || continuity.continuity
      || continuity.carryMode
      || continuity.label
  const queryHints = uniqueList([
    continuity.carry,
    continuity.thread,
    reason,
    continuity.continuity,
    continuity.carryMode,
    continuity.label,
    continuity.kind,
    continuity.source,
  ], 8)
  const candidateProcedureLines = uniqueList([
    continuity.carry,
    continuity.thread,
    continuity.continuity,
    continuity.carryMode,
    continuity.summary,
    reason,
  ], 6)

  return {
    mode: 'execution-procedure',
    temporalFocus: 'experience-matched',
    searchEpisodes: true,
    searchConversations: false,
    searchProceduralExperience: true,
    queryHints,
    rationale: sanitizePromptText(
      'callback_afterglow_recall=procedure_carry; flattening_risk=generic_background_history; visibility=provider_intent_metadata',
      220,
    ),
    confidence: clamp01(
      0.71
      + (continuity.carry || continuity.summary ? 0.08 : 0)
      + (continuity.thread || continuity.label ? 0.05 : 0)
      + (continuity.carryMode === 'lower-pressure' ? 0.04 : 0),
    ),
    recollectionAgenda: {
      whyRecallNow: 'callback_afterglow_recall_now=procedure_carry_before_generic_history; restart_risk=unstructured_context_reset',
      goalSimilarity: clamp01(0.79 + (continuity.carry || continuity.continuity ? 0.09 : 0)),
      relationshipNeed: clamp01(0.18 + (/same-her|room|lower-pressure|living line/u.test(afterglowText) ? 0.08 : 0)),
      affectivePull: clamp01(0.2 + (/afterglow|same-her|room|lower-pressure/u.test(afterglowText) ? 0.08 : 0)),
      sceneFamiliarity: clamp01(0.61 + (continuity.thread || continuity.label ? 0.08 : 0)),
      candidateTimeScopes: [
        {
          scope: 'experience-matched',
          weight: 0.92,
          rationale: 'time_scope=experience_matched; anchor=callback_afterglow_procedure; date_match=not_required',
        },
        {
          scope: 'recent-or-mid',
          weight: 0.41,
          rationale: 'time_scope=recent_or_mid; anchor=bounded_afterglow_window',
        },
      ],
      candidateEraFacets: [
        {
          facet: 'task-era',
          weight: 0.89,
          rationale: 'era_facet=task; anchor=callback_afterglow_procedure; closure_state=unfinished',
        },
        {
          facet: 'relationship-era',
          weight: 0.41,
          rationale: 'era_facet=relationship; anchor=afterglow_pressure; role=secondary',
        },
      ],
      candidateProcedureLines,
      uncertaintyTolerance: 'medium',
    },
  }
}

function deriveHumanlikeMemoryRecallTriggeredIntent(input: {
  recallSeed: string
}): OrganicMemoryPromptContext['recollectionIntent'] | null {
  const continuity = parseHumanlikeMemoryRecallCarry(input.recallSeed)
  if (!continuity)
    return null

  const relationshipText = [
    continuity.lineValue,
    continuity.relationship,
    continuity.emotion,
    continuity.hostEmotionLabel,
    continuity.hostEmotionSummary,
    continuity.selfEmotionLabel,
    continuity.selfEmotionSummary,
    continuity.initiative,
    continuity.initiativeWindow,
    continuity.initiativePressure,
    continuity.initiativeAntiSpam,
    continuity.initiativeVisible,
    continuity.initiativeOutcome,
    continuity.initiativeReaction,
    continuity.initiativeStrategy,
    continuity.embodiment,
    continuity.embodimentRecallStrength,
    continuity.embodimentModalityRisk,
    continuity.embodimentFace,
    continuity.embodimentGaze,
    continuity.embodimentBlink,
    continuity.embodimentVoice,
    continuity.embodimentPause,
    continuity.embodimentLipsync,
    continuity.embodimentPacing,
    continuity.self,
    continuity.why,
    continuity.certainty,
    continuity.reason,
    continuity.downrank,
    continuity.merge,
    continuity.forget,
    continuity.metabolism,
  ].filter(Boolean).join(' ').toLowerCase()
  const vulnerableCareTriggered = /rest-protective|vulnerable-care|care-before-analysis|lighter companionship|stay nearby gently|fragile|overloaded|轻一点|先陪|不要分析太多/u.test(relationshipText)
  const relationshipTriggered = /same-person|same person|same-her|持续的人|持续性|同一个人|人格连续|continuity|relationship|host corrected|host correction|corrected memory meaning|不是催进度|not pushing for a progress recap|纠正/u.test(relationshipText)
    || vulnerableCareTriggered
  if (!relationshipTriggered)
    return null

  const scenario = continuity.relationship || continuity.lineValue
  const reason
    = continuity.why
      || continuity.metabolism
      || continuity.self
      || continuity.embodimentResidentReason
      || continuity.lineValue
      || continuity.relationship
      || continuity.embodiment
      || continuity.initiativeVisible
      || continuity.initiativeAntiSpam
      || continuity.initiativeWindow
      || continuity.initiativeStrategy
      || continuity.initiative
      || continuity.initiativeOutcome
  const downrankHints = splitRecallSeedFieldValues(continuity.downrank, /\s*,\s*/u, 6)
  const mergeHints = splitRecallSeedFieldValues(continuity.merge, /\s*,\s*/u, 6)
  const forgetHints = splitRecallSeedFieldValues(continuity.forget, /\s*,\s*/u, 6)
  const metabolismHints = splitRecallSeedFieldValues(continuity.metabolism, /\s*;\s*/u, 6)
  const initiativeHints = uniqueList([
    continuity.initiativeWindow ? `initiative_window=${continuity.initiativeWindow}` : null,
    continuity.initiativePressure ? `initiative_pressure=${continuity.initiativePressure}` : null,
    continuity.initiativeAntiSpam ? `initiative_anti_spam=${continuity.initiativeAntiSpam}` : null,
    continuity.initiativeVisible ? `initiative_visible_policy=${continuity.initiativeVisible}` : null,
    continuity.initiativeOutcome ? `initiative_outcome=${continuity.initiativeOutcome}` : null,
    continuity.initiativeReaction ? `initiative_reaction=${continuity.initiativeReaction}` : null,
    continuity.initiativeStrategy ? `initiative_strategy=${continuity.initiativeStrategy}` : null,
  ], 7)
  const affectivePerspectiveHints = uniqueList([
    continuity.hostEmotionLabel ? `host_emotion_label=${continuity.hostEmotionLabel}` : null,
    continuity.hostEmotionSummary ? `host_emotion_summary=${continuity.hostEmotionSummary}` : null,
    continuity.selfEmotionLabel ? `self_emotion_label=${continuity.selfEmotionLabel}` : null,
    continuity.selfEmotionSummary ? `self_emotion_summary=${continuity.selfEmotionSummary}` : null,
  ], 6)
  const embodimentHints = uniqueList([
    continuity.embodimentRecallStrength ? `embodiment_recall_strength=${continuity.embodimentRecallStrength}` : null,
    continuity.embodimentModalityRisk ? `embodiment_modality_risk=${continuity.embodimentModalityRisk}` : null,
    continuity.embodimentFace ? `embodiment_face=${continuity.embodimentFace}` : null,
    continuity.embodimentGaze ? `embodiment_gaze=${continuity.embodimentGaze}` : null,
    continuity.embodimentBlink ? `embodiment_blink=${continuity.embodimentBlink}` : null,
    continuity.embodimentVoice ? `embodiment_voice=${continuity.embodimentVoice}` : null,
    continuity.embodimentPause ? `embodiment_pause=${continuity.embodimentPause}` : null,
    continuity.embodimentLipsync ? `embodiment_lipsync=${continuity.embodimentLipsync}` : null,
    continuity.embodimentPacing ? `embodiment_pacing=${continuity.embodimentPacing}` : null,
    continuity.embodimentResidentFace ? `embodiment_resident_face=${continuity.embodimentResidentFace}` : null,
    continuity.embodimentResidentAction ? `embodiment_resident_action=${continuity.embodimentResidentAction}` : null,
    continuity.embodimentResidentMode ? `embodiment_resident_mode=${continuity.embodimentResidentMode}` : null,
    continuity.embodimentResidentReason ? `embodiment_resident_reason=${continuity.embodimentResidentReason}` : null,
  ], 12)
  const metabolismAware = mergeHints.length > 0 || forgetHints.length > 0 || metabolismHints.length > 0
  const queryHints = uniqueList([
    continuity.relationship,
    continuity.lineValue,
    ...affectivePerspectiveHints,
    ...initiativeHints,
    continuity.embodiment,
    ...embodimentHints,
    continuity.why,
    continuity.certainty,
    continuity.reason,
    ...downrankHints,
    ...mergeHints,
    ...forgetHints,
    ...metabolismHints,
    continuity.self,
    continuity.initiative,
    continuity.emotion,
    reason,
    scenario,
  ], 18)
  const candidateProcedureLines = uniqueList([
    continuity.relationship,
    continuity.lineValue,
    ...affectivePerspectiveHints,
    ...initiativeHints,
    continuity.embodiment,
    ...embodimentHints,
    continuity.why,
    ...metabolismHints,
    continuity.self,
    reason,
  ], 18)
  const tentativeRecall = /tentative|uncertain|not fully sure|不完全确定|seems more right|conflicting/u.test(relationshipText)

  return {
    mode: 'relationship-history',
    temporalFocus: 'experience-matched',
    searchEpisodes: true,
    searchConversations: false,
    searchProceduralExperience: false,
    queryHints,
    rationale: sanitizePromptText(
      tentativeRecall
        ? 'Humanlike memory recall continuity suggests that recollection should reopen the corrected same-person relationship meaning, but keep it tentative because conflicting newer evidence is still settling.'
        : vulnerableCareTriggered
          ? 'Humanlike memory recall continuity suggests that recollection should reopen the vulnerable care relationship meaning, keep care-before-analysis foregrounded, and stop older analysis-heavy care habits from taking over again.'
          : metabolismAware
            ? 'Humanlike memory recall continuity suggests that recollection should reopen the metabolized same-person relationship meaning, keep merged same-thread continuity foreground, and let faded noise stay background instead of reviving a generic project recap.'
            : 'Humanlike memory recall continuity suggests that recollection should reopen the corrected same-person relationship meaning before the turn collapses back into a generic project recap.',
      220,
    ),
    confidence: clamp01(
      0.74
      + (continuity.relationship || continuity.why ? 0.08 : 0)
      + (continuity.self || continuity.embodiment ? 0.05 : 0)
      + (/same-person|same person|same-her|持续的人|同一个人|continuity/u.test(relationshipText) ? 0.05 : 0),
    ),
    recollectionAgenda: {
      whyRecallNow: vulnerableCareTriggered
        ? 'The current turn is reopening a vulnerable care line, so remembered lighter companionship should return before older analysis-heavy care habits take over again.'
        : 'The current turn is reopening a corrected same-person continuity line, so remembered relationship meaning should return before generic progress pressure takes over again.',
      goalSimilarity: clamp01(0.79 + (continuity.relationship || continuity.why ? 0.09 : 0)),
      relationshipNeed: clamp01(0.56 + (continuity.self || continuity.embodiment ? 0.08 : 0)),
      affectivePull: clamp01(0.26 + (continuity.emotion || continuity.why ? 0.08 : 0)),
      sceneFamiliarity: clamp01(0.63 + (continuity.lineValue || continuity.relationship ? 0.08 : 0)),
      candidateTimeScopes: [
        {
          scope: 'experience-matched',
          weight: 0.92,
          rationale: 'Corrected same-person meaning should reopen by matching the remembered relationship seam, not by exact date.',
        },
        {
          scope: 'recent-or-mid',
          weight: 0.39,
          rationale: 'Recent carry still helps if the correction needs a narrower remembered period.',
        },
      ],
      candidateEraFacets: [
        {
          facet: 'relationship-era',
          weight: 0.94,
          rationale: vulnerableCareTriggered
            ? 'The humanlike recall line points to a vulnerable care relationship meaning that should reopen as lighter companionship before analysis-heavy habits.'
            : 'The humanlike recall line points to a corrected relationship meaning that should reopen on the same same-person continuity thread.',
        },
        {
          facet: 'window',
          weight: 0.33,
          rationale: 'A bounded window can still stabilize the recall if the correction needs a narrower anchor.',
        },
      ],
      candidateProcedureLines,
      uncertaintyTolerance: tentativeRecall
        || downrankHints.length > 0
        ? 'low'
        : 'medium',
    },
  }
}

function deriveRecollectionAfterthoughtTriggeredIntent(input: {
  recallSeed: string
}): OrganicMemoryPromptContext['recollectionIntent'] | null {
  const continuity = parseRecollectionAfterthoughtCarry(input.recallSeed)
  if (!continuity)
    return null

  const runtimeText = [
    continuity.mode,
    continuity.certainty,
    continuity.foreground,
    continuity.surface,
    continuity.afterthought,
    continuity.surfaceMode,
    continuity.placement,
    continuity.visible,
    continuity.style,
  ].filter(Boolean).join(' ').toLowerCase()
  const procedureTriggered = /afterthought|foreground|runtime|callback|recollection|same-her|same line|closure|return|room|inward|task|workflow|execution|repair|数字生命|闭环|回调|继续/u.test(runtimeText)
  if (!procedureTriggered)
    return null

  const foregroundCarry = sanitizePromptText(
    [
      continuity.foreground,
      continuity.surface ? `surface=${continuity.surface}` : '',
    ].filter(Boolean).join(' '),
    160,
  )
  const queryHints = uniqueList([
    foregroundCarry,
    continuity.visible,
    continuity.style,
    continuity.mode,
    continuity.surface,
    continuity.surfaceMode,
    continuity.certainty,
  ], 8)
  const candidateProcedureLines = uniqueList([
    foregroundCarry,
    continuity.visible,
    continuity.style,
  ], 6)

  return {
    mode: continuity.mode === 'execution-procedure'
      ? 'execution-procedure'
      : 'experience-pattern',
    temporalFocus: 'experience-matched',
    searchEpisodes: true,
    searchConversations: false,
    searchProceduralExperience: continuity.mode === 'execution-procedure' || /runtime|callback|closure|same-her|repair|execution/u.test(runtimeText),
    queryHints,
    rationale: sanitizePromptText(
      'A ripe inward recollection afterthought suggests that the next recollection should reopen the carried foreground line before it fades into generic background memory.',
      220,
    ),
    confidence: clamp01(
      0.7
      + (continuity.foreground ? 0.1 : 0)
      + (continuity.afterthought === 'ripe' ? 0.06 : 0)
      + (continuity.surface === 'inward' ? 0.04 : 0),
    ),
    recollectionAgenda: {
      whyRecallNow: 'The prior turn left a ripe inward recollection afterthought, so the carried foreground line should reopen before generic background history takes over.',
      goalSimilarity: clamp01(0.78 + (continuity.foreground ? 0.1 : 0)),
      relationshipNeed: clamp01(0.14 + (/same-her|room|inward/u.test(runtimeText) ? 0.08 : 0)),
      affectivePull: clamp01(0.16 + (/same-her|closure|room/u.test(runtimeText) ? 0.08 : 0)),
      sceneFamiliarity: clamp01(0.62 + (continuity.afterthought === 'ripe' ? 0.08 : 0)),
      candidateTimeScopes: [
        {
          scope: 'experience-matched',
          weight: 0.92,
          rationale: 'The carried foreground line matters more than an exact timestamp because it is already ripe to return.',
        },
        {
          scope: 'recent-or-mid',
          weight: 0.4,
          rationale: 'Recent carry still helps if the recollection needs a narrower remembered window.',
        },
      ],
      candidateEraFacets: [
        {
          facet: 'task-era',
          weight: 0.84,
          rationale: 'The ripe afterthought points back to the unfinished working seam that stayed active under the surface.',
        },
        {
          facet: 'relationship-era',
          weight: 0.4,
          rationale: 'An execution callback continuity line also carries relationship continuity as a secondary anchor.',
        },
      ],
      candidateProcedureLines,
      uncertaintyTolerance: 'medium',
    },
  }
}

export function deriveSceneTriggeredRecollectionIntent(input: {
  recallSeed: string
  recalledEpisodes: AlicizationEpisodicEventRecord[]
}): OrganicMemoryPromptContext['recollectionIntent'] | null {
  if (isPresentFacingSelfCritiqueRecallSeed(input.recallSeed))
    return null

  const runtimeContinuityIntent = deriveRuntimeContinuityTriggeredIntent({
    recallSeed: input.recallSeed,
  })
  if (runtimeContinuityIntent)
    return runtimeContinuityIntent

  const heldAutonomyIntent = deriveHeldAutonomyTriggeredIntent({
    recallSeed: input.recallSeed,
  })
  if (heldAutonomyIntent)
    return heldAutonomyIntent

  const humanlikeMemoryRecallIntent = deriveHumanlikeMemoryRecallTriggeredIntent({
    recallSeed: input.recallSeed,
  })
  if (humanlikeMemoryRecallIntent)
    return humanlikeMemoryRecallIntent

  const projectStateIntent = deriveProjectStateTriggeredIntent({
    recallSeed: input.recallSeed,
  })
  if (projectStateIntent)
    return projectStateIntent

  const afterglowIntent = deriveAfterglowTriggeredIntent({
    recallSeed: input.recallSeed,
  })
  if (afterglowIntent)
    return afterglowIntent

  const recollectionAfterthoughtIntent = deriveRecollectionAfterthoughtTriggeredIntent({
    recallSeed: input.recallSeed,
  })
  if (recollectionAfterthoughtIntent)
    return recollectionAfterthoughtIntent

  const cadenceReconfirmationIntent = deriveCadenceReconfirmationTriggeredIntent({
    recallSeed: input.recallSeed,
  })
  if (cadenceReconfirmationIntent)
    return cadenceReconfirmationIntent

  const lead = input.recalledEpisodes[0] ?? null
  if (!lead)
    return null

  const familiarity = Math.max(lead.sceneAttachment ?? 0, Math.min(1, (lead.recallCount ?? 0) / 4))
  const provenance = lead.latestReconsolidation?.provenance ?? lead.provenance
  if (familiarity < 0.44 && provenance !== 'remembered' && provenance !== 'observed')
    return null

  const leadText = [
    lead.threadAnchor,
    lead.whereSummary,
    lead.whatHappened,
    lead.relationshipMeaning,
    lead.lesson,
    ...(lead.tags ?? []),
    ...(lead.emotionTags ?? []),
  ].filter(Boolean).join(' ').toLowerCase()
  const relationshipTriggered = /relationship|bond|closeness|space|boundary|repair|tone|回应|关系|靠近|空间|边界|修复/u.test(leadText)
  const procedureTriggered = /runtime|procedure|patch|verify|task|execution|workflow|步骤|执行|修复/u.test(leadText)

  return {
    mode: relationshipTriggered
      ? 'relationship-history'
      : procedureTriggered
        ? 'experience-pattern'
        : 'autobiographical-history',
    temporalFocus: 'experience-matched',
    searchEpisodes: true,
    searchConversations: false,
    searchProceduralExperience: procedureTriggered,
    queryHints: uniqueList([
      lead.threadAnchor,
      lead.relationshipMeaning,
      lead.lesson,
      ...(lead.tags ?? []),
    ], 6),
    rationale: sanitizePromptText(
      relationshipTriggered
        ? 'The current scene naturally tugs on a familiar relationship pattern even without an explicit retrospective question.'
        : procedureTriggered
          ? 'The current scene naturally tugs on a familiar way of handling this same kind of task.'
          : 'The current scene naturally tugs on a familiar remembered pattern.',
      220,
    ),
    confidence: clamp01(0.42 + familiarity * 0.32 + (provenance === 'remembered' || provenance === 'observed' ? 0.12 : 0)),
    recollectionAgenda: {
      whyRecallNow: relationshipTriggered
        ? 'The current scene feels like an earlier relationship phase, so bond continuity is worth recalling.'
        : procedureTriggered
          ? 'The current scene feels like an earlier task pattern, so remembered procedure continuity is worth recalling.'
          : 'The current scene feels familiar enough to open a remembered autobiographical lane.',
      goalSimilarity: clamp01(procedureTriggered ? 0.52 + familiarity * 0.28 : familiarity * 0.3),
      relationshipNeed: clamp01(relationshipTriggered ? 0.48 + familiarity * 0.24 : familiarity * 0.18),
      affectivePull: clamp01(familiarity * 0.34 + ((lead.emotionTags ?? []).length > 0 ? 0.12 : 0)),
      sceneFamiliarity: clamp01(familiarity),
      candidateTimeScopes: [
        {
          scope: 'experience-matched',
          weight: clamp01(0.46 + familiarity * 0.22),
          rationale: 'The scene matches a remembered pattern more than a fixed timestamp.',
        },
        {
          scope: 'recent-or-mid',
          weight: clamp01(0.28 + familiarity * 0.16),
          rationale: 'Start from a plausible remembered period before expanding farther out.',
        },
      ],
      candidateEraFacets: [
        {
          facet: relationshipTriggered ? 'relationship-era' : procedureTriggered ? 'task-era' : 'self-era',
          weight: clamp01(0.54 + familiarity * 0.2),
          rationale: 'The scene is pulling toward this remembered kind of period first.',
        },
        {
          facet: 'window',
          weight: clamp01(0.26 + familiarity * 0.14),
          rationale: 'A period window can safely anchor the recall before exact detail.',
        },
      ],
      candidateProcedureLines: uniqueList([
        lead.threadAnchor,
        lead.lesson,
        lead.relationshipMeaning,
        ...(lead.tags ?? []),
      ], 4),
      uncertaintyTolerance: provenance === 'remembered' || provenance === 'observed' ? 'medium' : 'low',
    },
  }
}
