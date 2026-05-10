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

  function setFreeDescription(value: string) {
    draft.value.freeDescription = value
  }

  function setAntiPersonaConstraints(value: string[]) {
    draft.value.antiPersonaConstraints = value
  }

  function setTemperament(
    key: keyof NonNullable<AlicizationPersonaWorkshopSubmission['presetTemperament']>,
    value: number,
  ) {
    draft.value.presetTemperament = {
      ...draft.value.presetTemperament,
      [key]: value,
    }
  }

  function setRelationshipPosture(value: NonNullable<AlicizationPersonaWorkshopSubmission['relationshipPosture']>) {
    draft.value.relationshipPosture = value
  }

  function setInitiativeStyle(value: NonNullable<AlicizationPersonaWorkshopSubmission['initiativeStyle']>) {
    draft.value.initiativeStyle = value
  }

  function setCalibration(
    key: keyof NonNullable<NonNullable<AlicizationPersonaWorkshopSubmission['calibration']>>,
    value: string,
  ) {
    draft.value.calibration = {
      ...draft.value.calibration,
      [key]: value,
    }
  }

  function setPreviewCorrections(value: string[]) {
    draft.value.previewCorrections = value
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
    setTemperament,
    setRelationshipPosture,
    setInitiativeStyle,
    setFreeDescription,
    setAntiPersonaConstraints,
    setCalibration,
    setPreviewCorrections,
    snapshotDraft,
  }
})
