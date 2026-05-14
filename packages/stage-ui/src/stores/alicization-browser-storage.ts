import type {
  AlicizationConversationTurnInput,
  AlicizationKillSwitchSnapshot,
  AlicizationKillSwitchState,
  AlicizationMemoryArchiveRecord,
  AlicizationMemoryFact,
  AlicizationMindTurnEventRecord,
  AlicizationSubconsciousFragment,
  AlicizationVisualPresenceStateSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from './alicization-bridge'

import { storage } from '../database/storage'
import { ensureAlicizationVisualPresenceResidentPerformance } from './alicization-visual-presence-spine'

const defaultAlicizationCardId = 'default'
const browserCardsIndexKey = 'local:alicization/browser/card-ids:v1'

export interface BrowserSoulRecord {
  revision: number
  content: string
}

export interface BrowserOrganicMemoryRecord {
  activeThoughts: Array<{
    id: string
    text: string
    createdAt: number
    updatedAt: number
  }>
  subconsciousFragments: AlicizationSubconsciousFragment[]
  lastDreamedAt: number | null
}

export interface BrowserEpisodicMemoryRecord {
  events: any[]
}

export interface BrowserConversationTurnRecord extends Required<Pick<AlicizationConversationTurnInput, 'turnId' | 'sessionId' | 'createdAt'>> {
  origin: NonNullable<AlicizationConversationTurnInput['origin']>
  userText: string
  assistantText: string
  structured?: Record<string, unknown>
}

export interface BrowserMindTurnEventRecord extends AlicizationMindTurnEventRecord {}

export type BrowserProactiveScenario = 'coding' | 'media' | 'late-night-care' | 'general'
export type BrowserProactiveOutcome = 'positive' | 'dismiss' | 'ignored' | 'reply-within-120s'

export interface BrowserPendingProactiveOutcome {
  turnId: string
  scenario: BrowserProactiveScenario
  deliveredAt: number
  feedbackWindowMs: number
}

export interface BrowserRecentProactiveOutcome {
  turnId: string
  scenario: BrowserProactiveScenario
  outcome: BrowserProactiveOutcome
  createdAt: number
}

export interface BrowserProactiveLoopState {
  globalCooldownUntil: number
  scenarioBias: Record<BrowserProactiveScenario, number>
  consecutiveIgnored: Record<BrowserProactiveScenario, number>
  initiativeTrust: number
  openingMomentum: number
  lastProactiveTurnAt: number | null
  pendingOutcomes: BrowserPendingProactiveOutcome[]
  recentOutcomes: BrowserRecentProactiveOutcome[]
  updatedAt: number
}

function normalizeCardId(raw?: unknown) {
  if (typeof raw !== 'string')
    return defaultAlicizationCardId
  const trimmed = raw.trim()
  return trimmed || defaultAlicizationCardId
}

export function buildCardBaseKey(cardId: string) {
  return `local:alicization/browser/v1/cards/${normalizeCardId(cardId)}`
}

export function buildSoulKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/soul`
}

export function buildKillSwitchKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/kill-switch`
}

export function buildOrganicMemoryKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/organic-memory`
}

export function buildMemoryFactsKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/memory-facts`
}

export function buildMemoryArchiveKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/memory-archive`
}

export function buildMemoryMetaKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/memory-meta`
}

export function buildConversationTurnsKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/conversation-turns`
}

export function buildEpisodicEventsKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/episodic-events`
}

export function buildMindTurnEventsKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/mind-turn-events`
}

export function buildProactiveLoopStateKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/proactive-loop-state`
}

export function buildAuditLogKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/audit-log`
}

export function buildPerformanceManifestKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/performance-manifest`
}

