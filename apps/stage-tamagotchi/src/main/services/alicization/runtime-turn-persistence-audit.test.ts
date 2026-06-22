import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  alicizationRuntimeTurnPersistenceAuthorityFiles,
  alicizationRuntimeTurnPersistenceEntryFiles,
  resolveAlicizationRuntimeTurnPersistenceAuditedFiles,
  resolveAlicizationRuntimeTurnPersistenceAuditRegistry,
  resolveAlicizationRuntimeTurnPersistenceMode,
} from './runtime-turn-persistence-audit'
import { collectAlicizationRuntimeTurnPersistenceFiles } from './runtime-turn-persistence-entrypoint-audit'

const proofRows = [
  {
    entry: 'runtime-persisted-turn-awareness-preference',
    file: './runtime.test.ts',
    snippets: [
      'prefers a richer same-her project awareness line over a thin persisted reminder shell when normalizing persisted project state for a conversation turn',
      'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
      'drift=If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift.',
    ],
  },
  {
    entry: 'execution-callback-persistence-awareness-backfill',
    file: './runtime-delivery-reminders.test.ts',
    snippets: [
      'keeps explicit execution-callback pre-dialogue awareness when backfilling project-state audit from persisted project state',
      'projectStateAudit: expect.objectContaining({',
      'preDialogueAwarenessSummary: expect.stringContaining(\'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.\')',
    ],
  },
  {
    entry: 'execution-callback-persistence-resume-confirmation-boundary',
    file: './runtime.test.ts',
    snippets: [
      'keeps host-confirmed resume-before-dispatch confirmation boundaries explicit when normalizing persisted execution-callback project state for a conversation turn',
      'expect(String(normalizedProjectState?.sameHerHoldDetail ?? \'\')).toBe(resumeConfirmationHoldDetail)',
      'expect(String(normalizedAudit?.continuitySummary ?? \'\')).toContain(\'host-confirmed-before-redispatch\')',
      'expect(String(normalizedAudit?.continuitySummary ?? \'\')).toContain(\'resume-before-dispatch\')',
    ],
  },
  {
    entry: 'execution-callback-origin-recanonicalization-before-persistence',
    file: './runtime.test.ts',
    snippets: [
      'canonicalizes origin-lost execution-callback runtime turns before persistence so callback carry does not drift into user-turn dialogue world state',
      'expect(persistedTurn?.origin).toBe(\'subconscious-proactive\')',
      'expect(emittedCallbackEvent?.origin).toBe(\'subconscious-proactive\')',
    ],
  },
  {
    entry: 'origin-only-autonomous-spoof-rejection-before-persistence',
    file: './runtime.test.ts',
    snippets: [
      'rejects origin-only autonomous runtime turns before persistence so future entrypoints cannot spoof same-her proactive authority without structural proof',
      'expect(dbStub.appendConversationTurn).not.toBeCalled()',
      'action: \'autonomous-turn-spoof-rejected\'',
      'matchedBy: [\'origin\']',
    ],
  },
  {
    entry: 'deferred-proactive-repair-first-persistence-carry',
    file: './runtime.test.ts',
    snippets: [
      'keeps richer same-her repair-first carry alive in deferred proactive runtime payloads even when provider structured output omits projectState',
      'continuityCadence: \'repair-before-closeness\'',
      'expect(String(visualPresenceState?.runtimeDigest?.projectState?.sameHerSelfLine ?? \'\')).toContain(\'same living line\')',
    ],
  },
] as const

describe('runtime-turn-persistence-audit', () => {
  it('keeps guarded turn persistence discovery sourced from a shared helper instead of a local append callsite scan', () => {
    const source = readFileSync(new URL('./runtime-turn-persistence-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./runtime-turn-persistence-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationRuntimeTurnPersistenceFiles(')
    expect(/^function collectAppendConversationTurnGuardCallsiteFiles\(/m.test(source)).toBe(false)
  })

  it('keeps every appendConversationTurnWithGuards source file explicitly classified', () => {
    const discoveredFiles = collectAlicizationRuntimeTurnPersistenceFiles(new URL('.', import.meta.url).pathname)

    expect(discoveredFiles).toEqual(resolveAlicizationRuntimeTurnPersistenceAuditedFiles().slice().sort())
    expect(resolveAlicizationRuntimeTurnPersistenceAuditRegistry().map(entry => entry.relativePath).sort())
      .toEqual(discoveredFiles)
  })

  it('keeps a single explicit persistence authority and requires every other writer to stay on the guarded seam', () => {
    expect(alicizationRuntimeTurnPersistenceAuthorityFiles).toEqual(['runtime.ts'])

    for (const relativePath of alicizationRuntimeTurnPersistenceAuthorityFiles) {
      const source = readFileSync(new URL(`./${relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationRuntimeTurnPersistenceMode(relativePath)).toBe('persistence-authority')
      expect(source).toContain('async function appendConversationTurnWithGuards(')
      expect(source).toContain('normalizePersistedProjectStateForConversationTurn(')
      expect(source).toContain('resolveAlicizationAutonomousDialogueFamilyClassification(')
      expect(source).toContain('const originOnlyAutonomousSpoof')
      expect(source).toContain('action: \'autonomous-turn-spoof-rejected\'')
      expect(source).not.toContain('origin: isAlicizationAutonomousDialogueOrigin(payload.origin)')
    }

    for (const relativePath of alicizationRuntimeTurnPersistenceEntryFiles) {
      const source = readFileSync(new URL(`./${relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationRuntimeTurnPersistenceMode(relativePath)).not.toBe('persistence-authority')
      expect(source).toContain('appendConversationTurnWithGuards(')
    }
  })

  it('keeps one explicit route-level proof that guarded turn persistence preserves same-her project awareness across runtime authority callback delivery and deferred proactive carry', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'runtime-persisted-turn-awareness-preference' }),
      expect.objectContaining({ entry: 'execution-callback-persistence-awareness-backfill' }),
      expect.objectContaining({ entry: 'execution-callback-persistence-resume-confirmation-boundary' }),
      expect.objectContaining({ entry: 'execution-callback-origin-recanonicalization-before-persistence' }),
      expect.objectContaining({ entry: 'origin-only-autonomous-spoof-rejection-before-persistence' }),
      expect.objectContaining({ entry: 'deferred-proactive-repair-first-persistence-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors guarded persistence continuity to current behavior tests instead of only the append registry and authority map', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: guarded persistence now has dedicated same-her continuity proof across persisted normalization callback delivery and deferred proactive carry, while future new persistence families still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const runtimeSource = readFileSync(new URL('./runtime.test.ts', import.meta.url), 'utf8')
    const reminderSource = readFileSync(new URL('./runtime-delivery-reminders.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('runtime-turn-persistence-audit.test.ts')
    expect(runtimeSource).toContain(
      'prefers a richer same-her project awareness line over a thin persisted reminder shell when normalizing persisted project state for a conversation turn',
    )
    expect(reminderSource).toContain(
      'keeps explicit execution-callback pre-dialogue awareness when backfilling project-state audit from persisted project state',
    )
  })
})
