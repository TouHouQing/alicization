# Audio pipelines

`speech-pipeline.ts` owns ordered text segmentation and speech synthesis. Each intent keeps its own cancellation signal, owner, metadata and utterance receipts. `managers/playback-manager.ts` owns actual playback slots and outcomes; synthesis finishing does not establish that audio played.

An interrupted or replaced synthesis may finish late. Its finalizer can retire only its own registry entry and cannot release a newer active intent or advance that newer intent's pending queue. The playback layer separately checks cancellation and actual completion before reporting an outcome.

`SpeechIntentCancelPayload` defines the cancellation object used by both Eventa and the pipeline listener API: it carries the intent identity and optional reason.

Use the workspace Vitest command for `src/speech-pipeline.test.ts`, `src/managers/playback-manager.test.ts` and `src/managers/utterance-playback-tracker.test.ts` to check synthesis ownership, queue ordering, interruption and real playback result semantics.
