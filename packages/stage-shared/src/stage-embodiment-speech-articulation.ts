import type { AlicizationDigitalLifeFrame } from './alicization-digital-life'

export interface StageEmbodimentSpeechArticulationVoiceProfile {
  provider: string | null
  model: string | null
  voiceId: string | null
  voiceName: string | null
  language: string | null
  gender: string | null
  rateMultiplier: number
  pitchDelta: number
  closureBias: number
  roundBias: number
  spreadBias: number
  jawBias: number
  consonantPrecision: number
  vowelLegato: number
}

export interface StageEmbodimentSpeechVisemeWeights {
  A: number
  E: number
  I: number
  O: number
  U: number
  closed: number
}

export interface StageEmbodimentSpeechArticulationState {
  active: boolean
  progress: number
  openness: number
  jawOpen: number
  lipClosure: number
  lipSpread: number
  lipRound: number
  visemes: StageEmbodimentSpeechVisemeWeights
  voice: StageEmbodimentSpeechArticulationVoiceProfile | null
}

interface StageEmbodimentSpeechArticulationPreset {
  openness: number
  jaw: number
  closure: number
  spread: number
  round: number
  sustain: number
  visemes: StageEmbodimentSpeechVisemeWeights
}

interface StageEmbodimentSpeechArticulationUnit {
  token: string
  preset: StageEmbodimentSpeechArticulationPreset
}

export interface DeriveStageEmbodimentSpeechArticulationStateInput {
  active: boolean
  text: string
  special?: string | null
  metadata?: Record<string, unknown> | null
  playbackDurationMs?: number | null
  startedAt?: number | null
  now?: number | null
  mouthOpenRatio?: number | null
  dynamics?: {
    speechEnergy?: number | null
    prosodyIntensity?: number | null
    emphasisLevel?: number | null
    cadencePulse?: number | null
  } | null
  digitalLifeFrame?: AlicizationDigitalLifeFrame | null
}

const latinDigraphs = [
  'sch',
  'shr',
  'thr',
  'tch',
  'ch',
  'ck',
  'gh',
  'ng',
  'ph',
  'qu',
  'sh',
  'th',
  'ts',
  'wh',
  'zh',
] as const

const hiraganaA = 'あかがさざただなはばぱまやゃらわぁ'
const hiraganaI = 'いきぎしじちぢにひびぴみりぃ'
const hiraganaU = 'うくぐすずつづぬふぶぷむゆゅるゔぅ'
const hiraganaE = 'えけげせぜてでねへべぺめれぇ'
const hiraganaO = 'おこごそぞとのほぼぽもよょろをぉ'
const katakanaA = 'アカガサザタダナハバパマヤャラワァ'
const katakanaI = 'イキギシジチヂニヒビピミリィ'
const katakanaU = 'ウクグスズツヅヌフブプムユュルヴゥ'
const katakanaE = 'エケゲセゼテデネヘベペメレェ'
const katakanaO = 'オコゴソゾトノホボポモヨョロヲォ'
const hanExplicitA = '啊阿呀哇蛙哈啦喇'
const hanExplicitE = '诶欸耶噎'
const hanExplicitI = '一衣伊依医咿疑宜以已椅姨夷移'
const hanExplicitO = '哦喔噢窝我握沃卧欧偶藕'
const hanExplicitU = '呜乌屋无吾吴五务物污雾'
const punctuationPattern = /[，,。.!！？?;；:：、…~～]/

function clampUnit(value: number | null | undefined, fallback = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(1, Math.max(0, Number(value)))
}

function clampRange(value: number | null | undefined, min: number, max: number, fallback = min) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(max, Math.max(min, Number(value)))
}

function roundHundredths(value: number, fallback = 0) {
  return Number(clampUnit(value, fallback).toFixed(2))
}

function roundClamped(value: number | null | undefined, min: number, max: number, fallback: number) {
  return Number(clampRange(value, min, max, fallback).toFixed(2))
}

function normalizeString(value: unknown, maxLength = 128) {
  if (typeof value !== 'string')
    return null

  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, maxLength) : null
}

function normalizeRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function normalizeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : null
}

function normalizeLanguageCode(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = value.trim()
    return normalized ? normalized.slice(0, 32) : null
  }

  if (Array.isArray(value)) {
    const entry = value.find(item => typeof item === 'string' && item.trim())
    return entry ? normalizeLanguageCode(entry) : null
  }

  const record = normalizeRecord(value)
  return normalizeString(record?.code ?? record?.id ?? record?.language ?? null, 32)
}

