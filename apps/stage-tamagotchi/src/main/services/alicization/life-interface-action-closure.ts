import type { LifeCommitInput, LifeCommitReceipt, LifeEffect, LifeObligation, LifeStateView } from '../../../shared/life-contracts'

import { createHash } from 'node:crypto'
import { isAbsolute } from 'node:path'

import * as v from 'valibot'

import { completedLifeExecutionStep } from './life-dialogue-claim'
import { verifyLifeGoal } from './life-goal-verifier'
import { matchLifeInterfaceInput, matchLifeObservedInterfaceInput } from './life-interface-window-chain'

export interface LifeInterfaceObservation {
  channel: 'browser' | 'desktop'
  targetId: string
  contentHash: string
  elementIds: string[]
  preview: string
  predicateMatched?: boolean
}

const predicateSchema = v.variant('kind', [
  v.strictObject({ kind: v.literal('text'), text: v.pipe(v.string(), v.minLength(1), v.maxLength(2048)) }),
  v.strictObject({ kind: v.literal('field'), id: v.pipe(v.string(), v.minLength(1), v.maxLength(400)), valueHash: v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u)), preview: v.pipe(v.string(), v.maxLength(120)), length: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(16_000)) }),
])
const expectationSchema = v.strictObject({ elementIds: v.pipe(v.array(v.pipe(v.string(), v.maxLength(400))), v.maxLength(16)), predicate: predicateSchema })
type InterfacePredicate = v.InferOutput<typeof predicateSchema>

export function readLifeInterfaceExpectation(proof: LifeObligation['proof']) {
  return v.parse(expectationSchema, JSON.parse(proof.expectedValue || '{}'))
}

/** Readback proves the displayed surface; it cannot certify external storage. */
export function observeLifeInterfaceResult(raw: unknown, selectedIds?: string[], predicate?: InterfacePredicate): LifeInterfaceObservation | null {
  if (!raw || typeof raw !== 'object')
    return null
  const result = raw as Record<string, unknown>
  if (result.status !== 'completed' || !Array.isArray(result.elements))
    return null
  const browser = result.channel === 'browser' && result.browser === 'alicization-managed' && result.operation === 'browser_read_page' && typeof result.url === 'string'
  const desktop = result.channel === 'desktop' && result.operation === 'desktop_list_interactables' && typeof result.windowId === 'string' && typeof result.processId === 'number' && typeof result.desktop === 'string'
  if (!browser && !desktop)
    return null
  const targetId = browser ? String(result.url) : JSON.stringify({ windowId: result.windowId, processId: result.processId, desktop: result.desktop, title: result.title })
  if (targetId.length > 4096)
    return null
  const entries = result.elements.filter(item => item && typeof item === 'object') as Record<string, unknown>[]
  const key = (item: Record<string, unknown>) => String(browser ? item.selector : item.runtimeId)
  const ids = selectedIds ?? entries.slice(0, 16).map(key)
  if (ids.length > 16 || ids.some(id => id.length > 400) || new Set(ids).size !== ids.length)
    return null
  const elements = ids.map(id => entries.find(item => key(item) === id))
  if (elements.some(item => !item))
    return null
  const snapshot = elements.map(item => ({ id: key(item!), name: item!.text ?? item!.name, role: item!.tag ?? item!.role, value: item!.password === true ? null : item!.value, valueLength: item!.valueLength, enabled: item!.enabled, disabled: item!.disabled, readOnly: item!.readOnly, checked: item!.checked }))
  const text = browser && typeof result.text === 'string' ? result.text.slice(0, 24_000) : ''
  const preview = browser ? text.slice(0, 1200) : snapshot.map(item => `${item.name ?? ''}: ${item.value ?? ''}`).join('; ').slice(0, 1200)
  const field = predicate?.kind === 'field' ? snapshot.find(item => item.id === predicate.id) : null
  const predicateMatched = predicate?.kind === 'text' ? text.includes(predicate.text) : predicate?.kind === 'field' ? typeof field?.value === 'string' && field.value.length === predicate.length && createHash('sha256').update(field.value).digest('hex') === predicate.valueHash : undefined
  const verifiedContent = predicate?.kind === 'text' ? { targetId, text: predicateMatched ? predicate.text : null } : predicate?.kind === 'field' ? { targetId, field: predicate.id, valueHash: typeof field?.value === 'string' ? createHash('sha256').update(field.value).digest('hex') : null, length: typeof field?.value === 'string' ? field.value.length : null } : { targetId, text, elements: snapshot }
  return { channel: browser ? 'browser' : 'desktop', targetId, contentHash: createHash('sha256').update(JSON.stringify(verifiedContent)).digest('hex'), elementIds: ids, preview, predicateMatched }
}

