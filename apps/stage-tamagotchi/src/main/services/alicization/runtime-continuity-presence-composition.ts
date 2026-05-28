import { createAlicizationSessionContinuityBuildersRuntime } from './runtime-session-continuity-builders'
import { createAlicizationRuntimeVisualPresenceState } from './runtime-visual-presence-state'

type SessionContinuityBuildersRuntimeInput = Parameters<typeof createAlicizationSessionContinuityBuildersRuntime>[0]
type VisualPresenceStateRuntimeInput = Parameters<typeof createAlicizationRuntimeVisualPresenceState>[0]

export function createAlicizationRuntimeContinuityPresenceComposition(input: {
  sessionContinuity: SessionContinuityBuildersRuntimeInput
  visualPresence: VisualPresenceStateRuntimeInput
}) {
  const sessionContinuityBuildersRuntime = createAlicizationSessionContinuityBuildersRuntime(input.sessionContinuity)
  const visualPresenceStateRuntime = createAlicizationRuntimeVisualPresenceState(input.visualPresence)

  return {
    sessionContinuityBuildersRuntime,
    visualPresenceStateRuntime,
  }
}