function isChineseLanguageCode(value: string | null | undefined) {
  if (!value)
    return false

  const normalized = value.trim().toLowerCase()
  return normalized === 'zh' || normalized.startsWith('zh-')
}

function containsAny(source: string, candidates: readonly string[]) {
  return candidates.some(candidate => source.includes(candidate))
}

function hashString(input: string) {
  let hash = 2166136261
  for (const char of input) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function normalizeVisemes(input?: Partial<StageEmbodimentSpeechVisemeWeights>): StageEmbodimentSpeechVisemeWeights {
  return {
    A: roundHundredths(input?.A ?? 0),
    E: roundHundredths(input?.E ?? 0),
    I: roundHundredths(input?.I ?? 0),
    O: roundHundredths(input?.O ?? 0),
    U: roundHundredths(input?.U ?? 0),
    closed: roundHundredths(input?.closed ?? 0),
  }
}

function createPreset(input: {
  openness: number
  jaw?: number
  closure?: number
  spread?: number
  round?: number
  sustain?: number
  visemes?: Partial<StageEmbodimentSpeechVisemeWeights>
}): StageEmbodimentSpeechArticulationPreset {
  return {
    openness: roundHundredths(input.openness),
    jaw: roundHundredths(input.jaw ?? input.openness),
    closure: roundHundredths(input.closure ?? 0),
    spread: roundHundredths(input.spread ?? 0),
    round: roundHundredths(input.round ?? 0),
    sustain: Number(clampRange(input.sustain ?? 1, 0.35, 2.6, 1).toFixed(2)),
    visemes: normalizeVisemes(input.visemes),
  }
}

function blendPreset(target: StageEmbodimentSpeechArticulationPreset, source: StageEmbodimentSpeechArticulationPreset, weight: number) {
  target.openness += source.openness * weight
  target.jaw += source.jaw * weight
  target.closure += source.closure * weight
  target.spread += source.spread * weight
  target.round += source.round * weight
  target.sustain += source.sustain * weight
  target.visemes.A += source.visemes.A * weight
  target.visemes.E += source.visemes.E * weight
  target.visemes.I += source.visemes.I * weight
  target.visemes.O += source.visemes.O * weight
  target.visemes.U += source.visemes.U * weight
  target.visemes.closed += source.visemes.closed * weight
}

function blendPresets(units: StageEmbodimentSpeechArticulationUnit[], progress: number): StageEmbodimentSpeechArticulationPreset {
  if (units.length === 0)
    return createPreset({ openness: 0 })

  const totalSustain = units.reduce((sum, unit) => sum + unit.preset.sustain, 0)
  let cursor = 0
  let totalWeight = 0
  const blended = createPreset({
    openness: 0,
    jaw: 0,
    closure: 0,
    spread: 0,
    round: 0,
    sustain: 0.35,
    visemes: {},
  })

  for (const unit of units) {
    const normalizedSpan = unit.preset.sustain / totalSustain
    const start = cursor
    const end = cursor + normalizedSpan
    const center = (start + end) / 2
    const window = Math.max(0.18, normalizedSpan * 1.45)
    const influence = Math.max(0, 1 - Math.abs(progress - center) / window)
    if (influence > 0) {
      const weight = influence * influence
      blendPreset(blended, unit.preset, weight)
      totalWeight += weight
    }
    cursor = end
  }

  if (totalWeight <= 0)
    return units[Math.min(units.length - 1, Math.floor(progress * units.length))]!.preset

  return createPreset({
    openness: blended.openness / totalWeight,
    jaw: blended.jaw / totalWeight,
    closure: blended.closure / totalWeight,
    spread: blended.spread / totalWeight,
    round: blended.round / totalWeight,
    sustain: blended.sustain / totalWeight,
    visemes: {
      A: blended.visemes.A / totalWeight,
      E: blended.visemes.E / totalWeight,
      I: blended.visemes.I / totalWeight,
      O: blended.visemes.O / totalWeight,
      U: blended.visemes.U / totalWeight,
      closed: blended.visemes.closed / totalWeight,
    },
  })
}

function isLatinLetter(char: string) {
  return /^[A-Za-z]$/.test(char)
}

function isWhitespace(char: string) {
  return /^\s$/.test(char)
}

function isPunctuation(char: string) {
  return punctuationPattern.test(char)
}

function createPausePreset(char: string) {
  if (char === '…' || char === '~' || char === '～') {
    return createPreset({
      openness: 0.08,
      jaw: 0.1,
      closure: 0.2,
      spread: 0.06,
      round: 0.04,
      sustain: 1.35,
      visemes: { closed: 0.28, A: 0.08, O: 0.06 },
    })
  }

  return createPreset({
    openness: 0.04,
    jaw: 0.06,
    closure: 0.24,
    sustain: 0.9,
    visemes: { closed: 0.42 },
  })
}

function createWhitespacePreset() {
  return createPreset({
    openness: 0.02,
    jaw: 0.03,
    closure: 0.16,
    sustain: 0.45,
    visemes: { closed: 0.18 },
  })
}

function createBilabialPreset() {
  return createPreset({
    openness: 0.06,
    jaw: 0.08,
    closure: 1,
    round: 0.12,
    sustain: 0.78,
    visemes: { closed: 1, U: 0.08, O: 0.06 },
  })
}

function createLabiodentalPreset() {
  return createPreset({
    openness: 0.16,
    jaw: 0.18,
    closure: 0.34,
    spread: 0.18,
    sustain: 0.72,
    visemes: { E: 0.26, I: 0.18, closed: 0.32 },
  })
}

function createSibilantPreset() {
  return createPreset({
    openness: 0.22,
    jaw: 0.24,
    closure: 0.18,
    spread: 0.46,
    sustain: 0.74,
    visemes: { E: 0.26, I: 0.42, closed: 0.14 },
  })
}

function createDentalPreset() {
  return createPreset({
    openness: 0.18,
    jaw: 0.22,
    closure: 0.28,
    spread: 0.18,
    sustain: 0.68,
    visemes: { E: 0.18, A: 0.12, closed: 0.24 },
  })
}

function createLiquidPreset(token: string) {
  if (token === 'w' || token === 'wh' || token === 'qu') {
    return createPreset({
      openness: 0.2,
      jaw: 0.24,
      round: 0.48,
      sustain: 0.76,
      visemes: { U: 0.46, O: 0.22 },
    })
  }

  if (token === 'y') {
    return createPreset({
      openness: 0.18,
      jaw: 0.22,
      spread: 0.32,
      sustain: 0.66,
      visemes: { I: 0.44, E: 0.16 },
    })
  }

  return createPreset({
    openness: 0.2,
    jaw: 0.24,
    spread: 0.16,
    sustain: 0.7,
    visemes: { E: 0.14, A: 0.14 },
  })
}

function createVowelPreset(token: string) {
  if (/^(o|oh|ow)$/.test(token)) {
    return createPreset({
      openness: 0.5,
      jaw: 0.44,
      round: 0.72,
      sustain: 1.18,
      visemes: { O: 0.84, U: 0.18, A: 0.16 },
    })
  }

  if (/^(u|oo|ou|wu)$/.test(token)) {
    return createPreset({
      openness: 0.38,
      jaw: 0.34,
      round: 0.82,
      sustain: 1.14,
      visemes: { U: 0.88, O: 0.16 },
    })
  }

  if (/^(i|ee|ih|iy|y)$/.test(token)) {
    return createPreset({
      openness: 0.32,
      jaw: 0.28,
      spread: 0.76,
      sustain: 1.04,
      visemes: { I: 0.9, E: 0.24 },
    })
  }

  if (/^(e|eh|ei|ay)$/.test(token)) {
    return createPreset({
      openness: 0.34,
      jaw: 0.3,
      spread: 0.64,
      sustain: 1.02,
      visemes: { E: 0.84, I: 0.24, A: 0.12 },
    })
  }

  return createPreset({
    openness: 0.62,
    jaw: 0.58,
    spread: 0.18,
    sustain: 1.1,
    visemes: { A: 0.88, E: 0.14, O: 0.1 },
  })
}

function createExplicitScriptPreset(group: 'A' | 'E' | 'I' | 'O' | 'U') {
  switch (group) {
    case 'E':
      return createVowelPreset('e')
    case 'I':
      return createVowelPreset('i')
    case 'O':
      return createVowelPreset('o')
    case 'U':
      return createVowelPreset('u')
    case 'A':
    default:
      return createVowelPreset('a')
  }
}

function createFallbackPreset(token: string) {
  const bucket = hashString(token) % 5
  if (bucket === 0)
    return createExplicitScriptPreset('A')
  if (bucket === 1)
    return createExplicitScriptPreset('E')
  if (bucket === 2)
    return createExplicitScriptPreset('I')
  if (bucket === 3)
    return createExplicitScriptPreset('O')
  return createExplicitScriptPreset('U')
}

function resolveHangulPreset(char: string) {
  const codePoint = char.codePointAt(0)
  if (!codePoint || codePoint < 0xAC00 || codePoint > 0xD7A3)
    return null

  const syllable = codePoint - 0xAC00
  const jung = Math.floor((syllable % 588) / 28)
  if ([0, 2, 9].includes(jung))
    return createExplicitScriptPreset('A')
  if ([5, 6, 7, 11, 12].includes(jung))
    return createExplicitScriptPreset('E')
  if ([20].includes(jung))
    return createExplicitScriptPreset('I')
  if ([8, 10, 11, 13, 14].includes(jung))
    return createExplicitScriptPreset('O')
  if ([13, 17, 18, 19].includes(jung))
    return createExplicitScriptPreset('U')
  return createFallbackPreset(char)
}

function resolveCharPreset(char: string) {
  if (!char)
    return createPausePreset('.')
  if (isWhitespace(char))
    return createWhitespacePreset()
  if (isPunctuation(char))
    return createPausePreset(char)
  if (hiraganaA.includes(char) || katakanaA.includes(char) || hanExplicitA.includes(char))
    return createExplicitScriptPreset('A')
  if (hiraganaE.includes(char) || katakanaE.includes(char) || hanExplicitE.includes(char))
    return createExplicitScriptPreset('E')
  if (hiraganaI.includes(char) || katakanaI.includes(char) || hanExplicitI.includes(char))
    return createExplicitScriptPreset('I')
  if (hiraganaO.includes(char) || katakanaO.includes(char) || hanExplicitO.includes(char))
    return createExplicitScriptPreset('O')
  if (hiraganaU.includes(char) || katakanaU.includes(char) || hanExplicitU.includes(char))
    return createExplicitScriptPreset('U')

  return resolveHangulPreset(char) ?? createFallbackPreset(char)
}

function resolveLatinClusterPreset(token: string) {
  if (/^(m|b|p)$/.test(token))
    return createBilabialPreset()
  if (/^(f|v|ph)$/.test(token))
    return createLabiodentalPreset()
  if (/^(s|z|c|x|sh|zh|ch|j|q|ts|tch)$/.test(token))
    return createSibilantPreset()
  if (/^(t|d|n|l|r|th|ck|g|k)$/.test(token))
    return createDentalPreset()
  if (/^(w|wh|y|qu)$/.test(token))
    return createLiquidPreset(token)
  if (/^(a|e|i|o|u|y|oo|ou|ow|ee|eh|ih|iy|oh|wu|ei|ay)$/.test(token))
    return createVowelPreset(token)
  return createFallbackPreset(token)
}

function tokenizeLatinWord(word: string) {
  const tokens: string[] = []
  let index = 0
  const normalized = word.toLowerCase()

  while (index < normalized.length) {
    const remaining = normalized.slice(index)
    const digraph = latinDigraphs.find(candidate => remaining.startsWith(candidate))
    if (digraph) {
      tokens.push(digraph)
      index += digraph.length
      continue
    }

    tokens.push(normalized[index]!)
    index += 1
  }

  return tokens
}

function createArticulationUnits(text: string) {
  const units: StageEmbodimentSpeechArticulationUnit[] = []
  let latinBuffer = ''

  const flushLatinBuffer = () => {
    if (!latinBuffer)
      return

    for (const token of tokenizeLatinWord(latinBuffer)) {
      units.push({
        token,
        preset: resolveLatinClusterPreset(token),
      })
    }
    latinBuffer = ''
  }

  for (const char of Array.from(text.trim())) {
    if (isLatinLetter(char)) {
      latinBuffer += char
      continue
    }

    flushLatinBuffer()
    units.push({
      token: char,
      preset: resolveCharPreset(char),
    })
  }

  flushLatinBuffer()
  return units
}

export function createIdleStageEmbodimentSpeechArticulationState(): StageEmbodimentSpeechArticulationState {
  return {
    active: false,
    progress: 0,
    openness: 0,
    jawOpen: 0,
    lipClosure: 0,
    lipSpread: 0,
    lipRound: 0,
    visemes: normalizeVisemes(),
    voice: null,
  }
}

export function cloneStageEmbodimentSpeechArticulationState(
  state: StageEmbodimentSpeechArticulationState | null | undefined,
): StageEmbodimentSpeechArticulationState {
  if (!state)
    return createIdleStageEmbodimentSpeechArticulationState()

  return {
    active: state.active === true,
    progress: roundHundredths(state.progress),
    openness: roundHundredths(state.openness),
    jawOpen: roundHundredths(state.jawOpen),
    lipClosure: roundHundredths(state.lipClosure),
    lipSpread: roundHundredths(state.lipSpread),
    lipRound: roundHundredths(state.lipRound),
    visemes: normalizeVisemes(state.visemes),
    voice: state.voice
      ? {
          ...state.voice,
          rateMultiplier: Number(clampRange(state.voice.rateMultiplier, 0.5, 2, 1).toFixed(2)),
          pitchDelta: roundClamped(state.voice.pitchDelta, -24, 24, 0),
          closureBias: roundHundredths(state.voice.closureBias),
          roundBias: roundHundredths(state.voice.roundBias),
          spreadBias: roundHundredths(state.voice.spreadBias),
          jawBias: roundHundredths(state.voice.jawBias),
          consonantPrecision: roundHundredths(state.voice.consonantPrecision),
          vowelLegato: roundHundredths(state.voice.vowelLegato),
        }
      : null,
  }
}

export function normalizeStageEmbodimentSpeechPlaybackDurationMs(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return null

  return Math.round(clampRange(value, 120, 12_000, 120))
}

export function normalizeStageEmbodimentSpeechArticulationVoiceProfile(
  rawMetadata?: Record<string, unknown> | null,
  digitalLifeFrame?: AlicizationDigitalLifeFrame | null,
): StageEmbodimentSpeechArticulationVoiceProfile | null {
  const metadata = normalizeRecord(rawMetadata)
  const metadataVoice = normalizeRecord(metadata?.voice)
  const synthesis = normalizeRecord(
    metadata?.speechSynthesis
    ?? metadata?.speech
    ?? metadata?.tts,
  )
  const voice = normalizeRecord(synthesis?.voice) ?? metadataVoice
  const digitalLifeVoice = digitalLifeFrame?.voice ?? null
  const digitalLifeFacial = digitalLifeFrame?.motor.facial ?? null
  const provider = normalizeString(synthesis?.provider ?? metadataVoice?.provider)
  const model = normalizeString(synthesis?.model ?? metadataVoice?.model)
  const voiceId = normalizeString(
    voice?.id
    ?? metadataVoice?.voiceId
    ?? synthesis?.voiceId
    ?? synthesis?.voice_id,
  )
  const voiceName = normalizeString(
    voice?.name
    ?? metadataVoice?.voiceName
    ?? synthesis?.voiceName
    ?? synthesis?.voice_name,
  )
  const gender = normalizeString(voice?.gender ?? metadataVoice?.gender ?? synthesis?.gender, 32)
  const language = normalizeLanguageCode(
    synthesis?.language
    ?? voice?.language
    ?? voice?.languages
    ?? metadataVoice?.language
    ?? metadataVoice?.languages,
  )

  if (!provider && !model && !voiceId && !voiceName && !digitalLifeVoice && !digitalLifeFacial)
    return null

  const rateMultiplier = Number(clampRange(
    normalizeNumber(metadataVoice?.rateMultiplier)
    ?? normalizeNumber(voice?.rateMultiplier)
    ?? normalizeNumber(synthesis?.rateMultiplier)
    ?? normalizeNumber(synthesis?.rate)
    ?? normalizeNumber(voice?.rate)
    ?? normalizeNumber(metadataVoice?.rate)
    ?? digitalLifeVoice?.rateMultiplier,
    0.5,
    2,
    1,
  ).toFixed(2))
  const pitchDelta = Number(clampRange(
    normalizeNumber(metadataVoice?.pitchDelta)
    ?? normalizeNumber(voice?.pitchDelta)
    ?? normalizeNumber(synthesis?.pitchDelta)
    ?? normalizeNumber(synthesis?.pitch)
    ?? normalizeNumber(voice?.pitch)
    ?? normalizeNumber(metadataVoice?.pitch)
    ?? digitalLifeVoice?.pitchDelta,
    -24,
    24,
    0,
  ).toFixed(2))

  const signature = [
    provider,
    model,
    voiceId,
    voiceName,
    gender,
    language,
  ].filter(Boolean).join(' ').toLowerCase()
  const brightHint = containsAny(signature, [
    'alloy',
    'aria',
    'ash',
    'bright',
    'coral',
    'female',
    'girl',
    'nova',
    'shimmer',
    'verse',
    'woman',
  ])
  const deepHint = containsAny(signature, [
    'baritone',
    'bass',
    'bill',
    'cedar',
    'deep',
    'leda',
    'low',
    'male',
    'man',
    'marin',
    'onyx',
    'sage',
    'warm',
  ])
  const legatoHint = containsAny(signature, [
    'ballad',
    'echo',
    'fable',
    'gentle',
    'hd',
    'narration',
    'pro',
    'soft',
    'studio',
    'warm',
  ])
  const precisionHint = containsAny(signature, [
    'alloy',
    'ash',
    'cedar',
    'fast',
    'flash',
    'mini',
    'quick',
    'turbo',
  ])

  const fastRateBias = clampUnit((rateMultiplier - 1) / 0.55)
  const slowRateBias = clampUnit((1 - rateMultiplier) / 0.42)
  const highPitchBias = clampUnit((pitchDelta + 4) / 14)
  const lowPitchBias = clampUnit((-pitchDelta + 4) / 14)

  const mouthRound = clampUnit(digitalLifeFacial?.mouthRound ?? 0.24, 0.24)
  const mouthSpread = clampUnit(digitalLifeFacial?.mouthSpread ?? 0.18, 0.18)
  const jawOpenBias = clampUnit(digitalLifeFacial?.jawOpenBias ?? 0.26, 0.26)

  return {
    provider,
    model,
    voiceId,
    voiceName,
    language,
    gender,
    rateMultiplier,
    pitchDelta,
    closureBias: roundHundredths(
      normalizeNumber(metadataVoice?.closureBias)
      ?? normalizeNumber(voice?.closureBias)
      ?? (
        0.34
        + fastRateBias * 0.2
        + (precisionHint ? 0.14 : 0)
        + jawOpenBias * 0.06
      ),
      0.46,
    ),
    roundBias: roundHundredths(
      normalizeNumber(metadataVoice?.roundBias)
      ?? normalizeNumber(voice?.roundBias)
      ?? (
        0.22
        + mouthRound * 0.46
        + lowPitchBias * 0.16
        + (deepHint ? 0.16 : 0)
      ),
      0.34,
    ),
    spreadBias: roundHundredths(
      normalizeNumber(metadataVoice?.spreadBias)
      ?? normalizeNumber(voice?.spreadBias)
      ?? (
        0.2
        + mouthSpread * 0.5
        + highPitchBias * 0.14
        + (brightHint ? 0.18 : 0)
      ),
      0.36,
    ),
    jawBias: roundHundredths(
      normalizeNumber(metadataVoice?.jawBias)
      ?? normalizeNumber(voice?.jawBias)
      ?? (
        0.28
        + jawOpenBias * 0.46
        + lowPitchBias * 0.16
        + (deepHint ? 0.14 : 0)
      ),
      0.38,
    ),
    consonantPrecision: roundHundredths(
      normalizeNumber(metadataVoice?.consonantPrecision)
      ?? normalizeNumber(voice?.consonantPrecision)
      ?? (
        0.3
        + fastRateBias * 0.18
        + (precisionHint ? 0.18 : 0)
        + (brightHint ? 0.08 : 0)
      ),
      0.44,
    ),
    vowelLegato: roundHundredths(
      normalizeNumber(metadataVoice?.vowelLegato)
      ?? normalizeNumber(voice?.vowelLegato)
      ?? (
        0.34
        + slowRateBias * 0.22
        + mouthRound * 0.1
        + (legatoHint ? 0.18 : 0)
      ),
      0.46,
    ),
  }
}

function deriveChineseVoiceConditionedVisemeBias(input: {
  closureBias: number
  consonantPrecision: number
  jawBias: number
  roundBias: number
  spreadBias: number
  vowelLegato: number
  voice: StageEmbodimentSpeechArticulationVoiceProfile | null
}) {
  if (!isChineseLanguageCode(input.voice?.language))
    return null

  const consonantEdge = clampUnit(input.consonantPrecision - input.vowelLegato + 0.5)
  const vowelFlow = clampUnit(input.vowelLegato - input.consonantPrecision + 0.5)

  return {
    closureLift: consonantEdge * (0.1 + input.closureBias * 0.12),
    closedVisemeLift: consonantEdge * (0.12 + input.closureBias * 0.1),
    spreadLift: clampUnit(input.spreadBias * 0.06 + vowelFlow * 0.08 - consonantEdge * 0.06),
    roundLift: clampUnit(input.roundBias * 0.04 + vowelFlow * 0.05 - consonantEdge * 0.03),
    jawLift: clampUnit(input.jawBias * 0.04 + vowelFlow * 0.06 - consonantEdge * 0.04),
    opennessScale: 1 - consonantEdge * 0.16 + vowelFlow * 0.08,
    vowelSuppressionScale: 1 - consonantEdge * 0.14,
  }
}

export function estimateStageEmbodimentSpeechPlaybackDurationMs(input: {
  text: string
  special?: string | null
  metadata?: Record<string, unknown> | null
  digitalLifeFrame?: AlicizationDigitalLifeFrame | null
}) {
  const normalizedText = input.text.trim()
  if (!normalizedText) {
    return input.special ? 220 : 160
  }

  const voiceProfile = normalizeStageEmbodimentSpeechArticulationVoiceProfile(input.metadata, input.digitalLifeFrame)
  const rateMultiplier = voiceProfile?.rateMultiplier ?? input.digitalLifeFrame?.voice.rateMultiplier ?? 1
  const punctuationCount = normalizedText.match(/[，,。.!！？?;；:：、]/g)?.length ?? 0
  const ellipsisCount = normalizedText.match(/…|\.{3,}/g)?.length ?? 0
  const latinClusters = normalizedText.match(/[A-Za-z]+/g)?.length ?? 0
  const symbolCount = normalizedText.match(/[()[\]'"`]/g)?.length ?? 0
  const characterCount = Array.from(normalizedText).length
  const baseline = characterCount * 72 + punctuationCount * 52 + ellipsisCount * 90 + latinClusters * 18 + symbolCount * 12 + 160

  return Math.round(clampRange(
    baseline / clampRange(rateMultiplier, 0.5, 2, 1),
    160,
    5_400,
    220,
  ))
}

export function deriveStageEmbodimentSpeechArticulationState(
  input: DeriveStageEmbodimentSpeechArticulationStateInput,
): StageEmbodimentSpeechArticulationState {
  const text = input.text.trim()
  if (!input.active || !text) {
    return createIdleStageEmbodimentSpeechArticulationState()
  }

  const voice = normalizeStageEmbodimentSpeechArticulationVoiceProfile(input.metadata, input.digitalLifeFrame)
  const durationMs = normalizeStageEmbodimentSpeechPlaybackDurationMs(input.playbackDurationMs)
    ?? estimateStageEmbodimentSpeechPlaybackDurationMs({
      text,
      special: input.special,
      metadata: input.metadata,
      digitalLifeFrame: input.digitalLifeFrame,
    })
  const startedAt = Number.isFinite(input.startedAt) ? Number(input.startedAt) : Number(input.now ?? 0)
  const now = Number.isFinite(input.now) ? Number(input.now) : startedAt
  const progress = durationMs <= 0
    ? 0
    : clampUnit((now - startedAt) / durationMs)
  const units = createArticulationUnits(text)
  const preset = blendPresets(units, progress)
  const mouthOpenRatio = clampUnit(input.mouthOpenRatio ?? 0)
  const speechEnergy = clampUnit(input.dynamics?.speechEnergy ?? 0)
  const prosodyIntensity = clampUnit(input.dynamics?.prosodyIntensity ?? 0)
  const emphasisLevel = clampUnit(input.dynamics?.emphasisLevel ?? 0)
  const cadencePulse = clampUnit(input.dynamics?.cadencePulse ?? 0)
  const digitalLifeLipSync = input.digitalLifeFrame?.lipSync ?? null
  const digitalLifeFacial = input.digitalLifeFrame?.motor.facial ?? null
  const mouthScale = clampRange(digitalLifeLipSync?.mouthScale ?? 1, 0.4, 1.35, 1)
  const jawBias = clampUnit(
    (voice?.jawBias ?? 0.38) * 0.58
    + clampUnit(digitalLifeFacial?.jawOpenBias ?? 0.26, 0.26) * 0.42,
  )
  const roundBias = clampUnit(
    (voice?.roundBias ?? 0.34) * 0.56
    + clampUnit(digitalLifeFacial?.mouthRound ?? 0.24, 0.24) * 0.44,
  )
  const spreadBias = clampUnit(
    (voice?.spreadBias ?? 0.36) * 0.56
    + clampUnit(digitalLifeFacial?.mouthSpread ?? 0.18, 0.18) * 0.44,
  )
  const closureBias = clampUnit(voice?.closureBias ?? 0.46, 0.46)
  const consonantPrecision = clampUnit(voice?.consonantPrecision ?? 0.44, 0.44)
  const vowelLegato = clampUnit(voice?.vowelLegato ?? 0.46, 0.46)
  const chineseVoiceBias = deriveChineseVoiceConditionedVisemeBias({
    voice,
    closureBias,
    consonantPrecision,
    vowelLegato,
    roundBias,
    spreadBias,
    jawBias,
  })
  const amplitude = clampUnit(Math.max(
    mouthOpenRatio,
    speechEnergy * 0.94,
    prosodyIntensity * 0.54,
    emphasisLevel * 0.3,
  ))
  const opennessEnvelope = clampUnit(
    preset.openness
    * (0.52 + amplitude * 0.48 + vowelLegato * 0.12)
    * (chineseVoiceBias?.opennessScale ?? 1),
  )
  const lipClosure = clampUnit(
    Math.max(
      preset.closure,
      chineseVoiceBias?.closureLift ?? 0,
    )
    * (0.72 + closureBias * 0.3 + consonantPrecision * 0.22)
    * (0.48 + amplitude * 0.52),
  )
  const lipRound = clampUnit(
    preset.round * (0.54 + roundBias * 0.36 + vowelLegato * 0.1)
    + roundBias * 0.08
    + (chineseVoiceBias?.roundLift ?? 0),
  )
  const lipSpread = clampUnit(
    preset.spread * (0.54 + spreadBias * 0.34 + consonantPrecision * 0.12)
    + spreadBias * 0.06
    + (chineseVoiceBias?.spreadLift ?? 0),
  )
  const jawOpen = clampUnit(
    (preset.jaw * (0.42 + amplitude * 0.44) + cadencePulse * 0.08)
    * mouthScale
    * (0.72 + clampUnit(jawBias + (chineseVoiceBias?.jawLift ?? 0)) * 0.34)
    * (1 - lipClosure * 0.48),
  )
  const closedViseme = clampUnit(Math.max(
    preset.visemes.closed * (0.62 + closureBias * 0.28),
    lipClosure * 0.96,
    chineseVoiceBias?.closedVisemeLift ?? 0,
  ))
  const openness = clampUnit(
    opennessEnvelope
    * mouthScale
    * (0.78 + jawBias * 0.24)
    * (1 - closedViseme * 0.54),
  )
  const vowelSuppression = clampUnit((1 - closedViseme * 0.78) * (chineseVoiceBias?.vowelSuppressionScale ?? 1), 1)
  const visemeDrive = clampUnit(openness * 0.82 + jawOpen * 0.18)
  const visemes = normalizeVisemes({
    A: preset.visemes.A * visemeDrive * (0.72 + jawOpen * 0.24) * vowelSuppression,
    E: preset.visemes.E * visemeDrive * (0.66 + lipSpread * 0.28) * vowelSuppression,
    I: preset.visemes.I * visemeDrive * (0.62 + lipSpread * 0.34) * vowelSuppression,
    O: preset.visemes.O * visemeDrive * (0.64 + lipRound * 0.32) * vowelSuppression,
    U: preset.visemes.U * visemeDrive * (0.58 + lipRound * 0.4) * vowelSuppression,
    closed: closedViseme,
  })

  return {
    active: openness > 0.02 || jawOpen > 0.02 || lipClosure > 0.06 || visemes.closed > 0.08,
    progress: roundHundredths(progress),
    openness: roundHundredths(openness),
    jawOpen: roundHundredths(jawOpen),
    lipClosure: roundHundredths(lipClosure),
    lipSpread: roundHundredths(lipSpread),
    lipRound: roundHundredths(lipRound),
    visemes,
    voice,
  }
}
