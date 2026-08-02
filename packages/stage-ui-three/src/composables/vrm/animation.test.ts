import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { resolveVrmGazeModeBias, useBlink, useIdleEyeSaccades } from './animation'

vi.mock('./utils/eye-motions', () => ({
  randomSaccadeInterval: () => 1000,
}))

function createLookAtTargetNode() {
  return {
    x: 0,
    y: 0,
    z: 1,
    lerp(target: { x: number, y: number, z: number }, _alpha: number) {
      this.x = target.x
      this.y = target.y
      this.z = target.z
      return this
    },
  }
}

function createMockVrm() {
  return {
    expressionManager: {},
    lookAt: {
      target: {
        position: createLookAtTargetNode(),
      },
      update: vi.fn(),
    },
  } as any
}

function createIdleLookAtTarget() {
  return ref({
    x: 0,
    y: 0,
    z: 1,
  })
}

function createIdleMotor() {
  return {
    stillness: 0.58,
    expressivity: 0.44,
    gaze: {
      focus: 0.52,
      stability: 0.62,
      azimuth: 0,
      elevation: 0,
    },
  } as any
}

function createIdlePosture() {
  return {
    gazeStability: 0.62,
  } as any
}

describe('vrm gaze mode bias', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('maps companionship gaze hints into restrained or looser VRM look-at presets', () => {
    expect(resolveVrmGazeModeBias({
      preferredGazeMode: 'soften',
    })).toEqual({
      amplitudeScale: 0.82,
      intervalScale: 1.14,
      azimuthScale: 0.88,
      elevationScale: 0.9,
    })

    expect(resolveVrmGazeModeBias({
      preferredGazeMode: 'drift',
    })).toEqual({
      amplitudeScale: 1.12,
      intervalScale: 0.9,
      azimuthScale: 1.08,
      elevationScale: 1.04,
    })

    expect(resolveVrmGazeModeBias({
      preferredGazeMode: 'steady',
    })).toEqual({
      amplitudeScale: 0.9,
      intervalScale: 1.08,
      azimuthScale: 0.94,
      elevationScale: 0.96,
    })

    expect(resolveVrmGazeModeBias({
      preferredGazeMode: 'unknown',
    })).toEqual({
      amplitudeScale: 1,
      intervalScale: 1,
      azimuthScale: 1,
      elevationScale: 1,
    })
  })

  it('extends idle cadence and reduces saccade amplitude for restrained companionship resident modes', () => {
    const quietCompanionship = resolveVrmGazeModeBias({
      preferredGazeMode: 'soften',
      residentMode: 'quiet-companionship',
    })
    const measuredReturn = resolveVrmGazeModeBias({
      preferredGazeMode: 'soften',
      residentMode: 'measured-return',
    })
    const repairBeforeCloseness = resolveVrmGazeModeBias({
      preferredGazeMode: 'soften',
      residentMode: 'repair-before-closeness',
    })

    expect(quietCompanionship.intervalScale).toBeGreaterThan(1.14)
    expect(measuredReturn.intervalScale).toBeGreaterThan(quietCompanionship.intervalScale)
    expect(repairBeforeCloseness.intervalScale).toBeGreaterThan(measuredReturn.intervalScale)

    expect(quietCompanionship.amplitudeScale).toBeLessThan(0.82)
    expect(measuredReturn.amplitudeScale).toBeLessThan(quietCompanionship.amplitudeScale)
    expect(repairBeforeCloseness.amplitudeScale).toBeLessThan(measuredReturn.amplitudeScale)
  })

  it('maps preferred blink cadence into quieter or more lingering VRM blink intervals', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const normalBlink = useBlink()
    const lingerBlink = useBlink()
    const quietBlink = useBlink()
    let normalResult = { active: false, weights: { blink: 0 } }
    let lingerResult = { active: false, weights: { blink: 0 } }
    let quietResult = { active: false, weights: { blink: 0 } }

    for (let i = 0; i < 12; i += 1) {
      normalResult = normalBlink.update(0.1, null, { preferredBlinkCadence: 'normal' })
      lingerResult = lingerBlink.update(0.1, null, { preferredBlinkCadence: 'linger' })
      quietResult = quietBlink.update(0.1, null, { preferredBlinkCadence: 'quiet' })
    }

    expect(normalResult.active).toBe(true)
    expect(lingerResult.active).toBe(false)
    expect(quietResult.active).toBe(false)

    vi.restoreAllMocks()
  })

  it('keeps measured-return and repair-before-closeness blink cadence more inward even when renderer hints stay on the same soften/linger family', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const quietCompanionshipBlink = useBlink()
    const measuredReturnBlink = useBlink()
    const repairBeforeClosenessBlink = useBlink()
    let quietCompanionshipFirstBlinkAt: number | null = null
    let measuredReturnFirstBlinkAt: number | null = null
    let repairBeforeClosenessFirstBlinkAt: number | null = null

    for (let i = 0; i < 60; i += 1) {
      const elapsed = (i + 1) * 0.1
      const quietCompanionshipResult = quietCompanionshipBlink.update(0.1, null, {
        preferredBlinkCadence: 'linger',
        residentMode: 'quiet-companionship',
      })
      const measuredReturnResult = measuredReturnBlink.update(0.1, null, {
        preferredBlinkCadence: 'linger',
        residentMode: 'measured-return',
      })
      const repairBeforeClosenessResult = repairBeforeClosenessBlink.update(0.1, null, {
        preferredBlinkCadence: 'linger',
        residentMode: 'repair-before-closeness',
      })

      if (quietCompanionshipFirstBlinkAt === null && quietCompanionshipResult.active)
        quietCompanionshipFirstBlinkAt = elapsed
      if (measuredReturnFirstBlinkAt === null && measuredReturnResult.active)
        measuredReturnFirstBlinkAt = elapsed
      if (repairBeforeClosenessFirstBlinkAt === null && repairBeforeClosenessResult.active)
        repairBeforeClosenessFirstBlinkAt = elapsed
    }

    expect(quietCompanionshipFirstBlinkAt).not.toBeNull()
    expect(measuredReturnFirstBlinkAt).not.toBeNull()
    expect(repairBeforeClosenessFirstBlinkAt).not.toBeNull()
    expect(measuredReturnFirstBlinkAt!).toBeGreaterThan(quietCompanionshipFirstBlinkAt!)
    expect(repairBeforeClosenessFirstBlinkAt!).toBeGreaterThan(measuredReturnFirstBlinkAt!)

    vi.restoreAllMocks()
  })

  it('keeps steady and softened durable measured-return gaze on one restrained companionship tier while preserving their different gaze character', () => {
    const steadyDurableMeasuredReturn = resolveVrmGazeModeBias({
      preferredGazeMode: 'steady',
      residentMode: 'measured-return',
    })
    const softenedDurableMeasuredReturn = resolveVrmGazeModeBias({
      preferredGazeMode: 'soften',
      residentMode: 'measured-return',
    })
    const softenedQuietCompanionship = resolveVrmGazeModeBias({
      preferredGazeMode: 'soften',
      residentMode: 'quiet-companionship',
    })

    expect(steadyDurableMeasuredReturn.intervalScale).toBeGreaterThan(softenedQuietCompanionship.intervalScale)
    expect(softenedDurableMeasuredReturn.intervalScale).toBeGreaterThan(softenedQuietCompanionship.intervalScale)
    expect(steadyDurableMeasuredReturn.amplitudeScale).toBeLessThan(softenedQuietCompanionship.amplitudeScale)
    expect(softenedDurableMeasuredReturn.amplitudeScale).toBeLessThan(softenedQuietCompanionship.amplitudeScale)
    expect(steadyDurableMeasuredReturn.azimuthScale).toBeGreaterThan(softenedDurableMeasuredReturn.azimuthScale)
    expect(steadyDurableMeasuredReturn.elevationScale).toBeGreaterThan(softenedDurableMeasuredReturn.elevationScale)
  })

  it('also treats softened measured-return gaze as durable companionship cadence instead of only the older steady variant', () => {
    const softenedDurableMeasuredReturn = resolveVrmGazeModeBias({
      preferredGazeMode: 'soften',
      residentMode: 'measured-return',
    })
    const softenedQuietCompanionship = resolveVrmGazeModeBias({
      preferredGazeMode: 'soften',
      residentMode: 'quiet-companionship',
    })

    expect(softenedDurableMeasuredReturn.intervalScale).toBeGreaterThan(softenedQuietCompanionship.intervalScale)
    expect(softenedDurableMeasuredReturn.amplitudeScale).toBeLessThan(softenedQuietCompanionship.amplitudeScale)
  })

  it('keeps repair-before-closeness gaze on the most restrained vrm tier when renderer continuity is softening before body authority fully returns', () => {
    const ordinarySteady = resolveVrmGazeModeBias({
      preferredGazeMode: 'steady',
    })
    const measuredReturnSoften = resolveVrmGazeModeBias({
      preferredGazeMode: 'soften',
      residentMode: 'measured-return',
    })
    const repairBeforeClosenessSoften = resolveVrmGazeModeBias({
      preferredGazeMode: 'soften',
      residentMode: 'repair-before-closeness',
    })

    expect(repairBeforeClosenessSoften.intervalScale).toBeGreaterThan(measuredReturnSoften.intervalScale)
    expect(repairBeforeClosenessSoften.intervalScale).toBeGreaterThan(ordinarySteady.intervalScale)
    expect(repairBeforeClosenessSoften.amplitudeScale).toBeLessThan(measuredReturnSoften.amplitudeScale)
    expect(repairBeforeClosenessSoften.amplitudeScale).toBeLessThan(ordinarySteady.amplitudeScale)
    expect(repairBeforeClosenessSoften.azimuthScale).toBe(0.88)
    expect(repairBeforeClosenessSoften.elevationScale).toBe(0.9)
  })

  it('keeps gaze bias identical when audit fields are empty, ordinary, or contain legacy continuity text', () => {
    const cleanRepairBeforeCloseness = resolveVrmGazeModeBias({
      preferredGazeMode: 'soften',
      residentMode: 'repair-before-closeness',
    } as any)
    const ordinaryAuditRepairBeforeCloseness = resolveVrmGazeModeBias({
      preferredGazeMode: 'soften',
      residentMode: 'repair-before-closeness',
      reasonTags: ['renderer:audit-only'],
      signature: 'ordinary renderer audit text',
    } as any)
    const legacyContinuityRepairBeforeCloseness = resolveVrmGazeModeBias({
      preferredGazeMode: 'soften',
      residentMode: 'repair-before-closeness',
      reasonTags: ['embodiment:body+voice-only'],
      signature: 'resident|main-runtime|embodiment:audible_continuity_line|body+voice-only',
    } as any)

    expect(ordinaryAuditRepairBeforeCloseness).toEqual(cleanRepairBeforeCloseness)
    expect(legacyContinuityRepairBeforeCloseness).toEqual(cleanRepairBeforeCloseness)
  })

  it('keeps interruption-resume blink cadence more inward for repair-before-closeness than measured-return on the same later callback line', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const measuredReturnBlink = useBlink()
    const repairBeforeClosenessBlink = useBlink()
    let measuredReturnFirstBlinkAt: number | null = null
    let repairBeforeClosenessFirstBlinkAt: number | null = null

    for (let i = 0; i < 80; i += 1) {
      const elapsed = (i + 1) * 0.1
      const measuredReturnResult = measuredReturnBlink.update(0.1, {
        speechEnergy: 0,
        prosodyIntensity: 0.18,
        emphasisLevel: 0,
        cadencePulse: 0,
      }, {
        preferredBlinkCadence: 'linger',
        residentMode: 'measured-return',
      })
      const repairBeforeClosenessResult = repairBeforeClosenessBlink.update(0.1, {
        speechEnergy: 0,
        prosodyIntensity: 0.18,
        emphasisLevel: 0,
        cadencePulse: 0,
      }, {
        preferredBlinkCadence: 'linger',
        residentMode: 'repair-before-closeness',
      })

      if (measuredReturnFirstBlinkAt === null && measuredReturnResult.active)
        measuredReturnFirstBlinkAt = elapsed
      if (repairBeforeClosenessFirstBlinkAt === null && repairBeforeClosenessResult.active)
        repairBeforeClosenessFirstBlinkAt = elapsed
    }

    expect(measuredReturnFirstBlinkAt).not.toBeNull()
    expect(repairBeforeClosenessFirstBlinkAt).not.toBeNull()
    expect(repairBeforeClosenessFirstBlinkAt!).toBeGreaterThan(measuredReturnFirstBlinkAt!)

    vi.restoreAllMocks()
  })

  it('keeps blink cadence identical when audit fields are empty, ordinary, or contain legacy continuity text', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const cleanRepairBlink = useBlink()
    const ordinaryAuditRepairBlink = useBlink()
    const legacyContinuityRepairBlink = useBlink()
    let cleanRepairFirstBlinkAt: number | null = null
    let ordinaryAuditRepairFirstBlinkAt: number | null = null
    let legacyContinuityRepairFirstBlinkAt: number | null = null

    for (let i = 0; i < 90; i += 1) {
      const elapsed = (i + 1) * 0.1
      const cleanRepairResult = cleanRepairBlink.update(0.1, null, {
        preferredBlinkCadence: 'linger',
        residentMode: 'repair-before-closeness',
      } as any)
      const ordinaryAuditRepairResult = ordinaryAuditRepairBlink.update(0.1, null, {
        preferredBlinkCadence: 'linger',
        residentMode: 'repair-before-closeness',
        reasonTags: ['renderer:audit-only'],
        signature: 'ordinary renderer audit text',
      } as any)
      const legacyContinuityRepairResult = legacyContinuityRepairBlink.update(0.1, null, {
        preferredBlinkCadence: 'linger',
        residentMode: 'repair-before-closeness',
        reasonTags: ['embodiment:body+voice-only'],
        signature: 'resident|main-runtime|embodiment:audible_continuity_line|body+voice-only',
      } as any)

      if (cleanRepairFirstBlinkAt === null && cleanRepairResult.active)
        cleanRepairFirstBlinkAt = elapsed
      if (ordinaryAuditRepairFirstBlinkAt === null && ordinaryAuditRepairResult.active)
        ordinaryAuditRepairFirstBlinkAt = elapsed
      if (legacyContinuityRepairFirstBlinkAt === null && legacyContinuityRepairResult.active)
        legacyContinuityRepairFirstBlinkAt = elapsed
    }

    expect(cleanRepairFirstBlinkAt).not.toBeNull()
    expect(ordinaryAuditRepairFirstBlinkAt).toBe(cleanRepairFirstBlinkAt)
    expect(legacyContinuityRepairFirstBlinkAt).toBe(cleanRepairFirstBlinkAt)

    vi.restoreAllMocks()
  })

  it('applies steady idle gaze as a narrower actual VRM saccade target than drift under the same random fixation pull', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)

    const steadyVrm = createMockVrm()
    const driftVrm = createMockVrm()
    const steadySaccades = useIdleEyeSaccades()
    const driftSaccades = useIdleEyeSaccades()
    const lookAtTarget = createIdleLookAtTarget()
    const motor = createIdleMotor()
    const posture = createIdlePosture()

    steadySaccades.update(
      steadyVrm,
      lookAtTarget,
      0.1,
      null,
      motor,
      posture,
      { preferredGazeMode: 'steady' },
    )
    driftSaccades.update(
      driftVrm,
      lookAtTarget,
      0.1,
      null,
      motor,
      posture,
      { preferredGazeMode: 'drift' },
    )

    expect(Math.abs(steadyVrm.lookAt.target.position.x)).toBeLessThan(Math.abs(driftVrm.lookAt.target.position.x))
    expect(Math.abs(steadyVrm.lookAt.target.position.y)).toBeLessThan(Math.abs(driftVrm.lookAt.target.position.y))
  })

  it('keeps the next actual VRM idle saccade later for steady gaze than drift on the same idle line', () => {
    const lookAtTarget = createIdleLookAtTarget()
    const motor = createIdleMotor()
    const posture = createIdlePosture()

    const driftRandomSpy = vi.spyOn(Math, 'random')
      .mockImplementationOnce(() => 0.9)
      .mockImplementationOnce(() => 0.9)
      .mockImplementationOnce(() => 0.1)
      .mockImplementationOnce(() => 0.1)

    const driftVrm = createMockVrm()
    const driftSaccades = useIdleEyeSaccades()
    driftSaccades.update(driftVrm, lookAtTarget, 0.1, null, motor, posture, {
      preferredGazeMode: 'drift',
    })
    const driftFirstTarget = {
      x: driftVrm.lookAt.target.position.x,
      y: driftVrm.lookAt.target.position.y,
    }
    for (let i = 0; i < 11; i += 1)
      driftSaccades.update(driftVrm, lookAtTarget, 0.1, null, motor, posture, { preferredGazeMode: 'drift' })

    const driftSecondTarget = {
      x: driftVrm.lookAt.target.position.x,
      y: driftVrm.lookAt.target.position.y,
    }
    driftRandomSpy.mockRestore()

    const steadyRandomSpy = vi.spyOn(Math, 'random')
      .mockImplementationOnce(() => 0.9)
      .mockImplementationOnce(() => 0.9)
      .mockImplementationOnce(() => 0.1)
      .mockImplementationOnce(() => 0.1)

    const steadyVrm = createMockVrm()
    const steadySaccades = useIdleEyeSaccades()
    steadySaccades.update(steadyVrm, lookAtTarget, 0.1, null, motor, posture, {
      preferredGazeMode: 'steady',
    })
    const steadyFirstTarget = {
      x: steadyVrm.lookAt.target.position.x,
      y: steadyVrm.lookAt.target.position.y,
    }
    for (let i = 0; i < 11; i += 1)
      steadySaccades.update(steadyVrm, lookAtTarget, 0.1, null, motor, posture, { preferredGazeMode: 'steady' })

    const steadySecondTarget = {
      x: steadyVrm.lookAt.target.position.x,
      y: steadyVrm.lookAt.target.position.y,
    }
    steadyRandomSpy.mockRestore()

    expect(driftSecondTarget).not.toEqual(driftFirstTarget)
    expect(steadySecondTarget).toEqual(steadyFirstTarget)
  })

  it('keeps idle saccades identical when audit fields are empty, ordinary, or contain legacy continuity text', () => {
    const cleanRepairRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9)

    const cleanRepairVrm = createMockVrm()
    const cleanRepairSaccades = useIdleEyeSaccades()
    cleanRepairSaccades.update(
      cleanRepairVrm,
      createIdleLookAtTarget(),
      0.1,
      null,
      createIdleMotor(),
      createIdlePosture(),
      {
        preferredGazeMode: 'soften',
        preferredBlinkCadence: 'quiet',
        residentMode: 'repair-before-closeness',
      },
    )
    cleanRepairRandomSpy.mockRestore()

    const ordinaryAuditRepairRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9)

    const ordinaryAuditRepairVrm = createMockVrm()
    const ordinaryAuditRepairSaccades = useIdleEyeSaccades()
    ordinaryAuditRepairSaccades.update(
      ordinaryAuditRepairVrm,
      createIdleLookAtTarget(),
      0.1,
      null,
      createIdleMotor(),
      createIdlePosture(),
      {
        preferredGazeMode: 'soften',
        preferredBlinkCadence: 'quiet',
        residentMode: 'repair-before-closeness',
        reasonTags: ['renderer:audit-only'],
        signature: 'ordinary renderer audit text',
      } as any,
    )
    ordinaryAuditRepairRandomSpy.mockRestore()

    const legacyContinuityRepairRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9)

    const legacyContinuityRepairVrm = createMockVrm()
    const legacyContinuityRepairSaccades = useIdleEyeSaccades()
    legacyContinuityRepairSaccades.update(
      legacyContinuityRepairVrm,
      createIdleLookAtTarget(),
      0.1,
      null,
      createIdleMotor(),
      createIdlePosture(),
      {
        preferredGazeMode: 'soften',
        preferredBlinkCadence: 'quiet',
        residentMode: 'repair-before-closeness',
        reasonTags: ['embodiment:body+voice-only'],
        signature: 'resident|main-runtime|embodiment:audible_continuity_line|body+voice-only',
      } as any,
    )
    legacyContinuityRepairRandomSpy.mockRestore()

    const cleanRepairPosition = {
      x: cleanRepairVrm.lookAt.target.position.x,
      y: cleanRepairVrm.lookAt.target.position.y,
      z: cleanRepairVrm.lookAt.target.position.z,
    }
    expect({
      x: ordinaryAuditRepairVrm.lookAt.target.position.x,
      y: ordinaryAuditRepairVrm.lookAt.target.position.y,
      z: ordinaryAuditRepairVrm.lookAt.target.position.z,
    }).toEqual(cleanRepairPosition)
    expect({
      x: legacyContinuityRepairVrm.lookAt.target.position.x,
      y: legacyContinuityRepairVrm.lookAt.target.position.y,
      z: legacyContinuityRepairVrm.lookAt.target.position.z,
    }).toEqual(cleanRepairPosition)
  })
})