export function buildActiveSessionKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/active-session-id`
}

export function buildVisualPresenceKey(cardId: string) {
  return `${buildCardBaseKey(cardId)}/visual-presence`
}

export function createDefaultOrganicMemoryRecord(): BrowserOrganicMemoryRecord {
  return {
    activeThoughts: [],
    subconsciousFragments: [],
    lastDreamedAt: null,
  }
}

export function createDefaultEpisodicMemoryRecord(): BrowserEpisodicMemoryRecord {
  return {
    events: [],
  }
}

export function createDefaultKillSwitchSnapshot(now: () => number, reason?: string): AlicizationKillSwitchSnapshot {
  return {
    state: 'ACTIVE',
    reason: reason ?? 'bootstrap',
    updatedAt: now(),
  }
}

export function createDefaultBrowserProactiveLoopState(now: () => number): BrowserProactiveLoopState {
  return {
    globalCooldownUntil: 0,
    scenarioBias: {
      coding: 0,
      media: 0,
      'late-night-care': 0,
      general: 0,
    },
    consecutiveIgnored: {
      coding: 0,
      media: 0,
      'late-night-care': 0,
      general: 0,
    },
    initiativeTrust: 0.5,
    openingMomentum: 0,
    lastProactiveTurnAt: null,
    pendingOutcomes: [],
    recentOutcomes: [],
    updatedAt: now(),
  }
}

export async function getBrowserCardIds() {
  return await storage.getItemRaw<string[]>(browserCardsIndexKey) ?? [defaultAlicizationCardId]
}

export async function saveBrowserCardIds(cardIds: string[]) {
  const normalized = [...new Set(cardIds.map(normalizeCardId))].sort()
  await storage.setItemRaw(browserCardsIndexKey, normalized)
}

export async function ensureBrowserCardRegistered(cardId: string) {
  const known = await getBrowserCardIds()
  if (known.includes(cardId))
    return
  await saveBrowserCardIds([...known, cardId])
}

export async function readSoulRecord(cardId: string, createDefaultSoulRecord: () => BrowserSoulRecord) {
  await ensureBrowserCardRegistered(cardId)
  return await storage.getItemRaw<BrowserSoulRecord>(buildSoulKey(cardId)) ?? createDefaultSoulRecord()
}

export async function writeSoulRecord(cardId: string, record: BrowserSoulRecord) {
  await ensureBrowserCardRegistered(cardId)
  await storage.setItemRaw(buildSoulKey(cardId), record)
}

export async function readKillSwitch(cardId: string, now: () => number): Promise<AlicizationKillSwitchSnapshot> {
  await ensureBrowserCardRegistered(cardId)
  return await storage.getItemRaw<AlicizationKillSwitchSnapshot>(buildKillSwitchKey(cardId)) ?? createDefaultKillSwitchSnapshot(now)
}

export async function writeKillSwitch(cardId: string, state: AlicizationKillSwitchState, now: () => number, reason?: string) {
  const snapshot: AlicizationKillSwitchSnapshot = {
    state,
    reason,
    updatedAt: now(),
  }
  await ensureBrowserCardRegistered(cardId)
  await storage.setItemRaw(buildKillSwitchKey(cardId), snapshot)
  return snapshot
}

export async function readOrganicMemory(cardId: string) {
  await ensureBrowserCardRegistered(cardId)
  return await storage.getItemRaw<BrowserOrganicMemoryRecord>(buildOrganicMemoryKey(cardId)) ?? createDefaultOrganicMemoryRecord()
}

export async function writeOrganicMemory(cardId: string, record: BrowserOrganicMemoryRecord) {
  await ensureBrowserCardRegistered(cardId)
  await storage.setItemRaw(buildOrganicMemoryKey(cardId), record)
}

export async function readEpisodicMemory(cardId: string) {
  await ensureBrowserCardRegistered(cardId)
  return await storage.getItemRaw<BrowserEpisodicMemoryRecord>(buildEpisodicEventsKey(cardId)) ?? createDefaultEpisodicMemoryRecord()
}

export async function writeEpisodicMemory(cardId: string, record: BrowserEpisodicMemoryRecord) {
  await ensureBrowserCardRegistered(cardId)
  await storage.setItemRaw(buildEpisodicEventsKey(cardId), record)
}

export async function readConversationTurns(cardId: string) {
  await ensureBrowserCardRegistered(cardId)
  return await storage.getItemRaw<BrowserConversationTurnRecord[]>(buildConversationTurnsKey(cardId)) ?? []
}

export async function writeConversationTurns(cardId: string, turns: BrowserConversationTurnRecord[]) {
  await ensureBrowserCardRegistered(cardId)
  await storage.setItemRaw(buildConversationTurnsKey(cardId), turns)
}

export async function readActiveSessionId(cardId: string) {
  await ensureBrowserCardRegistered(cardId)
  const value = await storage.getItemRaw<string>(buildActiveSessionKey(cardId))
  return typeof value === 'string' ? value.trim() : ''
}

export async function writeActiveSessionId(cardId: string, sessionId: string) {
  await ensureBrowserCardRegistered(cardId)
  await storage.setItemRaw(buildActiveSessionKey(cardId), sessionId)
}

export async function readMindTurnEvents(cardId: string) {
  await ensureBrowserCardRegistered(cardId)
  return await storage.getItemRaw<BrowserMindTurnEventRecord[]>(buildMindTurnEventsKey(cardId)) ?? []
}

export async function writeMindTurnEvents(cardId: string, events: BrowserMindTurnEventRecord[]) {
  await ensureBrowserCardRegistered(cardId)
  await storage.setItemRaw(buildMindTurnEventsKey(cardId), events)
}

export async function readProactiveLoopState(cardId: string, now: () => number) {
  await ensureBrowserCardRegistered(cardId)
  return await storage.getItemRaw<BrowserProactiveLoopState>(buildProactiveLoopStateKey(cardId)) ?? createDefaultBrowserProactiveLoopState(now)
}

export async function writeProactiveLoopState(cardId: string, state: BrowserProactiveLoopState) {
  await ensureBrowserCardRegistered(cardId)
  await storage.setItemRaw(buildProactiveLoopStateKey(cardId), state)
}

export async function readMemoryFacts(cardId: string) {
  await ensureBrowserCardRegistered(cardId)
  return await storage.getItemRaw<AlicizationMemoryFact[]>(buildMemoryFactsKey(cardId)) ?? []
}

export async function writeMemoryFacts(cardId: string, facts: AlicizationMemoryFact[]) {
  await ensureBrowserCardRegistered(cardId)
  await storage.setItemRaw(buildMemoryFactsKey(cardId), facts)
}

export async function readMemoryArchive(cardId: string) {
  await ensureBrowserCardRegistered(cardId)
  return await storage.getItemRaw<AlicizationMemoryArchiveRecord[]>(buildMemoryArchiveKey(cardId)) ?? []
}

export async function writeMemoryArchive(cardId: string, archive: AlicizationMemoryArchiveRecord[]) {
  await ensureBrowserCardRegistered(cardId)
  await storage.setItemRaw(buildMemoryArchiveKey(cardId), archive)
}

export async function readMemoryMeta(cardId: string) {
  await ensureBrowserCardRegistered(cardId)
  return await storage.getItemRaw<{ lastPrunedAt: number | null }>(buildMemoryMetaKey(cardId)) ?? { lastPrunedAt: null }
}

export async function writeMemoryMeta(cardId: string, meta: { lastPrunedAt: number | null }) {
  await ensureBrowserCardRegistered(cardId)
  await storage.setItemRaw(buildMemoryMetaKey(cardId), meta)
}

export async function readPerformanceManifest(cardId: string) {
  await ensureBrowserCardRegistered(cardId)
  return await storage.getItemRaw<CharacterPerformanceCapabilitiesManifest | null>(buildPerformanceManifestKey(cardId)) ?? null
}

export async function writePerformanceManifest(cardId: string, manifest: CharacterPerformanceCapabilitiesManifest | null) {
  await ensureBrowserCardRegistered(cardId)
  await storage.setItemRaw(buildPerformanceManifestKey(cardId), manifest)
}

export async function readVisualPresenceState(cardId: string) {
  await ensureBrowserCardRegistered(cardId)
  const state = await storage.getItemRaw<AlicizationVisualPresenceStateSnapshot>(buildVisualPresenceKey(cardId)) ?? null
  return state
    ? ensureAlicizationVisualPresenceResidentPerformance(state)
    : null
}

export async function writeVisualPresenceState(cardId: string, state: AlicizationVisualPresenceStateSnapshot) {
  await ensureBrowserCardRegistered(cardId)
  await storage.setItemRaw(
    buildVisualPresenceKey(cardId),
    ensureAlicizationVisualPresenceResidentPerformance(state),
  )
}

export async function readAuditLog<T = unknown>(cardId: string) {
  await ensureBrowserCardRegistered(cardId)
  return await storage.getItemRaw<T[]>(buildAuditLogKey(cardId)) ?? []
}

export async function writeAuditLog<T = unknown>(cardId: string, entries: T[]) {
  await ensureBrowserCardRegistered(cardId)
  await storage.setItemRaw(buildAuditLogKey(cardId), entries)
}

export async function removeBrowserCardStorage(cardId: string) {
  await Promise.all([
    storage.removeItem(buildSoulKey(cardId)),
    storage.removeItem(buildKillSwitchKey(cardId)),
    storage.removeItem(buildOrganicMemoryKey(cardId)),
    storage.removeItem(buildMemoryFactsKey(cardId)),
    storage.removeItem(buildMemoryArchiveKey(cardId)),
    storage.removeItem(buildMemoryMetaKey(cardId)),
    storage.removeItem(buildEpisodicEventsKey(cardId)),
    storage.removeItem(buildConversationTurnsKey(cardId)),
    storage.removeItem(buildMindTurnEventsKey(cardId)),
    storage.removeItem(buildAuditLogKey(cardId)),
    storage.removeItem(buildPerformanceManifestKey(cardId)),
    storage.removeItem(buildActiveSessionKey(cardId)),
    storage.removeItem(buildVisualPresenceKey(cardId)),
    storage.removeItem(buildProactiveLoopStateKey(cardId)),
  ])
}

export async function clearBrowserGlobalStorage() {
  [await storage.removeItem(browserCardsIndexKey)]
}
