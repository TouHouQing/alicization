export interface Live2DFacialCueDrive {
  browAngle: number
  browLift: number
  cheek: number
  eyeOpenScale: number
  eyeSmile: number
  mouthForm: number
  mouthOpen: number
}

const live2dFacialCueAliases = new Map<string, string>([
  ['blink', 'blink'],
  ['brow-furrow', 'brow-furrow'],
  ['bright-smile', 'bright-smile'],
  ['downcast', 'downcast'],
  ['focus', 'focus'],
  ['focused', 'focus'],
  ['frown', 'frown'],
  ['glance', 'glance'],
  ['glare', 'glare'],
  ['half-lid', 'half-lid'],
  ['pout', 'pout'],
  ['relaxed', 'relaxed'],
  ['shock', 'shock'],
  ['slow-blink', 'slow-blink'],
  ['smile', 'smile'],
  ['soft-gaze', 'soft-gaze'],
  ['wide-eye', 'wide-eye'],
])

const emptyLive2DFacialCueDrive: Live2DFacialCueDrive = {
  browAngle: 0,
  browLift: 0,
  cheek: 0,
  eyeOpenScale: 0,
  eyeSmile: 0,
  mouthForm: 0,
  mouthOpen: 0,
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0

  return Math.min(1, Math.max(0, value))
}

function normalizeLive2DFacialCueKey(rawCue?: string | null) {
  const normalizedCue = typeof rawCue === 'string' ? rawCue.trim().toLowerCase() : ''
  if (!normalizedCue)
    return ''

  return live2dFacialCueAliases.get(normalizedCue) ?? normalizedCue
}

function scaleDrive(
  drive: Live2DFacialCueDrive,
  intensity: number,
): Live2DFacialCueDrive {
  const factor = clamp01(intensity)
  if (factor <= 0)
    return { ...emptyLive2DFacialCueDrive }

  return {
    browAngle: drive.browAngle * factor,
    browLift: drive.browLift * factor,
    cheek: drive.cheek * factor,
    eyeOpenScale: drive.eyeOpenScale * factor,
    eyeSmile: drive.eyeSmile * factor,
    mouthForm: drive.mouthForm * factor,
    mouthOpen: drive.mouthOpen * factor,
  }
}

export function resolveLive2DFacialCueDrive(
  rawCue?: string | null,
  intensity: number = 1,
): Live2DFacialCueDrive {
  switch (normalizeLive2DFacialCueKey(rawCue)) {
    case 'smile':
      return scaleDrive({
        ...emptyLive2DFacialCueDrive,
        cheek: 0.08,
        eyeSmile: 0.14,
        mouthForm: 0.12,
      }, intensity)
    case 'bright-smile':
      return scaleDrive({
        ...emptyLive2DFacialCueDrive,
        cheek: 0.16,
        eyeSmile: 0.26,
        mouthForm: 0.2,
        mouthOpen: 0.04,
      }, intensity)
    case 'frown':
      return scaleDrive({
        ...emptyLive2DFacialCueDrive,
        browAngle: -0.08,
        browLift: -0.12,
        mouthForm: -0.16,
      }, intensity)
    case 'brow-furrow':
      return scaleDrive({
        ...emptyLive2DFacialCueDrive,
        browAngle: -0.18,
        browLift: -0.18,
        mouthForm: -0.04,
      }, intensity)
    case 'focus':
      return scaleDrive({
        ...emptyLive2DFacialCueDrive,
        browAngle: 0.06,
        browLift: 0.08,
        eyeOpenScale: 0.06,
      }, intensity)
    case 'soft-gaze':
      return scaleDrive({
        ...emptyLive2DFacialCueDrive,
        browLift: -0.02,
        eyeOpenScale: -0.06,
        eyeSmile: 0.06,
      }, intensity)
    case 'downcast':
      return scaleDrive({
        ...emptyLive2DFacialCueDrive,
        browLift: -0.08,
        eyeOpenScale: -0.18,
        mouthForm: -0.08,
      }, intensity)
    case 'glare':
      return scaleDrive({
        ...emptyLive2DFacialCueDrive,
        browAngle: -0.14,
        browLift: -0.22,
        eyeOpenScale: -0.12,
      }, intensity)
    case 'glance':
      return scaleDrive({
        ...emptyLive2DFacialCueDrive,
        browAngle: 0.08,
        eyeOpenScale: 0.02,
      }, intensity)
    case 'shock':
      return scaleDrive({
        ...emptyLive2DFacialCueDrive,
        browLift: 0.12,
        eyeOpenScale: 0.2,
        mouthOpen: 0.14,
      }, intensity)
    case 'wide-eye':
      return scaleDrive({
        ...emptyLive2DFacialCueDrive,
        browLift: 0.1,
        eyeOpenScale: 0.28,
      }, intensity)
    case 'half-lid':
      return scaleDrive({
        ...emptyLive2DFacialCueDrive,
        browLift: -0.04,
        eyeOpenScale: -0.26,
      }, intensity)
    case 'slow-blink':
      return scaleDrive({
        ...emptyLive2DFacialCueDrive,
        eyeOpenScale: -0.34,
      }, intensity)
    case 'blink':
      return scaleDrive({
        ...emptyLive2DFacialCueDrive,
        eyeOpenScale: -0.48,
      }, intensity)
    case 'pout':
      return scaleDrive({
        ...emptyLive2DFacialCueDrive,
        browLift: -0.04,
        cheek: 0.03,
        mouthForm: -0.24,
      }, intensity)
    case 'relaxed':
      return scaleDrive({
        ...emptyLive2DFacialCueDrive,
        browLift: 0.04,
        eyeOpenScale: -0.04,
        eyeSmile: 0.03,
      }, intensity)
    default:
      return { ...emptyLive2DFacialCueDrive }
  }
}
