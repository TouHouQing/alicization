import type { StageResidentBehaviorFrame } from '@proj-alicization/stage-ui/components/scenes/stage-resident-behavior-frame'
import type { Ref } from 'vue'

import { useAlicizationEpoch1Store } from '@proj-alicization/stage-ui/stores/alicization-epoch1'
import { useChatOrchestratorStore } from '@proj-alicization/stage-ui/stores/chat'
import { useChatTextComposerStore } from '@proj-alicization/stage-ui/stores/chat/text-composer-store'
import { useAiriCardStore } from '@proj-alicization/stage-ui/stores/modules/airi-card'
import { useIntervalFn } from '@vueuse/core'
import { readonly, shallowRef } from 'vue'

import { createLifeResidentBehavior } from './life-resident-behavior'

export function useLifeResidentBehavior(options: { paused: Readonly<Ref<boolean>>, listening: Readonly<Ref<boolean>>, composerFocused: Readonly<Ref<boolean>>, speaking: Readonly<Ref<boolean>> }) {
  const cards = useAiriCardStore()
  const epoch = useAlicizationEpoch1Store()
  const chat = useChatOrchestratorStore()
  const composer = useChatTextComposerStore()
  const behavior = createLifeResidentBehavior()
  const frame = shallowRef<StageResidentBehaviorFrame | null>(null)
  useIntervalFn(() => {
    frame.value = behavior.sample({ cardId: cards.activeCardId, identitySeed: epoch.soul?.frontmatter.core_incarnation ?? '', now: Date.now(), paused: options.paused.value || epoch.killSwitch.state === 'SUSPENDED', listening: options.listening.value || (options.composerFocused.value && (composer.isComposing || composer.draft.length > 0)), thinking: chat.sending, speaking: options.speaking.value, liveliness: epoch.soul?.frontmatter.personality.liveliness ?? 0.5 })
  }, 50, { immediateCallback: true })
  return readonly(frame)
}