export async function closeLifeInterfaceAction(input: {
  cardId: string
  effect: LifeEffect
  read: () => Promise<LifeStateView>
  commit: (input: LifeCommitInput) => Promise<LifeCommitReceipt>
  observe: (proof: LifeObligation['proof']) => Promise<LifeInterfaceObservation | null>
  now: () => number
}) {
  const effect = input.effect
  if (!effect.turnId || !completedLifeExecutionStep(effect))
    return
  const output = effect.receipt!.output as Record<string, unknown>
  if (output.operation === 'read_file') {
    const parameters = effect.payload.parameters as Record<string, unknown> | undefined
    if (output.truncated !== false || typeof output.content !== 'string' || typeof output.verifiedPath !== 'string' || !isAbsolute(output.verifiedPath) || parameters?.path !== output.path || createHash('sha256').update(output.content).digest('hex') !== output.contentHash)
      return
    const view = await input.read()
    if (view.cardId !== input.cardId)
      throw new Error('Interface file readback crossed the card boundary')
    const prior = view.effects.filter(item => item.turnId === effect.turnId && completedLifeExecutionStep(item) && item.receipt!.observedAt! <= effect.receipt!.observedAt!).sort((left, right) => Number(right.receipt!.observedAt) - Number(left.receipt!.observedAt))
    const click = prior.find(item => ['desktop_click_element', 'browser_click_element'].includes(String((item.receipt!.output as Record<string, unknown>).operation)))
    if (!click)
      return
    const clicked = click.receipt!.output as Record<string, unknown>
    const chain = matchLifeInterfaceInput(prior, click)
    const typed = chain?.typed
    const observed = typed ? null : matchLifeObservedInterfaceInput(prior, click)
    if (!typed && !observed)
      return
    // The intended bytes precede the click/read, rather than being defined
    // from whatever file contents happen to be returned after the action.
    const expectedText = typed ? (typed.payload.parameters as { text: string }).text : observed!.expectedText
    const expectedHash = createHash('sha256').update(expectedText).digest('hex')
    const actionEvidence = { typedEffectId: typed?.id ?? null, observedInputEffectId: observed?.inputObservation.id ?? null, observedInputControl: observed?.inputId ?? null, clickedEffectId: click.id, ownerClickEffectId: (chain ?? observed)?.ownerClick?.id ?? null, modalObservationEffectId: (chain ?? observed)?.observedModal?.id ?? null, channel: clicked.channel, title: clicked.title, windowId: clicked.windowId, url: clicked.url, control: (click.payload.parameters as Record<string, unknown> | undefined)?.text }
    const id = `interface-file-goal:${effect.id}`
    if (view.obligations.some(goal => goal.id === id))
      return
    const now = input.now()
    const obligation: LifeObligation = { cardId: input.cardId, id, generation: 1, revision: 0, kind: 'task', summary: `Complete the observed interface input and click ${JSON.stringify(actionEvidence)}, then independently confirm the requested file ${output.verifiedPath} contains exactly the previously supplied input: ${expectedText.slice(0, 800)}. Returned content: ${output.content.slice(0, 800)}. Scope: these recorded interface actions and current local file bytes; unrelated creation or later external persistence are not established.`, status: 'accepted', sourceTurnId: effect.turnId, deliveryTurnId: null, dueAt: null, timezone: null, threadId: null, scheduledTaskId: null, proof: { kind: 'file', path: output.verifiedPath, contentHash: expectedHash }, receiptId: null, createdAt: now, updatedAt: now }
    await input.commit({ cardId: input.cardId, operationKey: `interface-file-bind:${effect.id}`, expectedOwners: view.owners.filter(owner => owner.owner === 'goals'), changes: [], mutations: [{ type: 'obligation-create', obligation, dedupeKey: id }] })
    const goal = (await input.read()).obligations.find(goal => goal.id === id)!
    const verification = await verifyLifeGoal({ obligation: goal, readSetting: async () => undefined, now: input.now })
    await input.commit({ cardId: input.cardId, operationKey: `interface-file-verify:${effect.id}:${verification.id}`, changes: [], mutations: [{ type: 'obligation-verify', id, expectedGeneration: goal.generation, expectedRevision: goal.revision, verification: { ...verification, evidence: { ...verification.evidence, sourceEffectId: effect.id, ...actionEvidence } } }] })
    return
  }
  const initialSnapshot = observeLifeInterfaceResult(effect.receipt?.output)
  if (!initialSnapshot)
    return
  const view = await input.read()
  if (view.cardId !== input.cardId)
    throw new Error('Interface closure crossed the card boundary')
  const mutations = view.effects.filter(item => item.turnId === effect.turnId && completedLifeExecutionStep(item) && item.receipt!.observedAt! <= effect.receipt!.observedAt!).filter((item) => {
    const output = item.receipt!.output as Record<string, unknown>
    if (output.channel !== initialSnapshot.channel || !['browser_type_text', 'browser_click_element', 'desktop_type_text', 'desktop_click_element'].includes(String(output.operation)))
      return false
    if (initialSnapshot.channel === 'browser') {
      if (typeof output.url !== 'string')
        return false
      try { return new URL(output.url).origin === new URL(initialSnapshot.targetId).origin }
      catch { return false }
    }
    const target = JSON.parse(initialSnapshot.targetId) as { windowId: string, processId: number, desktop: string }
    return output.windowId === target.windowId && output.processId === target.processId && output.desktop === target.desktop
  })
  if (!mutations.length)
    return
  const parameters = effect.payload.parameters as Record<string, unknown> | undefined
  let predicate: InterfacePredicate | null = typeof parameters?.expectedText === 'string' && parameters.expectedText.length <= 2048 ? { kind: 'text', text: parameters.expectedText } : null
  if (!predicate) {
    const typed = mutations.find(item => ['browser_type_text', 'desktop_type_text'].includes(String((item.receipt!.output as Record<string, unknown>).operation)))
    const requested = typed?.payload.parameters as Record<string, unknown> | undefined
    const target = typed?.receipt?.output as Record<string, unknown> | undefined
    if (requested?.clearExisting === true && typeof requested.text === 'string' && typeof target?.target === 'string')
      predicate = { kind: 'field', id: target.target, valueHash: createHash('sha256').update(requested.text).digest('hex'), preview: requested.text.slice(0, 120), length: requested.text.length }
  }
  // A postcondition comes from the prepared action, rather than choosing
  // whatever state happened to be observed as the definition of success.
  if (!predicate)
    return
  const snapshot = observeLifeInterfaceResult(effect.receipt?.output, predicate.kind === 'field' ? [predicate.id] : [], predicate)
  if (!snapshot)
    return
  const desiredContent = predicate.kind === 'text' ? { targetId: snapshot.targetId, text: predicate.text } : { targetId: snapshot.targetId, field: predicate.id, valueHash: predicate.valueHash, length: predicate.length }
  const desiredHash = createHash('sha256').update(JSON.stringify(desiredContent)).digest('hex')
  const id = `interface-goal:${effect.id}`
  let goal = view.obligations.find(item => item.id === id)
  if (!goal) {
    const now = input.now()
    const obligation: LifeObligation = { cardId: input.cardId, id, generation: 1, revision: 0, kind: 'task', summary: `Independently confirm the requested ${predicate.kind === 'text' ? `visible result text ${predicate.text}` : `input value ${predicate.preview}`} on ${snapshot.channel} at ${snapshot.targetId.slice(0, 600)}. Displayed result: ${snapshot.preview}. Scope: displayed interface at verification time only; external persistence or later surface state are not established.`, status: 'accepted', sourceTurnId: effect.turnId, deliveryTurnId: null, dueAt: null, timezone: null, threadId: null, scheduledTaskId: null, proof: { kind: 'interface-state', channel: snapshot.channel, targetId: snapshot.targetId, contentHash: desiredHash, expectedValue: JSON.stringify({ elementIds: snapshot.elementIds, predicate }) }, receiptId: null, createdAt: now, updatedAt: now }
    await input.commit({ cardId: input.cardId, operationKey: `interface-goal-bind:${effect.id}`, changes: [], expectedOwners: view.owners.filter(owner => owner.owner === 'goals'), mutations: [{ type: 'obligation-create', obligation, dedupeKey: id }] })
    goal = (await input.read()).obligations.find(item => item.id === id)
  }
  if (!goal || ['fulfilled', 'cancelled', 'superseded'].includes(goal.status))
    return
  const verification = await verifyLifeGoal({ obligation: goal, readSetting: async () => undefined, observeInterface: input.observe, now: input.now })
  await input.commit({ cardId: input.cardId, operationKey: `interface-goal-verify:${effect.id}:${verification.id}`, changes: [], mutations: [{ type: 'obligation-verify', id: goal.id, expectedGeneration: goal.generation, expectedRevision: goal.revision, verification: { ...verification, evidence: { ...verification.evidence, sourceEffectId: effect.id } } }] })
}
