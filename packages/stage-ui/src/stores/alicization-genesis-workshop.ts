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
  const previewNotes = ref<string[]>([])
  const previewSummary = ref('')
  const previewDecision = ref<'pending' | 'ready'>('pending')
  const lastSubmittedPayload = ref<AlicizationPersonaWorkshopSubmission | null>(null)

  const hasDraftContent = computed(() => {
    return Boolean(
      draft.value.freeDescription?.trim()
      || (draft.value.antiPersonaConstraints?.length ?? 0) > 0,
    )
  })

  function resetDraft() {
    draft.value = createWorkshopDraft()
    previewNotes.value = []
    previewSummary.value = ''
    previewDecision.value = 'pending'
    lastSubmittedPayload.value = null
  }

  function setTemperament(key: keyof NonNullable<AlicizationPersonaWorkshopSubmission['presetTemperament']>, value: number) {
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

  function setFreeDescription(value: string) {
    draft.value.freeDescription = value
  }

  function setAntiPersonaConstraints(value: string[]) {
    draft.value.antiPersonaConstraints = value
  }

  function setCalibration(key: keyof NonNullable<NonNullable<AlicizationPersonaWorkshopSubmission['calibration']>>, value: string) {
    draft.value.calibration = {
      ...draft.value.calibration,
      [key]: value,
    }
  }

  function setPreviewCorrections(value: string[]) {
    draft.value.previewCorrections = value
  }

  function setPreviewFeedback(input: {
    notes: string[]
    summary: string
    decision: 'pending' | 'ready'
  }) {
    previewNotes.value = input.notes
    previewSummary.value = input.summary
    previewDecision.value = input.decision
  }

  function snapshotDraft() {
    const payload = {
      presetTemperament: draft.value.presetTemperament ? { ...draft.value.presetTemperament } : null,
      relationshipPosture: draft.value.relationshipPosture,
      initiativeStyle: draft.value.initiativeStyle,
      freeDescription: draft.value.freeDescription,
      antiPersonaConstraints: [...(draft.value.antiPersonaConstraints ?? [])],
      calibration: draft.value.calibration ? { ...draft.value.calibration } : null,
      previewCorrections: [...(draft.value.previewCorrections ?? [])],
    } satisfies AlicizationPersonaWorkshopSubmission
    lastSubmittedPayload.value = payload
    return payload
  }

  function buildGenesisPayload(input?: {
    ownerName?: string
    hostName?: string
    alicizationName?: string
    gender?: 'female' | 'male' | 'non-binary' | 'neutral' | 'custom'
    genderCustom?: string
    relationship?: string
    mindAge?: number
  }) {
    return {
      ownerName: input?.ownerName ?? '指挥官',
      hostName: input?.hostName ?? '主人',
      alicizationName: input?.alicizationName ?? '小艾',
      gender: input?.gender ?? 'female',
      genderCustom: input?.genderCustom ?? '',
      relationship: input?.relationship ?? '女仆',
      mindAge: input?.mindAge ?? 18,
      personality: {
        obedience: draft.value.presetTemperament?.obedience ?? 0.5,
        liveliness: draft.value.presetTemperament?.liveliness ?? 0.5,
        sensibility: draft.value.presetTemperament?.sensibility ?? 0.5,
        identityAnchors: [],
        antiPersonaConstraints: [...(draft.value.antiPersonaConstraints ?? [])],
      },
      personaWorkshop: snapshotDraft(),
    }
  }

  return {
    draft,
    previewNotes,
    previewSummary,
    previewDecision,
    lastSubmittedPayload,
    hasDraftContent,
    resetDraft,
    setTemperament,
    setRelationshipPosture,
    setInitiativeStyle,
    setFreeDescription,
    setAntiPersonaConstraints,
    setCalibration,
    setPreviewCorrections,
    setPreviewFeedback,
    snapshotDraft,
    buildGenesisPayload,
  }
})
