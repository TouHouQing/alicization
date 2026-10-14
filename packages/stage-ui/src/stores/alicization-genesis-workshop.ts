import type { AlicizationPersonaWorkshopSubmission } from '@proj-alicization/stage-shared'

import type { AlicizationGenesisInput } from './alicization-bridge'

import { defaultAlicizationPersonality, defaultAlicizationPersonaWorkshopSubmission, defaultAlicizationProfile } from '@proj-alicization/stage-shared'
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
  const identity = ref({
    alicizationName: String(defaultAlicizationProfile.alicizationName),
    hostName: '',
  })
  const hasValidIdentity = computed(() => Boolean(identity.value.alicizationName.trim() && identity.value.hostName.trim()))

  const hasDraftContent = computed(() => {
    return Boolean(
      draft.value.freeDescription?.trim()
      || (draft.value.antiPersonaConstraints?.length ?? 0) > 0,
    )
  })

  function resetDraft() {
    draft.value = createWorkshopDraft()
    identity.value = { alicizationName: defaultAlicizationProfile.alicizationName, hostName: '' }
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

  function buildGenesisPayload(): AlicizationGenesisInput {
    if (!hasValidIdentity.value)
      throw new Error('Her name and your preferred name are required.')

    return {
      ...defaultAlicizationProfile,
      ownerName: identity.value.hostName.trim(),
      hostName: identity.value.hostName.trim(),
      alicizationName: identity.value.alicizationName.trim(),
      personality: {
        ...defaultAlicizationPersonality,
        identityKernel: {
          ...defaultAlicizationPersonality.identityKernel,
          temperament: { ...defaultAlicizationPersonality.identityKernel.temperament },
          valueBias: [...defaultAlicizationPersonality.identityKernel.valueBias],
        },
        expressionProfile: { ...defaultAlicizationPersonality.expressionProfile },
        initiativeBaseline: { ...defaultAlicizationPersonality.initiativeBaseline },
        evolutionSeed: {
          ...defaultAlicizationPersonality.evolutionSeed,
          fastLayers: [...defaultAlicizationPersonality.evolutionSeed.fastLayers],
          slowLayers: [...defaultAlicizationPersonality.evolutionSeed.slowLayers],
          unlockTracks: [...defaultAlicizationPersonality.evolutionSeed.unlockTracks],
        },
        identityAnchors: [...defaultAlicizationPersonality.identityAnchors],
        antiPersonaConstraints: [...(draft.value.antiPersonaConstraints ?? [])],
      },
      personaWorkshop: snapshotDraft(),
    }
  }

  return {
    draft,
    identity,
    hasValidIdentity,
    hasDraftContent,
    resetDraft,
    snapshotDraft,
    buildGenesisPayload,
  }
})
