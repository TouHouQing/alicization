# Audio pipelines

Buffered sources may carry adapter-provided `SpeechTextTiming[]` for the exact synthesized input. These UTF-16 ranges and audio times travel with the audio rather than model metadata. Consumers validate bounds, order and duration before using them; ordinary audio-only adapters keep the field absent and must not claim exact alignment.

An intent can finish synthesis before its queued audio finishes playback. `cancelIntent` always reaches the playback manager, including after the synthesis registry entry has retired. The actual playback result remains interrupted and retains its played duration; ending text input cannot make later stop controls ineffective.

`speech-pipeline.ts` owns ordered text segmentation and speech synthesis. Each intent keeps its own cancellation signal, owner, metadata and utterance receipts. `managers/playback-manager.ts` owns actual playback slots and outcomes; synthesis finishing does not establish that audio played.

An interrupted or replaced synthesis may finish late. Its finalizer can retire only its own registry entry and cannot release a newer active intent or advance that newer intent's pending queue. The playback layer separately checks cancellation and actual completion before reporting an outcome.

`SpeechIntentCancelPayload` defines the cancellation object used by both Eventa and the pipeline listener API: it carries the intent identity and optional reason.

Use the workspace Vitest command for `src/speech-pipeline.test.ts`, `src/managers/playback-manager.test.ts` and `src/managers/utterance-playback-tracker.test.ts` to check synthesis ownership, queue ordering, interruption and real playback result semantics.
