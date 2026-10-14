import type { AlicizationInteractionIntent } from '@proj-alicization/stage-shared'

/** Only an actual same-turn tool observation supplies a spatial target. */
export function attachObservedAttention(intent: AlicizationInteractionIntent | null, output: unknown, observationId: string, now: number) {
  if (!intent || !output || typeof output !== 'object' || !observationId || observationId.length > 120)
    return intent
  const observation = output as Record<string, unknown>
  const rect = observation.windowBounds as { left?: number, top?: number, width?: number, height?: number } | undefined
  if (observation.ok !== true || !rect || ![rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) || rect.width! <= 0 || rect.height! <= 0)
    return intent
  return { ...intent, attention: 'shared-task' as const, target: { screenX: rect.left! + rect.width! / 2, screenY: rect.top! + rect.height! / 2, observationId, observedAt: now }, createdAt: now, expiresAt: now + 30000, sourceRefs: [...intent.sourceRefs.slice(-6), observationId] }
}
