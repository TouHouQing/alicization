import type { AlicizationTaskThreadRecord } from '../../../../shared/eventa'
import type { LifeEffect, LifeStateView } from '../../../../shared/life-contracts'

import { describe, expect, it, vi } from 'vitest'

import { deriveExecutionAttention } from './execution-attention'
import { executionGazeTarget } from './execution-gaze'

const observed: LifeEffect = { id: 'read-window', operationKey: 'read-window', kind: 'execute', status: 'settled', turnId: 'current-run', actionId: 'read', generation: 0, leaseUntil: null, payload: { capabilityId: 'tool.desktop_list_interactables' }, receipt: { outcome: 'success', observedAt: 1000, output: { windowBounds: { left: -1800, top: 120, width: 600, height: 400 }, windowVisible: true, coordinateSpace: 'screen-physical' } } }

describe('execution gaze from actual window observations', () => {
  it('looks toward the actual localized image point once and uses the capture timestamp', () => {
    const effect = structuredClone(observed)
    effect.payload.capabilityId = 'tool.desktop_locate_window'
    effect.receipt!.observedAt = 1500
    effect.receipt!.output = { windowVisible: true, coordinateSpace: 'screen-physical', observedAt: 1000, windowBounds: { left: 100, top: 200, width: 800, height: 600 }, geometry: { coordinateSpace: 'screen-physical', clientBounds: { left: 100, top: 200, width: 800, height: 600 }, virtualScreen: { left: 0, top: 0, width: 2560, height: 1440 }, displays: [{ left: 0, top: 0, width: 2560, height: 1440 }], imageWidth: 400, imageHeight: 300, dpiX: 120, dpiY: 120 }, locations: [{ index: 0, state: 'unique', confidence: 0.99, point: { space: 'image-pixel', x: 100, y: 100 } }] }
    const convert = vi.fn((point: { x: number, y: number }) => ({ x: Math.round(point.x / 1.25), y: Math.round(point.y / 1.25) }))
    const geometry = { screenToDipPoint: convert, displayAt: () => ({ x: 0, y: 0, width: 2048, height: 1152 }) }
    expect(executionGazeTarget(effect, geometry, 1600)).toMatchObject({ x: 241, y: 321, observedAt: 1000, expiresAt: 4000 })
    expect(convert).toHaveBeenCalledExactlyOnceWith({ x: 301, y: 401 })
    expect(executionGazeTarget(effect, geometry, 4100)).toBeNull()
  })
  it('projects only the current root generation and work slice, never an earlier attempt observation', () => {
    const thread = { id: 'thread' } as AlicizationTaskThreadRecord
    const view = { cardId: 'alice', obligations: [{ id: 'goal', threadId: 'thread', status: 'in-progress', generation: 2 }], execution: {
      plans: [{ id: 'plan', rootThreadId: 'thread', obligationGeneration: 2, revision: 3, steps: [{ id: 'read', capabilityId: 'tool.desktop_list_interactables' }] }],
      slices: [{ id: 'slice', planId: 'plan', planRevision: 3, attemptId: 'attempt', ingressId: 'current-run', state: 'running' }],
      results: [{ planId: 'plan', planRevision: 3, attemptId: 'attempt', stepId: 'read', effectId: observed.id, state: 'verified' }],
    }, effects: [structuredClone(observed)] } as unknown as LifeStateView
    const resolveTarget = vi.fn((effect: LifeEffect) => executionGazeTarget(effect, { screenToDipPoint: point => point, displayAt: () => ({ x: -1920, y: 0, width: 1920, height: 1080 }) }, 1100))
    expect(deriveExecutionAttention(view, thread, resolveTarget)?.target?.observationId).toBe('observation:read-window')
    resolveTarget.mockClear()
    view.effects[0].turnId = 'earlier-run'
    expect(deriveExecutionAttention(view, thread, resolveTarget)?.target).toBeUndefined()
    expect(resolveTarget).not.toHaveBeenCalled()
    view.obligations[0].generation = 3
    expect(deriveExecutionAttention(view, thread, resolveTarget)).toBeNull()
    view.obligations[0].generation = 2
    view.obligations[0].status = 'cancelled'
    expect(deriveExecutionAttention(view, thread, resolveTarget)).toBeNull()
  })

  it('converts physical points once using their own display, preserving a negative monitor origin', () => {
    const screenToDipPoint = vi.fn((point: { x: number, y: number }) => ({ x: point.x / 1.5, y: point.y / 1.5 }))
    const display = { x: -1280, y: 0, width: 1280, height: 720 }
    expect(executionGazeTarget(observed, { screenToDipPoint, displayAt: () => display }, 1100)).toEqual({ space: 'screen-dip', x: -1000, y: 320 / 1.5, display, observationId: 'observation:read-window', observedAt: 1000, expiresAt: 4000 })
    expect(screenToDipPoint).toHaveBeenCalledExactlyOnceWith({ x: -1500, y: 320 })
    const dip = structuredClone(observed)
    dip.receipt!.output = { ...(dip.receipt!.output as object), coordinateSpace: 'screen-dip' }
    screenToDipPoint.mockClear()
    expect(executionGazeTarget(dip, { screenToDipPoint, displayAt: () => ({ x: -1920, y: 0, width: 1920, height: 1080 }) }, 1100)?.x).toBe(-1500)
    expect(screenToDipPoint).not.toHaveBeenCalled()
  })

  it.each(['hidden', 'expired', 'future', 'unknown-space', 'wrong-operation', 'unsettled', 'failed', 'off-display'] as const)('withholds gaze for %s evidence', (scenario) => {
    const effect = structuredClone(observed)
    const output = effect.receipt!.output as Record<string, unknown>
    if (scenario === 'hidden')
      output.windowVisible = false
    if (scenario === 'unknown-space')
      output.coordinateSpace = 'unknown'
    if (scenario === 'future')
      effect.receipt!.observedAt = 1200
    if (scenario === 'wrong-operation')
      effect.payload.capabilityId = 'tool.filesystem_read_file'
    if (scenario === 'unsettled')
      effect.status = 'uncertain'
    if (scenario === 'failed')
      effect.receipt!.outcome = 'failure'
    expect(executionGazeTarget(effect, { screenToDipPoint: point => point, displayAt: () => scenario === 'off-display' ? { x: 0, y: 0, width: 1920, height: 1080 } : { x: -1920, y: 0, width: 1920, height: 1080 } }, scenario === 'expired' ? 4000 : 1100)).toBeNull()
  })
})
