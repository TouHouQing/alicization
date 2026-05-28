import { createAlicizationRuntimeLearningComposition } from './runtime-learning-composition'
import { createAlicizationRuntimeMemoryClosure } from './runtime-memory-closure'

type RuntimeLearningCompositionInput = Parameters<typeof createAlicizationRuntimeLearningComposition>[0]
type RuntimeMemoryClosureInput = Parameters<typeof createAlicizationRuntimeMemoryClosure>[0]

export function createAlicizationRuntimeMemorySupportingComposition(input: {
  learning: RuntimeLearningCompositionInput
  memoryClosure: RuntimeMemoryClosureInput
}) {
  const {
    executeLearningTask,
    learningActionScheduler,
  } = createAlicizationRuntimeLearningComposition(input.learning)

  const memoryClosureRuntime = createAlicizationRuntimeMemoryClosure(input.memoryClosure)

  return {
    executeLearningTask,
    learningActionScheduler,
    memoryClosureRuntime,
  }
}
