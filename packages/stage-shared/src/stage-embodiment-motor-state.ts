export interface StageEmbodimentMotorGazeState {
  focus: number
  stability: number
  azimuth: number
  elevation: number
}

export interface StageEmbodimentMotorHeadState {
  yaw: number
  pitch: number
  roll: number
  nod: number
}

export interface StageEmbodimentMotorBreathState {
  amplitude: number
  pace: number
}

export interface StageEmbodimentMotorFacialState {
  eyeOpenness: number
  browLift: number
  browTension: number
  cheekLift: number
  mouthSpread: number
  mouthRound: number
  jawOpenBias: number
}

export interface StageEmbodimentMotorBodyState {
  sway: number
  lean: number
  openness: number
  settle: number
}

export interface StageEmbodimentMotorState {
  stillness: number
  expressivity: number
  gaze: StageEmbodimentMotorGazeState
  head: StageEmbodimentMotorHeadState
  breath: StageEmbodimentMotorBreathState
  facial: StageEmbodimentMotorFacialState
  body: StageEmbodimentMotorBodyState
}

function clampUnit(value: number | null | undefined, fallback = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(1, Math.max(0, Number(value)))
}

function clampSignedUnit(value: number | null | undefined, fallback = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(1, Math.max(-1, Number(value)))
}

function roundUnit(value: number | null | undefined, fallback = 0) {
  return Number(clampUnit(value, fallback).toFixed(2))
}

function roundSignedUnit(value: number | null | undefined, fallback = 0) {
  return Number(clampSignedUnit(value, fallback).toFixed(2))
}

export function createIdleStageEmbodimentMotorState(): StageEmbodimentMotorState {
  return {
    stillness: 0.58,
    expressivity: 0.44,
    gaze: {
      focus: 0.52,
      stability: 0.62,
      azimuth: 0,
      elevation: 0.02,
    },
    head: {
      yaw: 0,
      pitch: 0,
      roll: 0,
      nod: 0.18,
    },
    breath: {
      amplitude: 0.42,
      pace: 0.46,
    },
    facial: {
      eyeOpenness: 0.56,
      browLift: 0,
      browTension: 0.28,
      cheekLift: 0.14,
      mouthSpread: 0.18,
      mouthRound: 0.24,
      jawOpenBias: 0.26,
    },
    body: {
      sway: 0,
      lean: 0,
      openness: 0.5,
      settle: 0.62,
    },
  }
}

export function normalizeStageEmbodimentMotorState(
  raw: unknown,
  fallback: StageEmbodimentMotorState = createIdleStageEmbodimentMotorState(),
): StageEmbodimentMotorState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ...fallback,
      gaze: { ...fallback.gaze },
      head: { ...fallback.head },
      breath: { ...fallback.breath },
      facial: { ...fallback.facial },
      body: { ...fallback.body },
    }
  }

  const candidate = raw as Record<string, unknown>
  const gaze = candidate.gaze && typeof candidate.gaze === 'object' && !Array.isArray(candidate.gaze)
    ? candidate.gaze as Record<string, unknown>
    : {}
  const head = candidate.head && typeof candidate.head === 'object' && !Array.isArray(candidate.head)
    ? candidate.head as Record<string, unknown>
    : {}
  const breath = candidate.breath && typeof candidate.breath === 'object' && !Array.isArray(candidate.breath)
    ? candidate.breath as Record<string, unknown>
    : {}
  const facial = candidate.facial && typeof candidate.facial === 'object' && !Array.isArray(candidate.facial)
    ? candidate.facial as Record<string, unknown>
    : {}
  const body = candidate.body && typeof candidate.body === 'object' && !Array.isArray(candidate.body)
    ? candidate.body as Record<string, unknown>
    : {}

  return {
    stillness: roundUnit(Number(candidate.stillness), fallback.stillness),
    expressivity: roundUnit(Number(candidate.expressivity), fallback.expressivity),
    gaze: {
      focus: roundUnit(Number(gaze.focus), fallback.gaze.focus),
      stability: roundUnit(Number(gaze.stability), fallback.gaze.stability),
      azimuth: roundSignedUnit(Number(gaze.azimuth), fallback.gaze.azimuth),
      elevation: roundSignedUnit(Number(gaze.elevation), fallback.gaze.elevation),
    },
    head: {
      yaw: roundSignedUnit(Number(head.yaw), fallback.head.yaw),
      pitch: roundSignedUnit(Number(head.pitch), fallback.head.pitch),
      roll: roundSignedUnit(Number(head.roll), fallback.head.roll),
      nod: roundUnit(Number(head.nod), fallback.head.nod),
    },
    breath: {
      amplitude: roundUnit(Number(breath.amplitude), fallback.breath.amplitude),
      pace: roundUnit(Number(breath.pace), fallback.breath.pace),
    },
    facial: {
      eyeOpenness: roundUnit(Number(facial.eyeOpenness), fallback.facial.eyeOpenness),
      browLift: roundSignedUnit(Number(facial.browLift), fallback.facial.browLift),
      browTension: roundUnit(Number(facial.browTension), fallback.facial.browTension),
      cheekLift: roundUnit(Number(facial.cheekLift), fallback.facial.cheekLift),
      mouthSpread: roundUnit(Number(facial.mouthSpread), fallback.facial.mouthSpread),
      mouthRound: roundUnit(Number(facial.mouthRound), fallback.facial.mouthRound),
      jawOpenBias: roundUnit(Number(facial.jawOpenBias), fallback.facial.jawOpenBias),
    },
    body: {
      sway: roundSignedUnit(Number(body.sway), fallback.body.sway),
      lean: roundSignedUnit(Number(body.lean), fallback.body.lean),
      openness: roundUnit(Number(body.openness), fallback.body.openness),
      settle: roundUnit(Number(body.settle), fallback.body.settle),
    },
  }
}
