import { describe, expect, it } from 'vitest'

import {
  autonomousDialogueOrigins,
  autonomousDialogueStructuredFormats,
  autonomousDialogueTurnIdPrefixes,
  buildAlicizationAutonomousDialogueTurnId,
  isAlicizationAutonomousDialogueFamily,
  resolveAlicizationAutonomousDialogueFamilyClassification,
  resolveAlicizationAutonomousDialogueOrigin,
  resolveAlicizationAutonomousDialogueStructuredFormat,
  resolveAlicizationRuntimeMindTurnStructuredFormat,
  resolveAlicizationStructuredFormatLane,
} from './runtime-structured-format'

describe('runtime structured format', () => {
  it('keeps mind-turn-v1 as the only normal governed user-turn format', () => {
    expect(resolveAlicizationRuntimeMindTurnStructuredFormat({
      rawFormat: 'mind-turn-v1',
      hasGovernance: true,
      origin: 'ui-user',
    })).toEqual(expect.objectContaining({
      format: 'mind-turn-v1',
      lane: 'normal',
      legacyInputFormat: null,
    }))
  })

  it('migrates governed epoch1 payloads as legacy input instead of final output format', () => {
    expect(resolveAlicizationRuntimeMindTurnStructuredFormat({
      rawFormat: 'epoch1-v1',
      hasGovernance: true,
      origin: 'ui-user',
    })).toEqual(expect.objectContaining({
      format: 'mind-turn-v1',
      lane: 'legacy-input',
      legacyInputFormat: 'epoch1-v1',
    }))
  })

  it('keeps governed epoch1 payloads on the autonomous legacy lane when proactive origin is only drifting in case or whitespace', () => {
    expect(resolveAlicizationRuntimeMindTurnStructuredFormat({
      rawFormat: 'epoch1-v1',
      hasGovernance: true,
      origin: ' SubConscious-Proactive ' as any,
    })).toEqual(expect.objectContaining({
      format: 'epoch1-v1',
      lane: 'legacy-input',
      legacyInputFormat: 'epoch1-v1',
    }))
  })

  it('classifies fallback-v1 as infra fallback rather than normal reply format', () => {
    expect(resolveAlicizationRuntimeMindTurnStructuredFormat({
      rawFormat: 'fallback-v1',
      contractFailed: true,
      hasGovernance: false,
      origin: 'ui-user',
    })).toEqual(expect.objectContaining({
      format: 'fallback-v1',
      lane: 'infra-fallback',
      legacyInputFormat: 'fallback-v1',
    }))
    expect(resolveAlicizationStructuredFormatLane('fallback-v1')).toBe('infra-fallback')
  })

  it('keeps runtime-owned autonomous dialogue family markers explicit so reminder, subconscious, and callback entrypoints cannot quietly drift apart', () => {
    expect(autonomousDialogueStructuredFormats.slice().sort()).toEqual([
      'subconscious-proactive-llm-v1',
      'subconscious-proactive-v1',
      'subconscious-reminder-v1',
    ])
    expect(autonomousDialogueTurnIdPrefixes.slice().sort()).toEqual([
      'execution-callback:',
      'reminder:',
      'subconscious:',
    ])
    expect(autonomousDialogueOrigins.slice().sort()).toEqual([
      'subconscious-proactive',
    ])
    expect(isAlicizationAutonomousDialogueFamily({
      turnId: 'reminder:default:task-1:123',
      rawFormat: 'mind-turn-v1',
      origin: 'user-turn',
    })).toBe(true)
    expect(isAlicizationAutonomousDialogueFamily({
      turnId: 'turn-user',
      rawFormat: 'subconscious-reminder-v1',
      origin: 'user-turn',
    })).toBe(true)
    expect(isAlicizationAutonomousDialogueFamily({
      turnId: 'turn-user',
      rawFormat: 'mind-turn-v1',
      origin: 'subconscious-proactive',
    })).toBe(true)
    expect(isAlicizationAutonomousDialogueFamily({
      turnId: 'turn-user',
      rawFormat: 'mind-turn-v1',
      origin: 'user-turn',
    })).toBe(false)
  })

  it('builds autonomous dialogue turn ids and structured formats from the shared helper so runtime-owned entry builders do not hand-roll reminder, callback, or subconscious family strings', () => {
    expect(buildAlicizationAutonomousDialogueTurnId({
      kind: 'reminder',
      segments: ['default', 'task-1', 123],
    })).toBe('reminder:default:task-1:123')
    expect(buildAlicizationAutonomousDialogueTurnId({
      kind: 'execution-callback',
      segments: ['default', 'thread-1', 456],
    })).toBe('execution-callback:default:thread-1:456')
    expect(buildAlicizationAutonomousDialogueTurnId({
      kind: 'subconscious',
      segments: ['default', 789],
    })).toBe('subconscious:default:789')

    expect(resolveAlicizationAutonomousDialogueStructuredFormat('subconscious-reminder')).toBe('subconscious-reminder-v1')
    expect(resolveAlicizationAutonomousDialogueStructuredFormat('subconscious-proactive')).toBe('subconscious-proactive-v1')
    expect(resolveAlicizationAutonomousDialogueStructuredFormat('subconscious-proactive-llm')).toBe('subconscious-proactive-llm-v1')
    expect(resolveAlicizationAutonomousDialogueOrigin('proactive')).toBe('subconscious-proactive')
  })

  it('classifies runtime-owned autonomous dialogue families even when origin is missing but turn-id or structured-format markers still keep the same entrypoint line explicit', () => {
    expect(resolveAlicizationAutonomousDialogueFamilyClassification({
      turnId: 'reminder:default:task-1:123',
      rawFormat: 'mind-turn-v1',
      origin: 'user-turn',
    })).toEqual({
      isAutonomous: true,
      matchedBy: ['turn-id-prefix'],
      canonicalOrigin: 'subconscious-proactive',
    })

    expect(resolveAlicizationAutonomousDialogueFamilyClassification({
      turnId: 'turn-user',
      rawFormat: 'subconscious-reminder-v1',
      origin: 'user-turn',
    })).toEqual({
      isAutonomous: true,
      matchedBy: ['structured-format'],
      canonicalOrigin: 'subconscious-proactive',
    })

    expect(resolveAlicizationAutonomousDialogueFamilyClassification({
      turnId: 'turn-user',
      rawFormat: 'mind-turn-v1',
      origin: 'subconscious-proactive',
    })).toEqual({
      isAutonomous: true,
      matchedBy: ['origin'],
      canonicalOrigin: 'subconscious-proactive',
    })

    expect(resolveAlicizationAutonomousDialogueFamilyClassification({
      turnId: 'turn-user',
      rawFormat: 'mind-turn-v1',
      origin: 'user-turn',
    })).toEqual({
      isAutonomous: false,
      matchedBy: [],
      canonicalOrigin: null,
    })
  })
})
