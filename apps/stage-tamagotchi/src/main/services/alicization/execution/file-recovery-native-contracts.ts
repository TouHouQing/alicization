import { isAbsolute } from 'node:path'

import * as v from 'valibot'

const nativePath = v.pipe(v.string(), v.minLength(1), v.maxLength(4096), v.check(isAbsolute))
export const fileRecoveryNativeProcessSchema = v.object({ pid: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(2147483647)), creationTimeTicks: v.pipe(v.string(), v.regex(/^[1-9]\d{14,19}$/u)), executable: nativePath, workerPath: nativePath, workerHash: v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u)) })
export type FileRecoveryNativeProcess = v.InferOutput<typeof fileRecoveryNativeProcessSchema>
