import type {
  StageBubblePlacement,
  StageDialoguePanelRect,
  StageDialoguePanelSize,
  StageDialogueRelativeOffset,
} from '../utils'

import { useLocalStorageManualReset } from '@proj-alicization/stage-shared/composables'
import { defineStore } from 'pinia'

const stageDialogueDefaultSize: StageDialoguePanelSize = {
  width: 0,
  height: 0,
}

const stageDialogueDefaultOffset: StageDialogueRelativeOffset = {
  x: 0,
  y: 0,
}

type StageDialoguePlacementSizes = Record<StageBubblePlacement, StageDialoguePanelSize>
type StageDialoguePlacementOffsets = Record<StageBubblePlacement, StageDialogueRelativeOffset>
type StageDialogueCustomized = Record<StageBubblePlacement, boolean>

export const useStageDialogueStore = defineStore('stage-dialogue', () => {
  const sizes = useLocalStorageManualReset<StageDialoguePlacementSizes>('settings/stage/dialogue/sizes', {
    'top-left': { ...stageDialogueDefaultSize },
    'top-right': { ...stageDialogueDefaultSize },
  })
  const offsets = useLocalStorageManualReset<StageDialoguePlacementOffsets>('settings/stage/dialogue/offsets', {
    'top-left': { ...stageDialogueDefaultOffset },
    'top-right': { ...stageDialogueDefaultOffset },
  })
  const customized = useLocalStorageManualReset<StageDialogueCustomized>('settings/stage/dialogue/customized', {
    'top-left': false,
    'top-right': false,
  })
  const orbOffset = useLocalStorageManualReset<StageDialogueRelativeOffset>('settings/stage/dialogue/orb-offset', {
    ...stageDialogueDefaultOffset,
  })
  const orbCustomized = useLocalStorageManualReset('settings/stage/dialogue/orb-customized', false)
  const minimized = useLocalStorageManualReset('settings/stage/dialogue/minimized', false)

  function getSize(placement: StageBubblePlacement) {
    return sizes.value[placement] ?? stageDialogueDefaultSize
  }

  function getOffset(placement: StageBubblePlacement) {
    return offsets.value[placement] ?? stageDialogueDefaultOffset
  }

  function hasCustomizedOffset(placement: StageBubblePlacement) {
    return Boolean(customized.value[placement])
  }

  function getOrbOffset() {
    return orbOffset.value
  }

  function hasCustomizedOrbOffset() {
    return Boolean(orbCustomized.value)
  }

  function setPanelLayout(
    placement: StageBubblePlacement,
    rect: StageDialoguePanelRect,
    relativeOffset: StageDialogueRelativeOffset,
    options: { markCustomized?: boolean } = {},
  ) {
    sizes.value = {
      ...sizes.value,
      [placement]: {
        width: rect.width,
        height: rect.height,
      },
    }
    offsets.value = {
      ...offsets.value,
      [placement]: { ...relativeOffset },
    }

    if (options.markCustomized !== false) {
      customized.value = {
        ...customized.value,
        [placement]: true,
      }
    }
  }

  function setOrbLayout(offset: StageDialogueRelativeOffset, options: { markCustomized?: boolean } = {}) {
    orbOffset.value = { ...offset }

    if (options.markCustomized !== false)
      orbCustomized.value = true
  }

  function resetLayout() {
    sizes.reset()
    offsets.reset()
    customized.reset()
    orbOffset.reset()
    orbCustomized.reset()
    minimized.reset()
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
    sizes,
    offsets,
    customized,
    orbOffset,
    orbCustomized,
    minimized,
    getSize,
    getOffset,
    hasCustomizedOffset,
    getOrbOffset,
    hasCustomizedOrbOffset,
    setPanelLayout,
    setOrbLayout,
    resetLayout,
    expand,
    minimize,
    toggleMinimized,
  }
})
