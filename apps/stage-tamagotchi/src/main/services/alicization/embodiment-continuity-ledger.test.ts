import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { buildAlicizationEmbodimentContinuityLedger } from './embodiment-continuity-ledger'

describe('embodiment-continuity-ledger', () => {
  it('records which embodiment lanes drop, carry continuity, and need rejoin writeback', () => {
    const ledger = buildAlicizationEmbodimentContinuityLedger({
      createdAt: 1_720_000,
      turnId: 'turn-embodiment-1',
      sourceTags: ['dialogue-delivery', 'renderer-diagnostics'],
      previous: {
        body: { status: 'carrying-continuity', summary: 'resident body carried the active continuity state' },
        voice: { status: 'carrying-continuity', summary: 'voice carried the active continuity state' },
        face: { status: 'carrying-continuity', summary: 'face reflected the active emotional state' },
        motion: { status: 'carrying-continuity', summary: 'motion followed the active cadence' },
        lipsync: { status: 'carrying-continuity', summary: 'mouth timing matched the voiced line' },
      },
      current: {
        body: { available: true, continuityCarry: true, summary: 'resident body still holds the continuity state' },
        voice: { available: true, continuityCarry: true, summary: 'voice remains personal and continuous' },
        face: { available: false, continuityCarry: false, summary: 'face renderer did not report a settled expression' },
        motion: { available: false, continuityCarry: false, summary: 'motion lane dropped before follow-through' },
        lipsync: { available: true, continuityCarry: false, summary: 'lipsync returned mechanically but is not aligned yet' },
      },
      projectStateContinuity: {
        sameHerSelfLine: 'continuity_owner=personhood-core; lanes=body+voice+face+motion+lipsync',
        sameHerDriftRisk: 'If body and voice carry alone while face or motion disappear, cross-modal expression is incomplete.',
        sameHerHoldDetail: 'Keep embodied expression on the continuity state before expansion',
      },
    })

    expect(ledger.version).toBe('embodiment-continuity-ledger-v1')
    expect(ledger.continuityPhase).toBe('partial-carry')
    expect(ledger.droppedLanes).toEqual(['face', 'motion'])
    expect(ledger.carryingLanes).toEqual(['body', 'voice'])
    expect(ledger.pendingRejoinLanes).toEqual(['face', 'motion', 'lipsync'])
    expect(ledger.lanes.face.status).toBe('dropped')
    expect(ledger.lanes.motion.status).toBe('dropped')
    expect(ledger.lanes.lipsync.status).toBe('pending-rejoin')
    expect(ledger.memoryWriteback).toEqual(expect.objectContaining({
      shouldWrite: true,
      lane: 'cross-modal-continuity',
    }))
    expect(ledger.selfRevisionCandidate).toEqual(expect.objectContaining({
      shouldPropose: true,
      domain: 'dialogue-style',
    }))
    expect(ledger.selfRevisionCandidate.reasonCodes).toEqual(expect.arrayContaining([
      'embodiment-lane-dropped:face',
      'embodiment-lane-dropped:motion',
      'embodiment-pending-rejoin:lipsync',
    ]))
    expect(ledger.traceSummary).toContain('dropped=face,motion')
    expect(ledger.lanes.body.status).toBe('carrying-continuity')
    expect(ledger.lanes.voice.status).toBe('carrying-continuity')
    expect(ledger.replayLine).toContain('body+voice carried continuity evidence while face+motion dropped')
  })

  it('marks full rejoin when previously missing lanes come back with identity-continuity', () => {
    const ledger = buildAlicizationEmbodimentContinuityLedger({
      createdAt: 1_730_000,
      turnId: 'turn-embodiment-2',
      previous: {
        body: { status: 'carrying-continuity', summary: 'body carried' },
        voice: { status: 'carrying-continuity', summary: 'voice carried' },
        face: { status: 'dropped', summary: 'face was missing' },
        motion: { status: 'pending-rejoin', summary: 'motion was not aligned' },
        lipsync: { status: 'pending-rejoin', summary: 'lipsync was mechanical' },
      },
      current: {
        body: { available: true, continuityCarry: true, summary: 'body stays present' },
        voice: { available: true, continuityCarry: true, summary: 'voice stays personal' },
        face: { available: true, continuityCarry: true, summary: 'face expression rejoins the emotional state' },
        motion: { available: true, continuityCarry: true, summary: 'motion follows the same cadence' },
        lipsync: { available: true, continuityCarry: true, summary: 'lipsync matches the same voiced line' },
      },
    })

    expect(ledger.continuityPhase).toBe('fully-rejoined')
    expect(ledger.rejoinedLanes).toEqual(['face', 'motion', 'lipsync'])
    expect(ledger.pendingRejoinLanes).toEqual([])
    expect(ledger.memoryWriteback).toEqual(expect.objectContaining({
      shouldWrite: true,
      lane: 'rejoin',
    }))
    expect(ledger.selfRevisionCandidate.shouldPropose).toBe(false)
    expect(ledger.replayLine).toContain('face+motion+lipsync rejoined')
  })

  it('contains no legacy same-her carry field or status', () => {
    const sources = [
      readFileSync(new URL('./embodiment-continuity-ledger.ts', import.meta.url), 'utf8'),
      readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8'),
    ].join('\n')

    expect(sources).not.toContain('sameHerCarry')
    expect(sources).not.toContain('carrying-same-her')
  })
})
