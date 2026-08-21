#!/usr/bin/env python3
"""Run a local MLX LoRA training job through Alicization's bounded JSONL protocol."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

ALLOWED_SOURCE_KINDS = {
    "cleaned-long-term-reflection",
    "persona-reinforcement",
}
SUPPORTED_DATASET_SCHEMA = "persona-training-dataset-v1"
SUPPORTED_EXAMPLE_SCHEMA = "persona-training-example-v1"

def emit(payload: dict[str, object]) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def fail(message: str, exit_code: int = 1) -> int:
    emit({"type": "error", "message": message})
    return exit_code


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--probe", action="store_true")
    parser.add_argument("--manifest")
    parser.add_argument("--dataset")
    parser.add_argument("--output-dir")
    parser.add_argument("--artifact-manifest")
    parser.add_argument("--base-model")
    parser.add_argument("--backend", default="mlx-lm")
    parser.add_argument("--iterations", type=int, default=600)
    parser.add_argument("--learning-rate", type=float, default=1e-5)
    parser.add_argument("--lora-layers", type=int, default=8)
    parser.add_argument("--batch-size", type=int, default=1)
    parser.add_argument("--max-seq-length", type=int, default=2048)
    parser.add_argument("--mask-prompt", default="false")
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def ensure_mlx_lm() -> None:
    try:
        import mlx_lm  # noqa: F401
    except Exception as error:
        raise RuntimeError(
            "mlx-lm is not installed in the selected Python environment; "
            "run `python3 -m pip install 'mlx-lm[train]'` and test again"
        ) from error


def read_manifest(path: Path) -> dict[str, object]:
    with path.open("r", encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise RuntimeError("persona training manifest must be an object")
    return value


def validate_manifest_examples(manifest: dict[str, object]) -> dict[str, dict[str, object]]:
    if manifest.get("schemaVersion") != SUPPORTED_DATASET_SCHEMA:
        raise RuntimeError("persona training dataset schema is unsupported")
    consent = manifest.get("consentSnapshot")
    if not isinstance(consent, dict) or consent.get("granted") is not True:
        raise RuntimeError("persona training dataset consent is not granted")
    examples = manifest.get("examples")
    if not isinstance(examples, list) or not examples:
        raise RuntimeError("persona training dataset has no approved examples")
    if manifest.get("exampleCount") != len(examples):
        raise RuntimeError("persona training dataset example count does not match manifest")

    approved: dict[str, dict[str, object]] = {}
    content_hashes: set[str] = set()
    for example in examples:
        if not isinstance(example, dict):
            raise RuntimeError("persona training manifest example must be an object")
        example_id = str(example.get("id") or "").strip()
        source_kind = str(example.get("sourceKind") or "").strip()
        schema_version = str(example.get("schemaVersion") or "").strip()
        content_hash = str(example.get("contentHash") or "").strip()
        provenance = example.get("provenance")
        behavior_lesson = str(example.get("behaviorLesson") or "").strip()
        positive_example = str(example.get("positiveExample") or "").strip()
        if not example_id or not content_hash:
            raise RuntimeError("persona training manifest example identity is incomplete")
        if example_id in approved or content_hash in content_hashes:
            raise RuntimeError("persona training manifest contains duplicate examples")
        if source_kind not in ALLOWED_SOURCE_KINDS:
            raise RuntimeError(
                f"persona training manifest contains forbidden source kind: {source_kind}"
            )
        if schema_version != SUPPORTED_EXAMPLE_SCHEMA:
            raise RuntimeError(f"persona training example schema is unsupported: {example_id}")
        if (
            not isinstance(provenance, dict)
            or provenance.get("kind") != "working-memory-cleaning"
            or not str(provenance.get("cleaningTransactionId") or "").strip()
        ):
            raise RuntimeError(
                f"persona training example is missing cleaning provenance: {example_id}"
            )
        if not behavior_lesson or not positive_example:
            raise RuntimeError(f"persona training example has no usable text: {example_id}")
        approved[example_id] = example
        content_hashes.add(content_hash)
    return approved


def write_mlx_dataset(
    source_path: Path,
    destination_path: Path,
    approved_examples: dict[str, dict[str, object]],
) -> int:
    count = 0
    seen_ids: set[str] = set()
    with source_path.open("r", encoding="utf-8") as source, destination_path.open(
        "w", encoding="utf-8"
    ) as destination:
        for raw_line in source:
            if not raw_line.strip():
                continue
            row = json.loads(raw_line)
            if not isinstance(row, dict):
                raise RuntimeError("persona training dataset row must be an object")
            row_id = str(row.get("id") or "").strip()
            approved = approved_examples.get(row_id)
            if approved is None:
                raise RuntimeError(
                    f"persona training dataset row is not present in the approved manifest: {row_id}"
                )
            if row_id in seen_ids:
                raise RuntimeError(f"persona training dataset contains duplicate row: {row_id}")
            if (
                row.get("sourceId") != approved.get("sourceId")
                or row.get("sourceKind") != approved.get("sourceKind")
                or row.get("schemaVersion") != approved.get("schemaVersion")
                or row.get("contentHash") != approved.get("contentHash")
                or row.get("provenance") != approved.get("provenance")
            ):
                raise RuntimeError(
                    f"persona training dataset row does not match the approved manifest: {row_id}"
                )
            lesson = str(row.get("behaviorLesson") or "").strip()
            positive = str(row.get("positiveExample") or "").strip()
            if not positive:
                raise RuntimeError("persona training dataset row has no positive example")
            text = "\n".join(part for part in (lesson, positive) if part).strip()
            destination.write(json.dumps({"text": text}, ensure_ascii=False) + "\n")
            seen_ids.add(row_id)
            count += 1
    if count == 0:
        raise RuntimeError("persona training dataset is empty")
    if seen_ids != set(approved_examples):
        raise RuntimeError("persona training dataset does not contain every approved example")
    return count


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run_training(args: argparse.Namespace) -> int:
    if args.backend != "mlx-lm":
        return fail(f"unsupported persona training backend: {args.backend}")
    required = {
        "--manifest": args.manifest,
        "--dataset": args.dataset,
        "--output-dir": args.output_dir,
        "--artifact-manifest": args.artifact_manifest,
        "--base-model": args.base_model,
    }
    missing = [name for name, value in required.items() if not value]
    if missing:
        return fail(f"missing persona training arguments: {', '.join(missing)}")

    try:
        manifest = read_manifest(Path(args.manifest))
        approved_examples = validate_manifest_examples(manifest)
        ensure_mlx_lm()
        output_dir = Path(args.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        data_dir = output_dir / "mlx-data"
        data_dir.mkdir(parents=True, exist_ok=True)
        train_path = data_dir / "train.jsonl"
        example_count = write_mlx_dataset(
            Path(args.dataset),
            train_path,
            approved_examples,
        )
        adapter_dir = output_dir / "adapter"
        if adapter_dir.exists():
            shutil.rmtree(adapter_dir)

        emit({"type": "ready"})
        emit({"type": "progress", "progress": 0.05, "message": f"prepared {example_count} examples"})

        command = [
            sys.executable,
            "-m",
            "mlx_lm.lora",
            "--model",
            str(args.base_model),
            "--train",
            "--data",
            str(data_dir),
            "--iters",
            str(args.iterations),
            "--learning-rate",
            str(args.learning_rate),
            "--lora-layers",
            str(args.lora_layers),
            "--batch-size",
            str(args.batch_size),
            "--max-seq-length",
            str(args.max_seq_length),
            "--adapter-path",
            str(adapter_dir),
            "--seed",
            str(args.seed),
        ]
        if str(args.mask_prompt).lower() == "true":
            command.append("--mask-prompt")

        completed = subprocess.run(
            command,
            check=False,
            stdout=sys.stderr,
            stderr=sys.stderr,
        )
        if completed.returncode != 0:
            return fail(f"mlx-lm training exited with code {completed.returncode}")

        artifact_path = adapter_dir / "adapters.safetensors"
        if not artifact_path.is_file():
            return fail("mlx-lm completed without adapters.safetensors")
        artifact_id = f"mlx-lora-{manifest.get('runId', 'run')}"
        artifact_manifest = {
            "schemaVersion": "alicization-persona-training-artifact-v1",
            "artifactId": artifact_id,
            "runId": manifest.get("runId"),
            "kind": "lora-adapter",
            "path": "adapter/adapters.safetensors",
            "sha256": sha256_file(artifact_path),
            "baseModel": args.base_model,
            "trainingReady": True,
            "dialogueReady": False,
            "compatibilityReason": (
                "MLX safetensors is a training output and cannot be consumed by "
                "the llama.cpp GGUF loader without a real conversion step."
            ),
            "format": "mlx-safetensors",
            "producerBackend": "mlx-lm",
            "loaderTarget": "llama.cpp",
            "conversion": {
                "status": "required",
                "sourceArtifactId": artifact_id,
                "tool": None,
                "version": None,
            },
        }
        with Path(args.artifact_manifest).open("w", encoding="utf-8") as handle:
            json.dump(artifact_manifest, handle, ensure_ascii=False, indent=2)
        emit({"type": "progress", "progress": 1, "message": "MLX LoRA adapter written"})
        emit({"type": "artifact"})
        return 0
    except Exception as error:
        return fail(str(error))


def main() -> int:
    args = parse_args()
    if args.probe:
        try:
            ensure_mlx_lm()
        except RuntimeError as error:
            return fail(str(error))
        emit({"type": "ready"})
        return 0
    return run_training(args)


if __name__ == "__main__":
    raise SystemExit(main())
