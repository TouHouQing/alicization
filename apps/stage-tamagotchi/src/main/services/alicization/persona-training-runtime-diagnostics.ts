import type { AlicizationPersonaTrainingExecutorConnectionResult } from '@proj-alicization/stage-shared'

export type PersonaTrainingRuntimeDiagnosticAction
  = 'none'
    | 'install-mlx-lm'
    | 'choose-readable-model'
    | 'configure-executable'
    | 'repair-protocol'
    | 'fix-configuration'

export interface PersonaTrainingRuntimeDiagnostic {
  action: PersonaTrainingRuntimeDiagnosticAction
  command: string | null
}

export function buildPersonaTrainingRuntimeDiagnostic(input: Pick<
  AlicizationPersonaTrainingExecutorConnectionResult,
  'backend' | 'status' | 'error'
>): PersonaTrainingRuntimeDiagnostic {
  if (input.status === 'ready')
    return { action: 'none', command: null }
  if (input.status === 'mlx-lm-missing') {
    return {
      action: 'install-mlx-lm',
      command: 'python3 -m pip install "mlx-lm[train]"',
    }
  }
  if (input.status === 'model-unreadable')
    return { action: 'choose-readable-model', command: null }
  if (input.status === 'executable-missing')
    return { action: 'configure-executable', command: null }
  if (input.status === 'invalid-config')
    return { action: 'fix-configuration', command: null }
  if (input.backend === 'mlx-lm' && input.error?.includes('mlx-lm is not installed')) {
    return {
      action: 'install-mlx-lm',
      command: 'python3 -m pip install "mlx-lm[train]"',
    }
  }
  return { action: 'repair-protocol', command: null }
}
