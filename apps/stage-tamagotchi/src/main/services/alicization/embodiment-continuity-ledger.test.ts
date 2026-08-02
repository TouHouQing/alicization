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
    expect(ledger).not.toHaveProperty('selfRevisionCandidate')
    expect(ledger.traceSummary).toContain('dropped=face,motion')
    expect(ledger.lanes.body.status).toBe('carrying-continuity')
    expect(ledger.lanes.voice.status).toBe('carrying-continuity')
    expect(ledger.replayLine).toBe(ledger.traceSummary)
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
    expect(ledger).not.toHaveProperty('selfRevisionCandidate')
    expect(ledger.replayLine).toBe(ledger.traceSummary)
    expect(ledger.replayLine).toContain('rejoined=face,motion,lipsync')
  })

  it('does not treat normalized silent lanes as missing continuity', () => {
    const ledger = buildAlicizationEmbodimentContinuityLedger({
      createdAt: 1_740_000,
      turnId: 'turn-embodiment-silent-normalized',
      previous: {
        body: { status: 'silent', summary: 'legacy status was normalized to silent' },
        voice: { status: 'silent', summary: 'legacy status was normalized to silent' },
        face: { status: 'silent', summary: 'legacy status was normalized to silent' },
        motion: { status: 'silent', summary: 'legacy status was normalized to silent' },
        lipsync: { status: 'silent', summary: 'legacy status was normalized to silent' },
      },
      current: {
        body: { available: true, continuityCarry: true, summary: 'body carries continuity' },
        voice: { available: true, continuityCarry: true, summary: 'voice carries continuity' },
        face: { available: true, continuityCarry: true, summary: 'face carries continuity' },
        motion: { available: true, continuityCarry: true, summary: 'motion carries continuity' },
        lipsync: { available: true, continuityCarry: true, summary: 'lipsync carries continuity' },
      },
    })

    expect(ledger.lanes).toEqual(expect.objectContaining({
      body: expect.objectContaining({ status: 'carrying-continuity' }),
      voice: expect.objectContaining({ status: 'carrying-continuity' }),
      face: expect.objectContaining({ status: 'carrying-continuity' }),
      motion: expect.objectContaining({ status: 'carrying-continuity' }),
      lipsync: expect.objectContaining({ status: 'carrying-continuity' }),
    }))
    expect(ledger.continuityPhase).toBe('quiet')
    expect(ledger.rejoinedLanes).toEqual([])
    expect(ledger.memoryWriteback.shouldWrite).toBe(false)
  })

  it('contains no legacy continuity carry field or status', () => {
    const sources = [
      readFileSync(new URL('./embodiment-continuity-ledger.ts', import.meta.url), 'utf8'),
      readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8'),
    ].join('\n')

    expect(sources).not.toContain('continuityCarry')
    expect(sources).not.toContain('carrying-continuity')
  })
})
