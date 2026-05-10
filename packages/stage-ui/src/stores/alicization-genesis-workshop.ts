import type { AlicizationPersonaWorkshopSubmission } from '@proj-alicization/stage-shared'

import { defaultAlicizationPersonaWorkshopSubmission } from '@proj-alicization/stage-shared'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

function createWorkshopDraft(): AlicizationPersonaWorkshopSubmission {
  return {
    presetTemperament: {
      ...defaultAlicizationPersonaWorkshopSubmission.presetTemperament,
    },
    relationshipPosture: defaultAlicizationPersonaWorkshopSubmission.relationshipPosture,
    initiativeStyle: defaultAlicizationPersonaWorkshopSubmission.initiativeStyle,
    freeDescription: defaultAlicizationPersonaWorkshopSubmission.freeDescription,
    antiPersonaConstraints: [...defaultAlicizationPersonaWorkshopSubmission.antiPersonaConstraints],
    calibration: {
      ...defaultAlicizationPersonaWorkshopSubmission.calibration,
    },
    previewCorrections: [...defaultAlicizationPersonaWorkshopSubmission.previewCorrections],
  }
}

export const useAlicizationGenesisWorkshopStore = defineStore('alicization-genesis-workshop', () => {
  const draft = ref<AlicizationPersonaWorkshopSubmission>(createWorkshopDraft())

  const hasDraftContent = computed(() => {
    return Boolean(
      draft.value.freeDescription?.trim()
      || (draft.value.antiPersonaConstraints?.length ?? 0) > 0,
    )
  })

  function resetDraft() {
    draft.value = createWorkshopDraft()
  }

  function snapshotDraft() {
    return {
      presetTemperament: draft.value.presetTemperament ? { ...draft.value.presetTemperament } : null,
      relationshipPosture: draft.value.relationshipPosture,
      initiativeStyle: draft.value.initiativeStyle,
      freeDescription: draft.value.freeDescription,
      antiPersonaConstraints: [...(draft.value.antiPersonaConstraints ?? [])],
      calibration: draft.value.calibration ? { ...draft.value.calibration } : null,
      previewCorrections: [...(draft.value.previewCorrections ?? [])],
    } satisfies AlicizationPersonaWorkshopSubmission
  }

  return {
    draft,
    hasDraftContent,
    resetDraft,
    snapshotDraft,
  }
})
