import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

export type StageDeveloperRuntime = 'desktop' | 'mobile' | 'web'

export interface StageDeveloperMenuItem {
  description: string
  icon: string
  title: string
  to: string
}

interface StageDeveloperMenuDescriptor {
  descriptionKey: string
  icon: string
  runtimes: StageDeveloperRuntime[]
  titleKey: string
  to: string
}

const developerMenuDescriptors: StageDeveloperMenuDescriptor[] = [
  {
    titleKey: 'settings.pages.system.sections.section.developer.sections.section.audio-record.title',
    descriptionKey: 'settings.pages.system.sections.section.developer.sections.section.audio-record.description',
    icon: 'i-solar:sledgehammer-bold-duotone',
    to: '/devtools/audio-record',
    runtimes: ['web', 'mobile'],
  },
  {
    titleKey: 'settings.pages.system.sections.section.developer.sections.section.performance-visualizer.title',
    descriptionKey: 'settings.pages.system.sections.section.developer.sections.section.performance-visualizer.description',
    icon: 'i-solar:chart-square-bold-duotone',
    to: '/devtools/performance-visualizer',
    runtimes: ['web', 'mobile'],
  },
  {
    titleKey: 'settings.pages.system.sections.section.developer.sections.section.markdown-stress.title',
    descriptionKey: 'settings.pages.system.sections.section.developer.sections.section.markdown-stress.description',
    icon: 'i-solar:code-bold-duotone',
    to: '/devtools/markdown-stress',
    runtimes: ['web', 'mobile'],
  },
  {
    titleKey: 'settings.pages.system.sections.section.developer.sections.section.background-gradient-blending.title',
    descriptionKey: 'settings.pages.system.sections.section.developer.sections.section.background-gradient-blending.description',
    icon: 'i-solar:sledgehammer-bold-duotone',
    to: '/devtools/background-gradient-blending',
    runtimes: ['web', 'mobile'],
  },
  {
    titleKey: 'settings.pages.system.sections.section.developer.sections.section.background-removal.title',
    descriptionKey: 'settings.pages.system.sections.section.developer.sections.section.background-removal.description',
    icon: 'i-solar:sledgehammer-bold-duotone',
    to: '/devtools/background-removal',
    runtimes: ['web', 'mobile'],
  },
  {
    titleKey: 'settings.pages.system.sections.section.developer.sections.section.gesture-circle.title',
    descriptionKey: 'settings.pages.system.sections.section.developer.sections.section.gesture-circle.description',
    icon: 'i-solar:sledgehammer-bold-duotone',
    to: '/devtools/gesture-circle',
    runtimes: ['web', 'mobile'],
  },
  {
    titleKey: 'settings.pages.system.sections.section.developer.sections.section.image.title',
    descriptionKey: 'settings.pages.system.sections.section.developer.sections.section.image.description',
    icon: 'i-solar:sledgehammer-bold-duotone',
    to: '/devtools/image',
    runtimes: ['web', 'mobile'],
  },
  {
    titleKey: 'settings.pages.system.sections.section.developer.sections.section.polaroid.title',
    descriptionKey: 'settings.pages.system.sections.section.developer.sections.section.polaroid.description',
    icon: 'i-solar:sledgehammer-bold-duotone',
    to: '/devtools/polaroid',
    runtimes: ['web', 'mobile'],
  },
  {
    titleKey: 'settings.pages.system.sections.section.developer.sections.section.use-magic-keys.title',
    descriptionKey: 'settings.pages.system.sections.section.developer.sections.section.use-magic-keys.description',
    icon: 'i-solar:sledgehammer-bold-duotone',
    to: '/devtools/use-magic-keys',
    runtimes: ['desktop', 'web', 'mobile'],
  },
  {
    titleKey: 'tamagotchi.settings.pages.system.developer.sections.section.use-window-mouse.title',
    descriptionKey: 'tamagotchi.settings.pages.system.developer.sections.section.use-window-mouse.description',
    icon: 'i-solar:sledgehammer-bold-duotone',
    to: '/devtools/use-window-mouse',
    runtimes: ['desktop', 'web', 'mobile'],
  },
  {
    titleKey: 'settings.pages.system.sections.section.developer.sections.section.displays.title',
    descriptionKey: 'settings.pages.system.sections.section.developer.sections.section.displays.description',
    icon: 'i-solar:sledgehammer-bold-duotone',
    to: '/devtools/use-electron-all-displays',
    runtimes: ['desktop', 'web', 'mobile'],
  },
  {
    titleKey: 'settings.pages.system.sections.section.developer.sections.section.widgets-calling.title',
    descriptionKey: 'settings.pages.system.sections.section.developer.sections.section.widgets-calling.description',
    icon: 'i-solar:sledgehammer-bold-duotone',
    to: '/devtools/widgets-calling',
    runtimes: ['desktop', 'web', 'mobile'],
  },
  {
    titleKey: 'settings.pages.system.sections.section.developer.sections.section.context-flow.title',
    descriptionKey: 'settings.pages.system.sections.section.developer.sections.section.context-flow.description',
    icon: 'i-solar:chat-square-call-bold-duotone',
    to: '/devtools/context-flow',
    runtimes: ['desktop', 'web', 'mobile'],
  },
  {
    titleKey: 'settings.pages.system.sections.section.developer.sections.section.relative-mouse.title',
    descriptionKey: 'settings.pages.system.sections.section.developer.sections.section.relative-mouse.description',
    icon: 'i-solar:sledgehammer-bold-duotone',
    to: '/devtools/use-electron-relative-mouse',
    runtimes: ['desktop', 'web', 'mobile'],
  },
  {
    titleKey: 'settings.pages.system.sections.section.developer.sections.section.providers-transcription-realtime-aliyun-nls.title',
    descriptionKey: 'settings.pages.system.sections.section.developer.sections.section.providers-transcription-realtime-aliyun-nls.description',
    icon: 'i-solar:sledgehammer-bold-duotone',
    to: '/devtools/providers-transcription-realtime-aliyun-nls',
    runtimes: ['desktop', 'web', 'mobile'],
  },
  {
    titleKey: 'settings.pages.system.sections.section.developer.sections.section.beat-sync.title',
    descriptionKey: 'settings.pages.system.sections.section.developer.sections.section.beat-sync.description',
    icon: 'i-solar:chart-bold-duotone',
    to: '/devtools/beat-sync',
    runtimes: ['desktop', 'web', 'mobile'],
  },
  {
    titleKey: 'settings.pages.system.sections.section.developer.sections.section.websocket-inspector.title',
    descriptionKey: 'settings.pages.system.sections.section.developer.sections.section.websocket-inspector.description',
    icon: 'i-solar:transfer-horizontal-bold-duotone',
    to: '/devtools/websocket-inspector',
    runtimes: ['desktop', 'web', 'mobile'],
  },
  {
    titleKey: 'settings.pages.system.sections.section.developer.sections.section.plugin-host.title',
    descriptionKey: 'settings.pages.system.sections.section.developer.sections.section.plugin-host.description',
    icon: 'i-solar:bug-bold-duotone',
    to: '/devtools/plugin-host',
    runtimes: ['desktop', 'web', 'mobile'],
  },
  {
    titleKey: 'settings.pages.system.sections.section.developer.sections.section.screen-capture.title',
    descriptionKey: 'settings.pages.system.sections.section.developer.sections.section.screen-capture.description',
    icon: 'i-solar:screen-share-bold-duotone',
    to: '/devtools/screen-capture',
    runtimes: ['desktop', 'web', 'mobile'],
  },
  {
    titleKey: 'settings.pages.system.sections.section.developer.sections.section.vibrant.title',
    descriptionKey: 'settings.pages.system.sections.section.developer.sections.section.vibrant.description',
    icon: 'i-solar:sledgehammer-bold-duotone',
    to: '/devtools/vibrant',
    runtimes: ['web', 'mobile'],
  },
  {
    titleKey: 'settings.pages.system.sections.section.developer.sections.section.performance-playground.title',
    descriptionKey: 'settings.pages.system.sections.section.developer.sections.section.performance-playground.description',
    icon: 'i-solar:sledgehammer-bold-duotone',
    to: '/devtools/performance-playground',
    runtimes: ['web', 'mobile'],
  },
  {
    titleKey: 'settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.title',
    descriptionKey: 'settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.description',
    icon: 'i-solar:sledgehammer-bold-duotone',
    to: '/devtools/model-driver-mediapipe',
    runtimes: ['web'],
  },
  {
    titleKey: 'settings.pages.system.sections.section.developer.sections.section.notifications.title',
    descriptionKey: 'settings.pages.system.sections.section.developer.sections.section.notifications.description',
    icon: 'i-solar:sledgehammer-bold-duotone',
    to: '/devtools/notifications',
    runtimes: ['mobile'],
  },
]

export function useStageDeveloperMenu(runtime: StageDeveloperRuntime) {
  const { t } = useI18n()

  return computed<StageDeveloperMenuItem[]>(() => {
    return developerMenuDescriptors
      .filter(descriptor => descriptor.runtimes.includes(runtime))
      .map(descriptor => ({
        title: t(descriptor.titleKey),
        description: t(descriptor.descriptionKey),
        icon: descriptor.icon,
        to: descriptor.to,
      }))
  })
}
