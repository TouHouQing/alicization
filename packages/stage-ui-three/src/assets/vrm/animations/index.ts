import type { VrmActionBinding } from '../../../types/performance'

export const animations = {
  idleLoop: new URL('../neko-motion/stand.vrma', import.meta.url),
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
  ...[
    ['open_palm', 'Open Palm', 'A prepared open palm while explaining one step'],
    ['thoughtful_pause', 'Thoughtful Pause', 'A quiet gaze and head turn while reflecting'],
    ['reassuring_nod', 'Reassuring Nod', 'One gentle acknowledgement with a caring lean'],
    ['gentle_boundary', 'Gentle Boundary', 'A restrained palm and posture when deferring'],
    ['nod', 'Nod', 'A gentle acknowledgement nod'],
    ['shake_head', 'Shake Head', 'A restrained disagreement shake'],
    ['tilt_head', 'Tilt Head', 'A curious hesitant head tilt'],
    ['steady_focus', 'Steady Focus', 'A focused forward attentive posture'],
    ['observe_focus', 'Observe Focus', 'A slow attentive observation glance'],
    ['comfort_sway', 'Comfort Sway', 'A gentle reassuring sway'],
    ['gentle_wave', 'Gentle Wave', 'A small greeting wave'],
    ['celebrate_small', 'Small Celebration', 'A restrained cheerful accomplishment gesture'],
    ['listen_close', 'Close Listening', 'An attentive lean and softened head posture'],
    ['rest_settle', 'Rest', 'A lowered relaxed posture while taking a quiet break'],
    ['stretch', 'Stretch', 'A deliberate shoulder and arm stretch'],
    ['turn_attentive', 'Turn', 'Turn the body toward an attention target'],
    ['shift_weight', 'Weight Shift', 'A quiet balanced change of standing weight'],
    ['small_step', 'Small Step', 'A bounded local step with leg, ankle and root movement'],
  ].map(([actionKey, label, description]): VrmActionBinding => ({
    id: `builtin-${actionKey}`,
    fileName: `procedural:${actionKey}`,
    actionKey,
    label,
    description,
    importedAt: 0,
    source: 'builtin',
  })),
]
