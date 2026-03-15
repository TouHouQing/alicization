import type { ContextMessage } from '../../../types/chat'
import type { AlicizationSensoryCacheSnapshot } from '../../alicization-bridge'

import { ContextUpdateStrategy } from '@proj-airi/server-sdk'
import { nanoid } from 'nanoid'

const SENSORY_CONTEXT_ID = 'alicization:sensory'

function roundPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function createSensoryContext(snapshot: AlicizationSensoryCacheSnapshot): ContextMessage {
  const sample = snapshot.sample
  const batteryText = sample.battery
    ? `${roundPercent(sample.battery.percent)}%(charging=${sample.battery.charging ? 'true' : 'false'})`
    : 'unavailable'

  const sensoryText = [
    '[System Context: Sensory]',
    `time=${sample.time.local || sample.time.iso}`,
    `battery=${batteryText}`,
    `cpu=${roundPercent(sample.cpu.usagePercent)}%`,
    `memory=${roundPercent(sample.memory.usagePercent)}%`,
  ].join(', ')

  return {
    id: nanoid(),
    contextId: SENSORY_CONTEXT_ID,
    strategy: ContextUpdateStrategy.ReplaceSelf,
    text: sensoryText,
    createdAt: Date.now(),
  }
}
