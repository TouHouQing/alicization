import { describe, expect, it, vi } from 'vitest'

import { supportsLive2DParameter } from './parameter-support'

describe('compiled Live2D parameter capabilities', () => {
  it('rejects virtual SDK indices without probing or allocating unknown parameters', () => {
    const virtualIndex = vi.fn(() => 70)
    const model = {
      getModel: () => ({ parameters: { ids: ['ParamEyeLSmile', 'ParamEyeRSmile'] } }),
      getParameterIndex: virtualIndex,
    }
    expect(supportsLive2DParameter(model, 'ParamEyeLSmile')).toBe(true)
    expect(supportsLive2DParameter(model, 'ParamEyeSmile')).toBe(false)
    expect(supportsLive2DParameter(model, 'ParamA')).toBe(false)
    expect(virtualIndex).not.toHaveBeenCalled()
  })
})
