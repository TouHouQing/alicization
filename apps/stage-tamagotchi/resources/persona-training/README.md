# Alicization Local Persona Training Protocol

Alicization does not bundle or silently install a LoRA training framework. The user
configures an executable wrapper that adapts an existing local trainer to this protocol.

## Probe

Alicization checks the wrapper with:

```text
<executable> <fixed arguments...> --probe
```

The wrapper must write one JSON object per stdout line and exit with code `0`:

```json
{ "type": "ready" }
```

## Training Invocation

Alicization starts training with `shell: false` and an argument array:

```text
<executable> <fixed arguments...>
  --manifest <absolute manifest.json path>
  --dataset <absolute dataset.jsonl path>
  --output-dir <absolute run output directory>
  --artifact-manifest <absolute artifact-manifest.json path>
  --base-model <configured base model>
```

The child environment is allowlisted and does not inherit Provider API keys.

`manifest.json` contains the approved dataset manifest, run ID, and base persona
revision. `dataset.jsonl` contains only cleaned, consented examples accepted by the
Persona training dataset quality gate. Raw transcripts and failure fallbacks are not
valid training input.

## Stdout JSONL

Only these bounded stdout events are accepted:

```json
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

Verified artifacts remain inactive until a real `PersonaAdapterLoader.load()` receipt
exists. Producing a file never means the persona was activated.

## Cancellation

On cancellation, timeout, source revoke, card switch, or application shutdown,
Alicization sends `SIGTERM`, waits a short grace period, and then sends `SIGKILL` if
the process has not exited. Wrappers should handle `SIGTERM`, stop child workers, and
exit promptly.
