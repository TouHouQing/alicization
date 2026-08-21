import { describe, expect, it } from 'vitest'

import {
  buildPersonaTrainingRuntimeDiagnostic,
} from './persona-training-runtime-diagnostics'

describe('persona training runtime diagnostics', () => {
  it('gives an install action when the MLX-LM dependency is missing', () => {
    expect(buildPersonaTrainingRuntimeDiagnostic({
      backend: 'mlx-lm',
      status: 'mlx-lm-missing',
      error: 'mlx-lm is not installed in the selected Python environment',
    })).toEqual({
      action: 'install-mlx-lm',
      command: 'python3 -m pip install "mlx-lm[train]"',
    })
  })

  it('gives a model-path action without exposing a fake ready state', () => {
    expect(buildPersonaTrainingRuntimeDiagnostic({
      backend: 'mlx-lm',
      status: 'model-unreadable',
      error: 'persona training base model cannot be read',
    })).toEqual({
      action: 'choose-readable-model',
      command: null,
    })
  })

  it('does not suggest a repair for a ready trainer', () => {
    expect(buildPersonaTrainingRuntimeDiagnostic({
      backend: 'external',
      status: 'ready',
      error: null,
    })).toEqual({
      action: 'none',
      command: null,
    })
  })
})
