import type { VrmActionBinding } from '../../../types/performance'

export const animations = {
  idleLoop: new URL('./idle_loop.vrma', import.meta.url),
}

export const builtinActionBindings: VrmActionBinding[] = [
  {
    id: 'builtin-settle-idle',
    fileName: 'idle_loop.vrma',
    actionKey: 'settle_idle',
    label: 'Settle',
    description: 'Return to the neutral idle loop to settle posture and reset the body.',
    importedAt: 0,
    source: 'builtin',
    file: animations.idleLoop.toString(),
  },
]
