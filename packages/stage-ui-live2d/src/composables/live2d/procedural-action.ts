import type { InternalModel } from 'pixi-live2d-display/cubism4'

import type { createLive2DProceduralGesture } from './procedural-gesture'

type Gesture = ReturnType<typeof createLive2DProceduralGesture>

/** Native assets and procedural gestures share one foreground motion owner. */
export function startLive2DProceduralAction(input: {
  gesture: Gesture
  manager: Pick<InternalModel['motionManager'], 'state' | 'stopAllMotions'>
  request: Parameters<Gesture['start']>[0]
  supports: (parameter: string) => boolean
  background: boolean
  onHandoff: () => void
}) {
  const { gesture, manager, request, supports } = input
  if (input.background && (manager.state.currentPriority > 1 || manager.state.reservePriority > 1))
    return false
  if (!gesture.start(request, supports))
    return false

  // The SDK reset also revokes the reservation checked after async asset loads.
  // Only an accepted foreground gesture may retire the previous native owner.
  input.onHandoff()
  if (manager.state.currentPriority > 0 || manager.state.reservePriority > 0)
    manager.stopAllMotions()
  return true
}
