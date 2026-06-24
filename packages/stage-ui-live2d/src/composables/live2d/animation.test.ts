import { MathUtils } from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useLive2DIdleEyeFocus } from './animation'

vi.mock('../../utils', () => ({
  randomSaccadeInterval: () => 1000,
}))

function createInternalModel() {
  const values = new Map<string, number>([
    ['ParamEyeBallX', 0],
    ['ParamEyeBallY', 0],
  ])

  return {
    values,
    focusController: {
      focus: vi.fn(),
      update: vi.fn(),
    },
    coreModel: {
      getParameterValueById(parameterId: string) {
        return values.get(parameterId) ?? 0
      },
      setParameterValueById(parameterId: string, value: number) {
        values.set(parameterId, value)
      },
    },
  } as any
}

function readParameter(model: ReturnType<typeof createInternalModel>, parameterId: string) {
  return model.values.get(parameterId) ?? 0
}

describe('live2d idle eye focus', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps steady idle gaze narrower than drift under the same idle focus target', () => {
    vi.spyOn(MathUtils, 'randFloat')
      .mockImplementationOnce(() => 0.8)
      .mockImplementationOnce(() => 0.5)
      .mockImplementationOnce(() => 0.8)
      .mockImplementationOnce(() => 0.5)

    const steadyModel = createInternalModel()
    const driftModel = createInternalModel()
    const steadyFocus = useLive2DIdleEyeFocus()
    const driftFocus = useLive2DIdleEyeFocus()

    steadyFocus.update(steadyModel, 0, {
      azimuthScale: 0.94,
      elevationScale: 0.96,
      stabilityBias: 0.12,
    })
    driftFocus.update(driftModel, 0, {
      azimuthScale: 1.08,
      elevationScale: 1.04,
      stabilityBias: -0.1,
    })

    expect(Math.abs(readParameter(steadyModel, 'ParamEyeBallX'))).toBeLessThan(Math.abs(readParameter(driftModel, 'ParamEyeBallX')))
    expect(Math.abs(readParameter(steadyModel, 'ParamEyeBallY'))).toBeLessThan(Math.abs(readParameter(driftModel, 'ParamEyeBallY')))
  })

  it('keeps same-her measured-return idle focus steadier than ordinary drift across successive saccades', () => {
    vi.spyOn(MathUtils, 'randFloat')
      .mockImplementationOnce(() => 0.9)
      .mockImplementationOnce(() => 0.4)
      .mockImplementationOnce(() => -0.9)
      .mockImplementationOnce(() => -0.4)
      .mockImplementationOnce(() => 0.9)
      .mockImplementationOnce(() => 0.4)
      .mockImplementationOnce(() => -0.9)
      .mockImplementationOnce(() => -0.4)

    const sameHerModel = createInternalModel()
    const driftModel = createInternalModel()
    const sameHerFocus = useLive2DIdleEyeFocus()
    const driftFocus = useLive2DIdleEyeFocus()

    sameHerFocus.update(sameHerModel, 0, {
      azimuthScale: 0.8448,
      elevationScale: 0.864,
      stabilityBias: 0.1,
    })
    sameHerFocus.update(sameHerModel, 2, {
      azimuthScale: 0.8448,
      elevationScale: 0.864,
      stabilityBias: 0.1,
    })

    driftFocus.update(driftModel, 0, {
      azimuthScale: 1.08,
      elevationScale: 1.04,
      stabilityBias: -0.1,
    })
    driftFocus.update(driftModel, 2, {
      azimuthScale: 1.08,
      elevationScale: 1.04,
      stabilityBias: -0.1,
    })

    const sameHerFocusCalls = sameHerModel.focusController.focus.mock.calls
    const driftFocusCalls = driftModel.focusController.focus.mock.calls
    const sameHerDelta = Math.abs(sameHerFocusCalls[1][0] - sameHerFocusCalls[0][0])
      + Math.abs(sameHerFocusCalls[1][1] - sameHerFocusCalls[0][1])
    const driftDelta = Math.abs(driftFocusCalls[1][0] - driftFocusCalls[0][0])
      + Math.abs(driftFocusCalls[1][1] - driftFocusCalls[0][1])
    const sameHerSecondMagnitude = Math.abs(sameHerFocusCalls[1][0])
      + Math.abs(sameHerFocusCalls[1][1])
    const driftSecondMagnitude = Math.abs(driftFocusCalls[1][0])
      + Math.abs(driftFocusCalls[1][1])

    expect(sameHerDelta).toBeLessThan(driftDelta)
    expect(sameHerSecondMagnitude).toBeLessThan(driftSecondMagnitude)
  })
})
