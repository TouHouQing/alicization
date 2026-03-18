import type { StageBubblePlacement, StageDialoguePanelRect } from '../utils'

import { useLocalStorageManualReset } from '@proj-alicization/stage-shared/composables'
import { defineStore } from 'pinia'

const stageDialogueDefaultRect: StageDialoguePanelRect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
}

const stageDialogueDefaultOrbFrame = {
  x: 0,
  y: 0,
}

type StageDialogueFrames = Record<StageBubblePlacement, StageDialoguePanelRect>
type StageDialogueCustomized = Record<StageBubblePlacement, boolean>
type StageDialogueOrbFrame = typeof stageDialogueDefaultOrbFrame

export const useStageDialogueStore = defineStore('stage-dialogue', () => {
  const frames = useLocalStorageManualReset<StageDialogueFrames>('settings/stage/dialogue/frames', {
    'top-left': { ...stageDialogueDefaultRect },
    'top-right': { ...stageDialogueDefaultRect },
  })
  const customized = useLocalStorageManualReset<StageDialogueCustomized>('settings/stage/dialogue/customized', {
    'top-left': false,
    'top-right': false,
  })
  const orbFrame = useLocalStorageManualReset<StageDialogueOrbFrame>('settings/stage/dialogue/orb-frame', {
    ...stageDialogueDefaultOrbFrame,
  })
  const orbCustomized = useLocalStorageManualReset('settings/stage/dialogue/orb-customized', false)
  const minimized = useLocalStorageManualReset('settings/stage/dialogue/minimized', false)

  function getFrame(placement: StageBubblePlacement) {
    return frames.value[placement] ?? stageDialogueDefaultRect
  }

  function hasCustomizedFrame(placement: StageBubblePlacement) {
    return Boolean(customized.value[placement])
  }

  function getOrbFrame() {
    return orbFrame.value
  }

  function hasCustomizedOrbFrame() {
    return Boolean(orbCustomized.value)
  }

  function setFrame(
    placement: StageBubblePlacement,
    frame: StageDialoguePanelRect,
    options: { markCustomized?: boolean } = {},
  ) {
    frames.value = {
      ...frames.value,
      [placement]: { ...frame },
    }

    if (options.markCustomized !== false) {
      customized.value = {
        ...customized.value,
        [placement]: true,
      }
    }
  }

  function setOrbFrame(
    frame: Pick<StageDialoguePanelRect, 'x' | 'y'>,
    options: { markCustomized?: boolean } = {},
  ) {
    orbFrame.value = {
      x: frame.x,
      y: frame.y,
    }

    if (options.markCustomized !== false)
      orbCustomized.value = true
  }

  function resetFrame(placement?: StageBubblePlacement) {
    if (placement) {
      frames.value = {
        ...frames.value,
        [placement]: { ...stageDialogueDefaultRect },
      }
      customized.value = {
        ...customized.value,
        [placement]: false,
      }
      return
    }

    frames.reset()
    customized.reset()
    orbFrame.reset()
    orbCustomized.reset()
  }

  function expand() {
    minimized.value = false
  }

  function minimize() {
    minimized.value = true
  }

  function toggleMinimized() {
    minimized.value = !minimized.value
  }

  return {
    frames,
    customized,
    orbFrame,
    orbCustomized,
    minimized,
    getFrame,
    hasCustomizedFrame,
    getOrbFrame,
    hasCustomizedOrbFrame,
    setFrame,
    setOrbFrame,
    resetFrame,
    expand,
    minimize,
    toggleMinimized,
  }
})
