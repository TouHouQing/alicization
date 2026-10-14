import type { AlicizationInteractionIntent } from '@proj-alicization/stage-shared'

import type { AlicizationMindTurnGovernance } from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import { createHash } from 'node:crypto'

import { buildAlicizationProviderFactBlock, normalizeAlicizationInteractionIntent } from '@proj-alicization/stage-shared'

import { parseJsonObjectFromText } from './runtime-transport-content'

export function refineCommittedInteractionIntent(input: { cardId: string, turnId: string, now: number, fullText: string, base: AlicizationInteractionIntent | null }): AlicizationInteractionIntent | null {
  const base = input.base?.cardId === input.cardId && input.base.turnId === input.turnId && input.base.expiresAt > input.now ? input.base : null
  const parsed = parseJsonObjectFromText(input.fullText)
  if (parsed?.format !== 'mind-turn-v1' || typeof parsed.reply !== 'string')
    return base
  const interaction = parsed && typeof parsed.interaction === 'object' && parsed.interaction !== null && !Array.isArray(parsed.interaction)
    ? parsed.interaction as Record<string, unknown>
    : null
  if (!interaction)
    return base
  return normalizeAlicizationInteractionIntent({
    version: 'interaction-intent-v1',
    cardId: input.cardId,
    turnId: input.turnId,
    purpose: interaction.purpose,
    attention: interaction.attention,
    reason: interaction.reason,
    focus: base?.focus ?? '',
    confidence: base?.confidence ?? 0.6,
    createdAt: input.now,
    expiresAt: input.now + 120_000,
    sourceRefs: [...(base?.sourceRefs ?? []), `provider-reply:${createHash('sha256').update(input.fullText).digest('hex')}`],
    ...(base?.target && input.now - base.target.observedAt <= 30000 ? { target: base.target } : {}),
  }) ?? base
}

/** One intent is prepared before language generation and carried to the body. */
export function buildAlicizationInteractionIntent(input: { cardId?: string, turnId?: string, now: number, surface?: AlicizationDigitalLifeRuntimeSurface | null, governance?: AlicizationMindTurnGovernance | null }): AlicizationInteractionIntent | null {
  const frame = input.surface?.dialogue.currentConsciousFrame
  const fresh = (timestamp: number | undefined) => timestamp != null && Number.isFinite(timestamp) && timestamp <= input.now + 100 && input.now - timestamp <= 120_000
  const candidatePlanner = input.surface?.dialogue.answerPlanner
  const candidateDeliberation = input.surface?.dialogue.replyDeliberation
  const planner = fresh(candidatePlanner?.updatedAt) ? candidatePlanner : null
  const deliberation = fresh(candidateDeliberation?.updatedAt) ? candidateDeliberation : null
  if (!frame || !fresh(frame.updatedAt))
    return null
  const actKernel = input.surface?.dialogue.dialogueActKernel
  const act = planner?.act ?? (fresh(actKernel?.updatedAt) ? actKernel?.speechAct : null) ?? input.governance?.answerAct
  const purpose: AlicizationInteractionIntent['purpose'] = frame.shouldSelfRevise || frame.truthDiscipline === 'repair-first' || act === 'correct-stale-anchor' ? 'repair' : frame.shouldWithholdSpecificity || act === 'ask-reground' ? 'clarify' : act === 'care' ? 'care' : act === 'guide' ? 'guide' : act === 'defer' ? 'defer' : input.governance?.turnMode === 'accompany' ? 'accompany' : frame.subject === 'alicization-self' ? 'reflect' : 'answer'
  const attention: AlicizationInteractionIntent['attention'] = purpose === 'reflect' ? 'inward' : frame.subject === 'task-knot' || frame.subject === 'visible-scene' ? 'shared-task' : 'host'
  // Reply wording remains the provider's authority. A sparse frame still owns
  // its subject and act; requiring an authored directive discarded every
  // ordinary text turn, which deliberately leaves speakingIntention empty.
  const reason = frame.speakingIntention?.trim() || frame.consciousNeed?.trim() || `${purpose}:${frame.subject}`
  return normalizeAlicizationInteractionIntent({ version: 'interaction-intent-v1', cardId: input.cardId, turnId: input.turnId, purpose, attention, focus: (frame.focusAnchor ?? '').slice(0, 240), reason: reason.slice(0, 400), sourceRefs: [`current-conscious-frame:${frame.updatedAt}`, ...(planner ? [`answer-planner:${planner.updatedAt}`] : []), ...(deliberation ? [`reply-deliberation:${deliberation.updatedAt}`] : [])], confidence: frame.confidence, createdAt: input.now, expiresAt: input.now + 120_000 })
}

export function buildAlicizationInteractionIntentFact(intent: AlicizationInteractionIntent | null) {
  return intent ? buildAlicizationProviderFactBlock('alicization-interaction-intent', { scope: 'current-turn', claimAuthority: 'not-user-authored', purpose: intent.purpose, attention: intent.attention, focus: intent.focus, reason: intent.reason, confidence: intent.confidence, sourceRefs: intent.sourceRefs }) : ''
}
