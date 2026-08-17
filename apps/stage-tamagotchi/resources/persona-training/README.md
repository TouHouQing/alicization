# Alicization Local Persona Training Protocol

Alicization does not bundle or silently install a LoRA training framework. The user
configures an executable that implements this protocol.

## Probe

Alicization checks the wrapper with:

```text
<executable> --probe
```

The wrapper must write one JSON object per stdout line and exit with code `0`:

```json
{ "type": "ready" }
```

## Training Invocation

Alicization starts training with `shell: false` and an argument array:

```text
<executable>
  --manifest <absolute manifest.json path>
  --dataset <absolute dataset.jsonl path>
  --output-dir <absolute run output directory>
  --artifact-manifest <absolute artifact-manifest.json path>
  --base-model <configured base model>
```

The child environment is allowlisted and does not inherit Provider API keys.
Alicization does not accept user-defined fixed arguments; every protocol argument is
constructed by the main process.

`manifest.json` contains the approved dataset manifest, run ID, and base persona
revision. `dataset.jsonl` contains only cleaned, consented examples accepted by the
Persona training dataset quality gate. Raw transcripts and failure fallbacks are not
valid training input.

## Stdout JSONL

Only these bounded stdout events are accepted:

```jsonl
{"type":"ready"}
{"type":"progress","progress":0.42,"message":"optional short status"}
{"type":"artifact"}
{"type":"error","message":"transparent failure reason"}
```

Any malformed, oversized, or unknown event fails the run. Human-readable diagnostics
belong on stderr, which is also size-limited.

## Artifact Manifest

Before emitting `{"type":"artifact"}`, write the requested artifact manifest:

```json
{
  "schemaVersion": "alicization-persona-training-artifact-v1",
  "artifactId": "local-lora-001",
  "runId": "the-run-id-from-manifest",
  "kind": "lora-adapter",
  "path": "adapter.safetensors",
  "sha256": "lowercase-sha256",
  "baseModel": "the-configured-base-model"
}
```

`path` must be relative to `--output-dir`. Absolute paths, traversal, symlinks,
missing files, cross-root paths, and hash mismatches are rejected. Alicization
recomputes SHA-256 and atomically moves the verified output into the active card's
`persona-training/artifacts/<artifactId>` directory.

Verified artifacts remain inactive unless the desktop runtime provides a
`PersonaTrainingArtifactLoader`. Its `load()` method must return a non-empty loader
ID, receipt ID, and activation timestamp before Alicization records the artifact as
active. Producing or validating a file never means the persona was activated.

Before calling `load()`, the Pipeline Gate persists an activation intent with a
stable `operationId`. Loader implementations must treat repeated calls with the
same `operationId` as one idempotent activation and return the same semantic
receipt. Alicization deliberately replays even a previously recorded `loaded`
intent after process restart, because a receipt from the previous process is not
proof that the adapter is active in the current runtime.

The default desktop runtime currently has no Provider-specific adapter loader, so a
successful training run is reported as `unsupported`: the artifact is retained and
auditable, but it is not described as affecting dialogue. A future Provider adapter
can implement the optional loader contract without changing the dataset or training
protocol.

When an active artifact is rolled back, revoked, or recovered as invalid,
Alicization's Persona Training Pipeline Gate owns the durable
`unload -> discard -> finalize` cleanup saga. The database only persists cleanup
intents and compare-and-swap transitions; it does not call Provider loaders or
delete artifacts directly.

Every `unload()` request includes a stable `operationId`. Loader implementations
must treat repeated calls with the same `operationId` as the same idempotent
operation because Alicization may replay it after a process crash before the next
cleanup stage was persisted. Only `finalize` may mark an increment rolled back or
revoked. If unload, artifact deletion, or final persistence fails, the increment
remains unavailable for use and the lifecycle exposes a transparent pending cleanup
error instead of claiming that the adapter was removed.

## Cancellation

On cancellation, timeout, source revoke, card switch, or application shutdown,
Alicization sends `SIGTERM`, waits a short grace period, and then sends `SIGKILL` if
the process has not exited. Wrappers should handle `SIGTERM`, stop child workers, and
exit promptly.
