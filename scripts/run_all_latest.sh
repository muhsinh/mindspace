#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

CONFIG="config/base.yaml"

echo "[1/3] Running PETRI..."
python -m mindspace.petri_runner --config "$CONFIG"

echo "[2/3] Detecting latest PETRI transcripts..."
latest_transcripts=$(ls -1t artifacts/transcripts_petri_*.jsonl | head -n 1 || true)

if [ -z "$latest_transcripts" ]; then
  echo "ERROR: No artifacts/transcripts_petri_*.jsonl found. Did PETRI actually run?"
  exit 1
fi

echo "Using transcripts file: $latest_transcripts"

echo "[3/3] Running Mindspace debate on latest transcripts..."
python -m mindspace.mindspace_debate --config "$CONFIG" --transcripts "$latest_transcripts"

echo "Done. Check artifacts/ for new reasoning_mindspace_*.jsonl"
