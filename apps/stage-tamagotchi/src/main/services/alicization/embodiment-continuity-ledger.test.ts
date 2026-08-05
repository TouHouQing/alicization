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
        body: { status: 'available', summary: 'resident body remained available' },
        voice: { status: 'available', summary: 'voice remained available' },
        face: { status: 'available', summary: 'face renderer remained available' },
        motion: { status: 'available', summary: 'motion renderer remained available' },
        lipsync: { status: 'available', summary: 'lipsync renderer remained available' },
      },
      current: {
        body: { available: true, aligned: true, summary: 'resident body remains aligned' },
        voice: { available: true, aligned: true, summary: 'voice remains aligned' },
        face: { available: false, aligned: false, summary: 'face renderer did not report a settled expression' },
        motion: { available: false, aligned: false, summary: 'motion lane dropped before follow-through' },
        lipsync: { available: true, aligned: false, summary: 'lipsync returned mechanically but is not aligned yet' },
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
    expect(ledger.lanes.body.status).toBe('available')
    expect(ledger.lanes.voice.status).toBe('available')
    expect(ledger.replayLine).toBe(ledger.traceSummary)
  })

  it('marks full rejoin when previously missing lanes come back with identity-continuity', () => {
    const ledger = buildAlicizationEmbodimentContinuityLedger({
      createdAt: 1_730_000,
      turnId: 'turn-embodiment-2',
      previous: {
        body: { status: 'available', summary: 'body was available' },
        voice: { status: 'available', summary: 'voice was available' },
        face: { status: 'dropped', summary: 'face was missing' },
        motion: { status: 'pending-rejoin', summary: 'motion was not aligned' },
        lipsync: { status: 'pending-rejoin', summary: 'lipsync was mechanical' },
      },
      current: {
        body: { available: true, aligned: true, summary: 'body stays aligned' },
        voice: { available: true, aligned: true, summary: 'voice stays aligned' },
        face: { available: true, aligned: true, summary: 'face expression rejoins the emotional state' },
        motion: { available: true, aligned: true, summary: 'motion follows the same cadence' },
        lipsync: { available: true, aligned: true, summary: 'lipsync matches the same voiced line' },
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
        body: { available: true, aligned: true, summary: 'body is aligned' },
        voice: { available: true, aligned: true, summary: 'voice is aligned' },
        face: { available: true, aligned: true, summary: 'face is aligned' },
        motion: { available: true, aligned: true, summary: 'motion is aligned' },
        lipsync: { available: true, aligned: true, summary: 'lipsync is aligned' },
      },
    })

    expect(ledger.lanes).toEqual(expect.objectContaining({
      body: expect.objectContaining({ status: 'available' }),
      voice: expect.objectContaining({ status: 'available' }),
      face: expect.objectContaining({ status: 'available' }),
      motion: expect.objectContaining({ status: 'available' }),
      lipsync: expect.objectContaining({ status: 'available' }),
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
