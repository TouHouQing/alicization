import type { Card, ccv3 } from '@proj-alicization/ccc'

import { defaultAlicizationCardName, defaultAlicizationStageModelId } from '@proj-alicization/stage-shared'
import { useLocalStorageManualReset } from '@proj-alicization/stage-shared/composables'
import { nanoid } from 'nanoid'
import { defineStore, storeToRefs } from 'pinia'
import { computed, watch } from 'vue'

import { getAlicizationBridge, hasAlicizationBridge } from '../alicization-bridge'
import { useSettingsStageModel } from '../settings/stage-model'
import { useConsciousnessStore } from './consciousness'
import { useSpeechStore } from './speech'

export interface AiriDisplayModelBinding {
  modelId: string
}

export interface AiriExtension {
  modules: {
    consciousness: {
      provider: string // Example: "openai"
      model: string // Example: "gpt-4o"
    }

    speech: {
      provider: string // Example: "elevenlabs"
      model: string // Example: "eleven_multilingual_v2"
      voice_id: string // Example: "alloy"

      pitch?: number
      rate?: number
      ssml?: boolean
      language?: string
    }

    displayModel: AiriDisplayModelBinding
  }

  agents: {
    [key: string]: { // example: minecraft
      prompt: string
      enabled?: boolean
    }
  }
}

export interface AiriCard extends Card {
  extensions: {
    airi: AiriExtension
  } & Card['extensions']
}

