import type {
  AlicizationChannelCapability,
  AlicizationExecutionChannel,
} from '@proj-alicization/stage-shared'

export const openClawBackedExecutionChannels = [
  'openclaw',
  'browser',
  'software',
  'desktop',
] as const

export type AlicizationOpenClawBackedExecutionChannel = typeof openClawBackedExecutionChannels[number]

const openClawFacadeChannels = [
  { channel: 'browser', sessionAffinity: true },
  { channel: 'software', sessionAffinity: true },
  { channel: 'desktop', sessionAffinity: false },
] as const satisfies Array<{
  channel: Exclude<AlicizationOpenClawBackedExecutionChannel, 'openclaw'>
  sessionAffinity: boolean
}>

export function isOpenClawBackedExecutionChannel(
  channel: AlicizationExecutionChannel | null | undefined,
): channel is AlicizationOpenClawBackedExecutionChannel {
  return channel === 'openclaw'
    || channel === 'browser'
    || channel === 'software'
    || channel === 'desktop'
}

export function resolveExecutionTransportChannel(
  channel: AlicizationExecutionChannel | null | undefined,
): AlicizationExecutionChannel | null {
  if (!channel)
    return null
  return isOpenClawBackedExecutionChannel(channel)
    ? 'openclaw'
    : channel
}

export function resolveOpenClawEventChannel(
  channel: AlicizationExecutionChannel | null | undefined,
): AlicizationOpenClawBackedExecutionChannel {
  return isOpenClawBackedExecutionChannel(channel)
    ? channel
    : 'openclaw'
}

export function expandOpenClawBackedCapabilities(
  capability: AlicizationChannelCapability,
): AlicizationChannelCapability[] {
  if (capability.channel !== 'openclaw')
    return [capability]

  return [
    {
      ...capability,
      channel: 'openclaw',
      sessionAffinity: true,
    },
    ...openClawFacadeChannels.map(({ channel, sessionAffinity }) => ({
      channel,
      available: capability.available,
      enabled: capability.enabled,
      ready: capability.ready,
      sessionAffinity,
      reason: capability.reason,
    }) satisfies AlicizationChannelCapability),
  ]
}
