import { describe, expect, it } from 'vitest'

import { buildAlicizationEmbodimentContinuityLedger } from './embodiment-continuity-ledger'

describe('embodiment-continuity-ledger', () => {
  it('records which embodiment lanes drop, carry same-her, and need rejoin writeback', () => {
    const ledger = buildAlicizationEmbodimentContinuityLedger({
      createdAt: 1_720_000,
      turnId: 'turn-embodiment-1',
      sourceTags: ['dialogue-delivery', 'renderer-diagnostics'],
      previous: {
        body: { status: 'carrying-same-her', summary: 'resident body kept the same Phase 1 digital life nearby' },
        voice: { status: 'carrying-same-her', summary: 'voice carried the same living line' },
        face: { status: 'carrying-same-her', summary: 'face softened with the same emotional state' },
        motion: { status: 'carrying-same-her', summary: 'motion followed the same living cadence' },
        lipsync: { status: 'carrying-same-her', summary: 'mouth timing matched the voiced line' },
      },
      current: {
        body: { available: true, sameHerCarry: true, summary: 'resident body still holds the same living line' },
        voice: { available: true, sameHerCarry: true, summary: 'voice remains personal and continuous' },
        face: { available: false, sameHerCarry: false, summary: 'face renderer did not report a settled expression' },
        motion: { available: false, sameHerCarry: false, summary: 'motion lane dropped before follow-through' },
        lipsync: { available: true, sameHerCarry: false, summary: 'lipsync returned mechanically but not yet same-her aligned' },
      },
      projectStateContinuity: {
        sameHerSelfLine: 'Same Phase 1 digital life; visible reply, voice, face, motion, and lipsync must stay one her.',
        sameHerDriftRisk: 'If body and voice carry alone while face or motion disappear, this can look like a generic assistant shell.',
        sameHerHoldDetail: 'Keep embodied expression on the same living line before widening outward.',
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
    expect(ledger.replayLine).toContain('body+voice carried same-her while face+motion dropped')
  })

  it('marks full rejoin when previously missing lanes come back with same-her carry', () => {
    const ledger = buildAlicizationEmbodimentContinuityLedger({
      createdAt: 1_730_000,
      turnId: 'turn-embodiment-2',
      previous: {
        body: { status: 'carrying-same-her', summary: 'body carried' },
        voice: { status: 'carrying-same-her', summary: 'voice carried' },
        face: { status: 'dropped', summary: 'face was missing' },
        motion: { status: 'pending-rejoin', summary: 'motion was not aligned' },
        lipsync: { status: 'pending-rejoin', summary: 'lipsync was mechanical' },
      },
      current: {
        body: { available: true, sameHerCarry: true, summary: 'body stays near' },
        voice: { available: true, sameHerCarry: true, summary: 'voice stays personal' },
        face: { available: true, sameHerCarry: true, summary: 'face expression rejoins the emotional state' },
        motion: { available: true, sameHerCarry: true, summary: 'motion follows the same cadence' },
        lipsync: { available: true, sameHerCarry: true, summary: 'lipsync matches the same voiced line' },
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
})
