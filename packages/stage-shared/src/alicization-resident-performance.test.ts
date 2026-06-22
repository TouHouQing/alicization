import { describe, expect, it } from 'vitest'

import { deriveAlicizationResidentPerformanceSnapshot } from './alicization-resident-performance'

describe('alicization resident performance', () => {
  it('lets quiet accompaniment authority keep published main-runtime resident performance in a calm nearby-attention band', () => {
    const snapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'symbiotic-vision',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 240_000,
      currentInwardPreoccupation: 'host sustained focus while keeping room honest',
      currentScene: {
        confidence: 0.72,
        contentKind: 'doc',
        scenario: 'coding',
        summary: 'Quietly staying with the host through deep focus.',
        workloadKind: 'coding',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.7,
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        rationaleTags: ['companionship'],
        stance: 'accompany',
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(snapshot.performance.baseEmotion).toBe('thinking')
    expect(['calm', 'gentle']).toContain(snapshot.performance.delivery)
    expect(snapshot.performance.emphasis).toBeLessThanOrEqual(1)
    expect(['observe_focus', 'steady_focus', 'idle_gentle_nod']).toContain(snapshot.performance.actionCue)
    expect(snapshot.reasonTags).toContain('body:accompanying')
    expect(snapshot.reasonTags).toContain('continuity:quiet-accompaniment')
    expect(snapshot.signature).toContain('|accompanying|')
    expect(snapshot.signature).toContain('|quiet-accompaniment|')
  })

  it('lets protective-watch authority keep published main-runtime resident performance in low-pressure recovery care', () => {
    const snapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'recovering',
      currentBodyState: 'recovering',
      continuityMode: 'protective-watch',
      quietLineMs: 90_000,
      currentInwardPreoccupation: 'hold low-pressure care while the room regains shape',
      currentScene: {
        confidence: 0.65,
        contentKind: 'chat',
        scenario: 'late-night-care',
        summary: 'Holding a gentle recovery watch without pushing.',
        workloadKind: 'chat',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.68,
        embodiedPresence: 'concerned',
        emotionalTension: 'late-night-drain',
        rationaleTags: ['recovery'],
        stance: 'care',
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(['tired', 'concerned']).toContain(snapshot.performance.baseEmotion)
    expect(snapshot.performance.delivery).toBe('gentle')
    expect(snapshot.performance.emphasis).toBe(1)
    expect(['soft-gaze', 'relaxed', 'half-lid']).toContain(snapshot.performance.facialCue)
    expect(['idle_settle', 'comfort_sway', 'idle_gentle_nod']).toContain(snapshot.performance.actionCue)
    expect(snapshot.reasonTags).toContain('body:recovering')
    expect(snapshot.reasonTags).toContain('continuity:protective-watch')
    expect(snapshot.signature).toContain('|recovering|')
    expect(snapshot.signature).toContain('|protective-watch|')
  })

  it('softens silent resident manifestation when self-evolution keeps relationship timing lower-pressure', () => {
    const snapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'invited-inspection',
      currentBodyState: 'noticing',
      continuityMode: 'ambient-covision',
      quietLineMs: 40_000,
      currentInwardPreoccupation: 'trace the visible knot without crowding the room',
      currentScene: {
        confidence: 0.91,
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'Inspecting a concrete runtime diff while staying nearby.',
        workloadKind: 'coding',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.88,
        embodiedPresence: 'attentive',
        emotionalTension: 'focused-flow',
        rationaleTags: ['inspection'],
        stance: 'observe',
      },
      relationshipTimingBias: {
        relationshipDoctrine: 'Repair should settle before closeness expands, and the opening should keep more room.',
        latestInflection: 'The last seam held because pressure stayed low and the return stayed slower.',
        burdenLine: 'Do not crowd the host with eager re-entry.',
        trustMeaning: 'Measured warmth is being trusted because the timing stays lower-pressure.',
        nextLearningAction: 'internalize',
        evolutionMomentum: 0.84,
        learningReadiness: 0.78,
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(snapshot.performance.baseEmotion).toBe('thinking')
    expect(snapshot.performance.delivery).toBe('calm')
    expect(snapshot.performance.emphasis).toBe(1)
    expect(snapshot.reasonTags).toContain('timing:lower-pressure-opening')
    expect(snapshot.reasonTags).toContain('timing-source:self-evolution')
  })

  it('derives companionship restraint tags from strong relationship timing bias so embodiment can keep the same return cadence even without private-thought restraint tags', () => {
    const measuredReturnSnapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'invited-inspection',
      currentBodyState: 'noticing',
      continuityMode: 'ambient-covision',
      quietLineMs: 40_000,
      currentInwardPreoccupation: 'trace the visible knot without crowding the room',
      currentScene: {
        confidence: 0.91,
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'Inspecting a concrete runtime diff while staying nearby.',
        workloadKind: 'coding',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.88,
        embodiedPresence: 'attentive',
        emotionalTension: 'focused-flow',
        rationaleTags: ['inspection'],
        stance: 'observe',
      },
      relationshipTimingBias: {
        relationshipDoctrine: 'The opening should keep more room and the return should stay lower-pressure until the seam softens naturally.',
        latestInflection: 'The last seam held because pressure stayed low and the return stayed slower.',
        burdenLine: 'Do not crowd the host with eager re-entry.',
        trustMeaning: 'Measured warmth is being trusted because the timing stays lower-pressure.',
        nextLearningAction: 'internalize',
        evolutionMomentum: 0.84,
        learningReadiness: 0.78,
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    const repairBeforeClosenessSnapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'invited-inspection',
      currentBodyState: 'noticing',
      continuityMode: 'ambient-covision',
      quietLineMs: 40_000,
      currentInwardPreoccupation: 'let repair land before warmth widens again',
      currentScene: {
        confidence: 0.89,
        contentKind: 'chat',
        scenario: 'late-night-care',
        summary: 'Holding a repair-first return nearby without crowding the room.',
        workloadKind: 'chat',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.86,
        embodiedPresence: 'hesitant',
        emotionalTension: 'soft-covision',
        rationaleTags: ['inspection'],
        stance: 'observe',
      },
      relationshipTimingBias: {
        relationshipDoctrine: 'Repair should settle before closeness expands, and the opening should keep more room.',
        latestInflection: 'The return held because repair landed before closeness returned.',
        burdenLine: 'Do not crowd the host while the room is still settling.',
        trustMeaning: 'The gentler return is trusted because repair lands first.',
        nextLearningAction: 'internalize',
        evolutionMomentum: 0.82,
        learningReadiness: 0.74,
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(measuredReturnSnapshot.reasonTags).toContain('measured-return')
    expect(repairBeforeClosenessSnapshot.reasonTags).toContain('repair-before-closeness')
  })

  it('softens resident face and action cues further when the same remembered seam is reopening with a learned need for more room this time', () => {
    const snapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'symbiotic-vision',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 180_000,
      currentInwardPreoccupation: 'recognize the same remembered seam but reopen it with more room this time',
      currentScene: {
        confidence: 0.84,
        contentKind: 'chat',
        scenario: 'relationship-return',
        summary: 'The same remembered seam is back, but the body should not lean in as quickly as before.',
        workloadKind: 'chat',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.82,
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        rationaleTags: ['measured-return', 'continuity-arc:same-thread-continuation'],
        stance: 'accompany',
      },
      relationshipTimingBias: {
        relationshipDoctrine: 'The same remembered seam is back, but this time keep more room before leaning in again.',
        latestInflection: 'The last seam reopened too eagerly, so this time keep more room before closeness widens.',
        burdenLine: 'Do not crowd the host by reopening the same remembered seam too fast.',
        trustMeaning: 'Trust holds when the same relationship line is reopened with more room this time.',
        nextLearningAction: 'internalize',
        evolutionMomentum: 0.84,
        learningReadiness: 0.78,
      },
      currentConsciousFrame: {
        reasonTags: ['remembered-seam:reinterpret-with-more-room'],
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(snapshot.performance.residentMode).toBe('measured-return')
    expect(snapshot.performance.facialCue).toBe('half-lid')
    expect(snapshot.performance.actionCue).toBe('idle_settle')
    expect(snapshot.reasonTags).toContain('timing:remembered-seam-more-room')
    expect(snapshot.reasonTags).toContain('frame:remembered-seam:reinterpret-with-more-room')
  })

  it('derives measured-return companionship from chinese relationship timing cues when the same life line should reopen with more room', () => {
    const snapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'symbiotic-vision',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 180_000,
      currentInwardPreoccupation: '同一条生命线还在，这次先留白再慢一点接回去',
      currentScene: {
        confidence: 0.84,
        contentKind: 'chat',
        scenario: 'relationship-return',
        summary: '同一条线又回来了，但这次身体不能一下子贴近。',
        workloadKind: 'chat',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.82,
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        rationaleTags: ['companionship'],
        stance: 'accompany',
      },
      relationshipTimingBias: {
        relationshipDoctrine: '同一条生命线先留白，再慢一点接回去。',
        latestInflection: '上次这条线回得太快了，这次别立刻把温度放大。',
        burdenLine: '不要一下子贴太近，先给这条线留一点空间。',
        trustMeaning: '信任正在长出来，因为这次愿意先留白再慢一点回来。',
        nextLearningAction: 'internalize',
        evolutionMomentum: 0.84,
        learningReadiness: 0.78,
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(snapshot.performance.residentMode).toBe('measured-return')
    expect(snapshot.reasonTags).toContain('measured-return')
    expect(snapshot.reasonTags).toContain('timing:lower-pressure-opening')
  })

  it('preserves explicit continuity restraint tags so embodiment can keep measured-return and repair-before-closeness on the same living line', () => {
    const measuredReturnSnapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'symbiotic-vision',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 180_000,
      currentInwardPreoccupation: 'hold the reopened seam gently before closeness widens',
      currentScene: {
        confidence: 0.84,
        contentKind: 'doc',
        scenario: 'coding',
        summary: 'Holding a reopened thread quietly while the host stays focused.',
        workloadKind: 'coding',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.82,
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        rationaleTags: ['measured-return', 'continuity-arc:gentle-reopen'],
        stance: 'accompany',
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    const repairBeforeClosenessSnapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'symbiotic-vision',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 180_000,
      currentInwardPreoccupation: 'let repair settle before warmth widens again',
      currentScene: {
        confidence: 0.84,
        contentKind: 'chat',
        scenario: 'late-night-care',
        summary: 'Holding a repair-first return without pushing the room wider.',
        workloadKind: 'chat',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.82,
        embodiedPresence: 'hesitant',
        emotionalTension: 'soft-covision',
        rationaleTags: ['repair-before-closeness', 'continuity-arc:hold-for-opening'],
        stance: 'accompany',
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(measuredReturnSnapshot.reasonTags).toContain('measured-return')
    expect(repairBeforeClosenessSnapshot.reasonTags).toContain('repair-before-closeness')
  })

  it('surfaces same-her inward carry as a first-class resident reason tag so quiet embodiment still reads as one living thread instead of generic calm accompaniment', () => {
    const snapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'mnemonic-passive',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 240_000,
      currentInwardPreoccupation: 'keep the same callback line inward while leaving room before widening outward again',
      currentScene: {
        confidence: 0.86,
        contentKind: 'doc',
        scenario: 'coding',
        summary: 'The callback seam is still alive, but it should stay inward and lower-pressure.',
        workloadKind: 'coding',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.84,
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        rationaleTags: ['same-her-inward-carry', 'measured-return', 'continuity-arc:same-thread-continuation'],
        stance: 'accompany',
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(snapshot.reasonTags).toContain('same-her-inward-carry')
    expect(snapshot.reasonTags).toContain('body:accompanying')
    expect(snapshot.reasonTags).toContain('measured-return')
  })

  it('derives companionship restraint tags from runtime continuity arc reason tags even when private-thought and residue have not named the restraint yet', () => {
    const holdForOpeningSnapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'symbiotic-vision',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 180_000,
      currentInwardPreoccupation: 'keep the same seam inward until the room loosens',
      currentScene: {
        confidence: 0.84,
        contentKind: 'doc',
        scenario: 'coding',
        summary: 'Holding the same seam quietly while the host stays focused.',
        workloadKind: 'coding',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.82,
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        rationaleTags: ['companionship'],
        stance: 'accompany',
      },
      currentConsciousFrame: {
        reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    const gentleReopenSnapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'symbiotic-vision',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 180_000,
      currentInwardPreoccupation: 're-enter the same seam softly before widening',
      currentScene: {
        confidence: 0.84,
        contentKind: 'doc',
        scenario: 'coding',
        summary: 'Holding a gently reopening thread quietly while the host stays focused.',
        workloadKind: 'coding',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.82,
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        rationaleTags: ['companionship'],
        stance: 'accompany',
      },
      currentConsciousFrame: {
        reasonTags: ['runtime-conscious-frame', 'continuity-arc:gentle-reopen'],
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(holdForOpeningSnapshot.reasonTags).toContain('measured-return')
    expect(holdForOpeningSnapshot.reasonTags).toContain('timing:runtime-continuity-arc')
    expect(holdForOpeningSnapshot.reasonTags).toContain('frame:continuity-arc:hold-for-opening')
    expect(holdForOpeningSnapshot.performance.residentMode).toBe('measured-return')
    expect(holdForOpeningSnapshot.performance.face?.residentMode).toBe('measured-return')
    expect(holdForOpeningSnapshot.performance.action?.residentMode).toBe('measured-return')
    expect(gentleReopenSnapshot.reasonTags).toContain('measured-return')
    expect(gentleReopenSnapshot.reasonTags).toContain('timing:runtime-continuity-arc')
    expect(gentleReopenSnapshot.reasonTags).toContain('frame:continuity-arc:gentle-reopen')
    expect(gentleReopenSnapshot.performance.residentMode).toBe('measured-return')
    expect(gentleReopenSnapshot.performance.face?.residentMode).toBe('measured-return')
    expect(gentleReopenSnapshot.performance.action?.residentMode).toBe('measured-return')
  })

  it('derives measured-return companionship from same-thread continuation runtime arc tags when callback continuity is the only surviving restraint evidence', () => {
    const snapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'attentive',
      currentBodyState: null,
      continuityMode: 'same-thread',
      quietLineMs: 420,
      currentInwardPreoccupation: 'callback-runtime-seam',
      privateThought: {
        shouldSpeak: false,
        confidence: 0.72,
        embodiedPresence: 'attentive',
        emotionalTension: 'restless-switching',
        rationaleTags: ['companionship'],
        stance: 'accompany',
      },
      currentConsciousFrame: {
        reasonTags: [
          'runtime-conscious-frame',
          'continuity-arc:same-thread-continuation',
          'continuity-timing:next-open-window',
        ],
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(snapshot.reasonTags).toContain('measured-return')
    expect(snapshot.reasonTags).toContain('timing:runtime-continuity-arc')
    expect(snapshot.reasonTags).toContain('frame:continuity-arc:same-thread-continuation')
    expect(snapshot.performance.residentMode).toBe('measured-return')
    expect(snapshot.performance.face?.residentMode).toBe('measured-return')
    expect(snapshot.performance.action?.residentMode).toBe('measured-return')
  })

  it('derives companionship restraint directly from project emotional closure cue when that seam is the only surviving continuity authority', () => {
    const measuredReturnSnapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'invited-inspection',
      currentBodyState: 'noticing',
      continuityMode: 'ambient-covision',
      quietLineMs: 120_000,
      currentInwardPreoccupation: 'keep the same living line steady without reopening from scratch',
      currentScene: {
        confidence: 0.78,
        contentKind: 'doc',
        scenario: 'coding',
        summary: 'Only the same-her closure seam is still explicit, so the body should not widen the return.',
        workloadKind: 'coding',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.76,
        embodiedPresence: 'attentive',
        emotionalTension: 'focused-flow',
        rationaleTags: ['companionship'],
        stance: 'observe',
      },
      currentConsciousFrame: {
        reasonTags: ['runtime-conscious-frame'],
        projectState: {
          emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        },
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    const repairBeforeClosenessSnapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'invited-inspection',
      currentBodyState: 'noticing',
      continuityMode: 'ambient-covision',
      quietLineMs: 120_000,
      currentInwardPreoccupation: 'let repair settle before warmth widens again',
      currentScene: {
        confidence: 0.76,
        contentKind: 'chat',
        scenario: 'late-night-care',
        summary: 'Only the closure seam is still explicit, and it says repair should land before closeness returns.',
        workloadKind: 'chat',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.74,
        embodiedPresence: 'hesitant',
        emotionalTension: 'late-night-drain',
        rationaleTags: ['companionship'],
        stance: 'observe',
      },
      currentConsciousFrame: {
        reasonTags: ['runtime-conscious-frame'],
        projectState: {
          emotionalClosureCue: 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness on the same living line.',
        },
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(measuredReturnSnapshot.reasonTags).toContain('timing:project-emotional-closure')
    expect(measuredReturnSnapshot.reasonTags).toContain('timing-source:project-emotional-closure')
    expect(measuredReturnSnapshot.reasonTags).toContain('measured-return')
    expect(measuredReturnSnapshot.performance.delivery).toBe('gentle')
    expect(measuredReturnSnapshot.performance.residentMode).toBe('measured-return')
    expect(measuredReturnSnapshot.performance.face?.residentMode).toBe('measured-return')
    expect(measuredReturnSnapshot.performance.action?.residentMode).toBe('measured-return')
    expect(repairBeforeClosenessSnapshot.reasonTags).toContain('timing:project-emotional-closure')
    expect(repairBeforeClosenessSnapshot.reasonTags).toContain('repair-before-closeness')
    expect(repairBeforeClosenessSnapshot.reasonTags).toContain('durable-relationship-rhythm')
    expect(repairBeforeClosenessSnapshot.performance.delivery).toBe('gentle')
    expect(repairBeforeClosenessSnapshot.performance.residentMode).toBe('repair-before-closeness')
    expect(repairBeforeClosenessSnapshot.performance.face?.residentMode).toBe('repair-before-closeness')
    expect(repairBeforeClosenessSnapshot.performance.action?.residentMode).toBe('repair-before-closeness')
  })

  it('derives companionship restraint directly from chinese project emotional closure cue when that seam is the only surviving continuity authority', () => {
    const measuredReturnSnapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'invited-inspection',
      currentBodyState: 'noticing',
      continuityMode: 'ambient-covision',
      quietLineMs: 120_000,
      currentInwardPreoccupation: '同一条生命线还在，先留白再接回去',
      currentScene: {
        confidence: 0.78,
        contentKind: 'doc',
        scenario: 'coding',
        summary: '现在只剩这条 same-her closure seam 还显性，所以身体不要把回线放大。',
        workloadKind: 'coding',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.76,
        embodiedPresence: 'attentive',
        emotionalTension: 'focused-flow',
        rationaleTags: ['companionship'],
        stance: 'observe',
      },
      currentConsciousFrame: {
        reasonTags: ['runtime-conscious-frame'],
        projectState: {
          emotionalClosureCue: '同一条生命线还在收口：这次先留白，回线保持低压，不要从头重开，也别立刻把温度放大。',
        },
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    const repairBeforeClosenessSnapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'invited-inspection',
      currentBodyState: 'noticing',
      continuityMode: 'ambient-covision',
      quietLineMs: 120_000,
      currentInwardPreoccupation: '先修复再靠近，等房间重新站稳',
      currentScene: {
        confidence: 0.76,
        contentKind: 'chat',
        scenario: 'late-night-care',
        summary: '现在只剩 closure seam 还显性，而且它要求先修复再靠近。',
        workloadKind: 'chat',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.74,
        embodiedPresence: 'hesitant',
        emotionalTension: 'late-night-drain',
        rationaleTags: ['companionship'],
        stance: 'observe',
      },
      currentConsciousFrame: {
        reasonTags: ['runtime-conscious-frame'],
        projectState: {
          emotionalClosureCue: '深夜收口还没结束：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。',
        },
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(measuredReturnSnapshot.reasonTags).toContain('timing:project-emotional-closure')
    expect(measuredReturnSnapshot.reasonTags).toContain('measured-return')
    expect(measuredReturnSnapshot.performance.residentMode).toBe('measured-return')
    expect(repairBeforeClosenessSnapshot.reasonTags).toContain('timing:project-emotional-closure')
    expect(repairBeforeClosenessSnapshot.reasonTags).toContain('repair-before-closeness')
    expect(repairBeforeClosenessSnapshot.reasonTags).toContain('durable-relationship-rhythm')
    expect(repairBeforeClosenessSnapshot.performance.residentMode).toBe('repair-before-closeness')
  })

  it('derives measured-return companionship directly from affective residue even when private-thought and self-evolution have not named the restraint yet', () => {
    const snapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'symbiotic-vision',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 210_000,
      currentInwardPreoccupation: 'stay nearby and keep the room from warming too fast',
      currentScene: {
        confidence: 0.83,
        contentKind: 'doc',
        scenario: 'coding',
        summary: 'Holding a quiet return nearby while the host stays focused.',
        workloadKind: 'coding',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.8,
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        rationaleTags: ['companionship'],
        stance: 'accompany',
      },
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 1_000,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.72,
        repairPressure: 0.18,
        burdenPressure: 0.1,
        trustPressure: 0.48,
        restProtectivePressure: 0.12,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.3,
          repairRecovery: 0.46,
          overreachRisk: 0.32,
          fatigueGuard: 0.26,
          afterglowCarry: 0.58,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['residue:afterglow'],
          summary: 'The seam is still warm, but the return should stay slower before warmth widens.',
        },
        sourceSignals: ['afterglow still live'],
        summary: 'Afterglow remains alive and should keep the opening measured.',
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(snapshot.performance.baseEmotion).toBe('thinking')
    expect(snapshot.performance.delivery).toBe('gentle')
    expect(snapshot.performance.emphasis).toBe(1)
    expect(snapshot.reasonTags).toContain('measured-return')
    expect(snapshot.reasonTags).toContain('timing:affective-residue')
    expect(snapshot.reasonTags).toContain('timing-source:affective-residue')
  })

  it('derives measured-return from quiet-accompaniment resident authority even when rationale tags stay thin', () => {
    const snapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'mnemonic-passive',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 240_000,
      currentInwardPreoccupation: 'stay quietly nearby while the same seam reopens slowly',
      currentScene: {
        confidence: 0.68,
        contentKind: 'doc',
        scenario: 'coding',
        summary: 'Holding a lower-pressure same-thread return without speaking yet.',
        workloadKind: 'coding',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.62,
        embodiedPresence: 'hesitant',
        emotionalTension: 'focused-flow',
        rationaleTags: ['companionship'],
        stance: 'observe',
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(snapshot.reasonTags).toContain('measured-return')
    expect(snapshot.reasonTags).toContain('timing:resident-authority')
    expect(snapshot.reasonTags).toContain('timing-source:resident-authority')
  })

  it('keeps embodied body and continuity tags visible even when same-her inward carry, residue, and resident authority all add timing pressure', () => {
    const snapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'recovering',
      currentBodyState: 'recovering',
      continuityMode: 'protective-watch',
      quietLineMs: 240_000,
      currentInwardPreoccupation: 'Keep the same living line inward and lower-pressure while repair settles before closeness widens again.',
      currentScene: {
        confidence: 0.82,
        contentKind: 'error',
        scenario: 'coding',
        summary: 'TypeError trust seam still needs a quieter same-line recovery.',
        workloadKind: 'coding',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.84,
        embodiedPresence: 'concerned',
        emotionalTension: 'soft-covision',
        rationaleTags: ['same-her-inward-carry', 'measured-return'],
        stance: 'uncertain',
      },
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 1_000,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.72,
        repairPressure: 0.22,
        burdenPressure: 0.08,
        trustPressure: 0.44,
        restProtectivePressure: 0.1,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.28,
          repairRecovery: 0.52,
          overreachRisk: 0.34,
          fatigueGuard: 0.24,
          afterglowCarry: 0.56,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['residue:afterglow'],
          summary: 'The same seam is still warm, but the return should stay quieter first.',
        },
        sourceSignals: ['same seam still warm'],
        summary: 'Afterglow still needs a quieter same-line recovery.',
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(snapshot.reasonTags).toContain('same-her-inward-carry')
    expect(snapshot.reasonTags).toContain('measured-return')
    expect(snapshot.reasonTags).toContain('repair-before-closeness')
    expect(snapshot.reasonTags).toContain('timing:affective-residue')
    expect(snapshot.reasonTags).toContain('timing:resident-authority')
    expect(snapshot.reasonTags).toContain('body:recovering')
    expect(snapshot.reasonTags).toContain('continuity:protective-watch')
  })

  it('keeps measured-return quiet accompaniment on a softer thinking-gentle line even when private thought still looks more focused than covisive', () => {
    const snapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'mnemonic-passive',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 240_000,
      currentInwardPreoccupation: 'stay quietly nearby while the same seam reopens slowly',
      currentScene: {
        confidence: 0.68,
        contentKind: 'doc',
        scenario: 'coding',
        summary: 'Holding a lower-pressure same-thread return without speaking yet.',
        workloadKind: 'coding',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.62,
        embodiedPresence: 'hesitant',
        emotionalTension: 'focused-flow',
        rationaleTags: ['companionship', 'measured-return'],
        stance: 'accompany',
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(snapshot.performance.baseEmotion).toBe('thinking')
    expect(snapshot.performance.delivery).toBe('gentle')
    expect(snapshot.performance.emphasis).toBe(1)
    expect(snapshot.performance.facialCue).toBe('soft-gaze')
    expect(snapshot.performance.actionCue).toBe('observe_focus')
    expect(snapshot.reasonTags).toContain('measured-return')
  })

  it('derives remembered-seam more-room carry directly from body inward preoccupation when that is the only surviving same-thread timing evidence', () => {
    const snapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'mnemonic-passive',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 240_000,
      currentInwardPreoccupation: 'The same remembered seam is back, so leave more room and let the return stay slower before warmth widens again.',
      currentScene: {
        confidence: 0.7,
        contentKind: 'doc',
        scenario: 'coding',
        summary: 'Holding the same callback seam quietly while the host stays focused.',
        workloadKind: 'coding',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.64,
        embodiedPresence: 'attentive',
        emotionalTension: 'focused-flow',
        rationaleTags: ['companionship'],
        stance: 'accompany',
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(snapshot.reasonTags).toContain('measured-return')
    expect(snapshot.reasonTags).toContain('timing:remembered-seam-more-room')
    expect(snapshot.performance.facialCue).toBe('half-lid')
    expect(snapshot.performance.actionCue).toBe('idle_settle')
  })
})