export const useAiriCardStore = defineStore('airi-card', () => {
  const defaultCardId = 'default'
  const legacyDefaultCardName = 'ReLU'
  const cards = useLocalStorageManualReset<Map<string, AiriCard>>('airi-cards', new Map())
  const activeCardId = useLocalStorageManualReset<string>('airi-card-active-id', defaultCardId)

  const activeCard = computed(() => cards.value.get(activeCardId.value))

  const consciousnessStore = useConsciousnessStore()
  const speechStore = useSpeechStore()
  const stageModelStore = useSettingsStageModel()

  const {
    activeProvider: activeConsciousnessProvider,
    activeModel: activeConsciousnessModel,
  } = storeToRefs(consciousnessStore)

  const {
    activeSpeechProvider,
    activeSpeechVoiceId,
    activeSpeechModel,
  } = storeToRefs(speechStore)
  const { stageModelSelected } = storeToRefs(stageModelStore)

  function getCurrentStageModelId() {
    const currentModelId = stageModelSelected.value?.trim()
    return currentModelId || defaultAlicizationStageModelId
  }

  function normalizeDisplayModelId(raw: unknown, fallback = getCurrentStageModelId()) {
    if (typeof raw !== 'string')
      return fallback

    const trimmed = raw.trim()
    return trimmed || fallback
  }

  const addCard = (card: AiriCard | Card | ccv3.CharacterCardV3) => {
    const newCardId = nanoid()
    cards.value.set(newCardId, newAiriCard(card))
    return newCardId
  }

  const removeCard = async (id: string) => {
    if (!cards.value.has(id))
      return false

    if (hasAlicizationBridge()) {
      const bridge = getAlicizationBridge()
      if (bridge.deleteCardScope) {
        await bridge.deleteCardScope({ cardId: id })
      }
    }

    cards.value.delete(id)

    if (activeCardId.value === id) {
      if (cards.value.has(defaultCardId)) {
        activeCardId.value = defaultCardId
      }
      else {
        const next = cards.value.keys().next()
        activeCardId.value = next.done ? defaultCardId : next.value
      }
    }
    return true
  }

  const updateCard = (id: string, updates: AiriCard | Card | ccv3.CharacterCardV3) => {
    const existingCard = cards.value.get(id)
    if (!existingCard)
      return false

    const updatedCard = {
      ...existingCard,
      ...updates,
    }

    cards.value.set(id, newAiriCard(updatedCard))
    return true
  }

  const getCard = (id: string) => {
    return cards.value.get(id)
  }

  function syncCurrentConsciousnessToCard(cardId = activeCardId.value || defaultCardId) {
    initialize()

    const normalizedCardId = cardId.trim() || defaultCardId
    const existingCard = cards.value.get(normalizedCardId)
    if (!existingCard)
      return false

    const provider = activeConsciousnessProvider.value.trim()
    const model = activeConsciousnessModel.value.trim()
    if (!provider || !model)
      return false

    const extension = resolveAiriExtension(existingCard)
    cards.value.set(normalizedCardId, newAiriCard({
      ...existingCard,
      extensions: {
        ...existingCard.extensions,
        airi: {
          ...extension,
          modules: {
            ...extension.modules,
            consciousness: {
              provider,
              model,
            },
          },
        },
      },
    }))

    return true
  }

  function resolveAiriExtension(
    card: Card | ccv3.CharacterCardV3,
    options?: {
      displayModelFallbackId?: string
    },
  ): AiriExtension {
    // Get existing extension if available
    const existingExtension = ('data' in card
      ? card.data?.extensions?.airi
      : card.extensions?.airi) as AiriExtension

    const displayModelFallbackId = normalizeDisplayModelId(options?.displayModelFallbackId, getCurrentStageModelId())

    // Create default modules config
    const defaultModules = {
      consciousness: {
        provider: activeConsciousnessProvider.value,
        model: activeConsciousnessModel.value,
      },
      speech: {
        provider: activeSpeechProvider.value,
        model: activeSpeechModel.value,
        voice_id: activeSpeechVoiceId.value,
      },
      displayModel: {
        modelId: displayModelFallbackId,
      },
    }

    // Return default if no extension exists
    if (!existingExtension) {
      return {
        modules: defaultModules,
        agents: {},
      }
    }

    // Merge existing extension with defaults
    return {
      modules: {
        consciousness: {
          provider: existingExtension.modules?.consciousness?.provider ?? defaultModules.consciousness.provider,
          model: existingExtension.modules?.consciousness?.model ?? defaultModules.consciousness.model,
        },
        speech: {
          provider: existingExtension.modules?.speech?.provider ?? defaultModules.speech.provider,
          model: existingExtension.modules?.speech?.model ?? defaultModules.speech.model,
          voice_id: existingExtension.modules?.speech?.voice_id ?? defaultModules.speech.voice_id,
          pitch: existingExtension.modules?.speech?.pitch,
          rate: existingExtension.modules?.speech?.rate,
          ssml: existingExtension.modules?.speech?.ssml,
          language: existingExtension.modules?.speech?.language,
        },
        displayModel: {
          modelId: normalizeDisplayModelId(
            existingExtension.modules?.displayModel?.modelId,
            defaultModules.displayModel.modelId,
          ),
        },
      },
      agents: existingExtension.agents ?? {},
    }
  }

  function newAiriCard(
    card: Card | ccv3.CharacterCardV3,
    options?: {
      displayModelFallbackId?: string
    },
  ): AiriCard {
    // Handle ccv3 format if needed
    if ('data' in card) {
      const ccv3Card = card as ccv3.CharacterCardV3
      return {
        name: ccv3Card.data.name,
        version: ccv3Card.data.character_version ?? '1.0.0',
        description: ccv3Card.data.description ?? '',
        creator: ccv3Card.data.creator ?? '',
        notes: ccv3Card.data.creator_notes ?? '',
        notesMultilingual: ccv3Card.data.creator_notes_multilingual,
        personality: ccv3Card.data.personality ?? '',
        scenario: ccv3Card.data.scenario ?? '',
        greetings: [
          ccv3Card.data.first_mes,
          ...(ccv3Card.data.alternate_greetings ?? []),
        ],
        greetingsGroupOnly: ccv3Card.data.group_only_greetings ?? [],
        systemPrompt: ccv3Card.data.system_prompt ?? '',
        postHistoryInstructions: ccv3Card.data.post_history_instructions ?? '',
        messageExample: ccv3Card.data.mes_example
          ? ccv3Card.data.mes_example
              .split('<START>\n')
              .filter(Boolean)
              .map(example => example.split('\n')
                .map((line) => {
                  if (line.startsWith('{{char}}:') || line.startsWith('{{user}}:'))
                    return line as `{{char}}: ${string}` | `{{user}}: ${string}`
                  throw new Error(`Invalid message example format: ${line}`)
                }))
          : [],
        tags: ccv3Card.data.tags ?? [],
        extensions: {
          ...ccv3Card.data.extensions,
          airi: resolveAiriExtension(ccv3Card, options),
        },
      }
    }

    return {
      ...card,
      extensions: {
        ...card.extensions,
        airi: resolveAiriExtension(card, options),
      },
    }
  }

  function initialize() {
    if (!cards.value.has(defaultCardId)) {
      cards.value.set(defaultCardId, newAiriCard(
        {
          name: defaultAlicizationCardName,
          version: '1.0.0',
          description: '',
        },
        {
          displayModelFallbackId: defaultAlicizationStageModelId,
        },
      ))
    }

    for (const [cardId, existingCard] of cards.value.entries()) {
      const shouldRenameDefaultCard = cardId === defaultCardId && existingCard.name === legacyDefaultCardName
      const hasDisplayModelBinding = Boolean(existingCard.extensions?.airi?.modules?.displayModel?.modelId?.trim())

      if (!shouldRenameDefaultCard && hasDisplayModelBinding)
        continue

      cards.value.set(cardId, newAiriCard(
        {
          ...existingCard,
          name: shouldRenameDefaultCard ? defaultAlicizationCardName : existingCard.name,
        },
        {
          displayModelFallbackId: cardId === defaultCardId
            ? defaultAlicizationStageModelId
            : getCurrentStageModelId(),
        },
      ))
    }

    if (!activeCardId.value || !cards.value.has(activeCardId.value))
      activeCardId.value = defaultCardId
  }

  async function applyActiveCardBindings(newCard: AiriCard | undefined) {
    if (!newCard)
      return

    // TODO: Minecraft Agent, etc
    const extension = resolveAiriExtension(newCard)
    if (!extension)
      return

    const consciousnessProvider = extension.modules.consciousness.provider.trim()
    const consciousnessModel = extension.modules.consciousness.model.trim()
    const speechProvider = extension.modules.speech.provider.trim()
    const speechModel = extension.modules.speech.model.trim()
    const speechVoiceId = extension.modules.speech.voice_id.trim()
    const displayModelId = normalizeDisplayModelId(extension.modules.displayModel.modelId)

    // NOTICE: avoid clobbering persisted runtime selections with empty card fields.
    // Card metadata can be stale/missing for legacy cards, while runtime selections remain valid.
    if (consciousnessProvider)
      activeConsciousnessProvider.value = consciousnessProvider
    if (consciousnessModel)
      activeConsciousnessModel.value = consciousnessModel

    if (speechProvider)
      activeSpeechProvider.value = speechProvider
    if (speechModel)
      activeSpeechModel.value = speechModel
    if (speechVoiceId)
      activeSpeechVoiceId.value = speechVoiceId

    if (stageModelSelected.value !== displayModelId)
      stageModelSelected.value = displayModelId

    await stageModelStore.updateStageModel()
  }

  watch(activeCard, (newCard: AiriCard | undefined) => {
    void applyActiveCardBindings(newCard)
  }, { immediate: true })

  function resetState() {
    activeCardId.reset()
    cards.reset()
  }

  return {
    cards,
    activeCard,
    activeCardId,
    addCard,
    removeCard,
    updateCard,
    getCard,
    syncCurrentConsciousnessToCard,
    resetState,
    initialize,

    currentModels: computed(() => {
      return {
        consciousness: {
          provider: activeConsciousnessProvider.value,
          model: activeConsciousnessModel.value,
        },
        speech: {
          provider: activeSpeechProvider.value,
          model: activeSpeechModel.value,
          voice_id: activeSpeechVoiceId.value,
        },
        displayModel: {
          modelId: getCurrentStageModelId(),
        },
      } satisfies AiriExtension['modules']
    }),

    systemPrompt: computed(() => {
      const card = activeCard.value
      if (!card)
        return ''

      // NOTICE: Alicization personality is sourced from SOUL/alicization.db only.
      // Keep card-level prompt aggregation minimal to avoid dual-source persona conflicts.
      return card.systemPrompt?.trim() || ''
    }),
  }
})
